import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AccessibilityInfo, View } from "react-native";
import { Button, Screen, T } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ApiError, analyze, type ApiErrorKind, type PreviousPayload } from "@/lib/api";
import { readPhotoBase64 } from "@/lib/photos";
import { newId } from "@/lib/format";
import { detectEmergency, emergencyFallback, enforceFloor } from "@/lib/safety";
import { getDraft, setCurrent } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { AnalysisResponse } from "@/lib/types";
import { colors, space } from "@/theme";

const STEP_MS = 1400;

export default function Processing() {
  const { t, settings, savesHistory, addHistory, history, updateHistory } = useStore();
  const [error, setError] = useState<ApiErrorKind | null>(null);
  const [step, setStep] = useState(0);
  const [osReduce, setOsReduce] = useState(false);
  const runId = useRef(0);
  const reduce = settings.reduceMotion || osReduce;
  const hasImage = !!getDraft().attachment;
  const isReport = getDraft().mode === "report";

  const steps = [
    ...(hasImage ? [t("step1")] : []),
    t("step2"),
    t("step3"),
    t("step4"),
  ];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOsReduce).catch(() => {});
  }, []);

  useEffect(() => {
    if (error || reduce) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [error, reduce, steps.length]);

  const start = useCallback(async () => {
    const my = ++runId.current;
    const draft = getDraft();
    if (!draft.subject) return router.replace("/");

    const local = detectEmergency(
      [draft.description, ...draft.answers.map((a) => a.answer)],
      draft.subject.ageGroup,
    );

    // Re-check: compare against an earlier saved analysis (and its photo, if the user kept it on this device).
    const prevEntry = draft.previousEntryId ? history.find((h) => h.id === draft.previousEntryId) : undefined;
    let previous: PreviousPayload | undefined;
    if (prevEntry) {
      const b64 = prevEntry.photoUri ? await readPhotoBase64(prevEntry.photoUri) : null;
      previous = {
        daysAgo: Math.max(0, Math.floor((Date.now() - prevEntry.createdAt) / 86_400_000)),
        urgency: prevEntry.response.analysis.urgency,
        summary: prevEntry.response.analysis.summary.slice(0, 600),
        observations: prevEntry.response.analysis.observations.slice(0, 8).map((o) => o.slice(0, 300)),
        image: b64 ? { mediaType: "image/jpeg", data: b64 } : undefined,
      };
    }

    let response: AnalysisResponse;
    try {
      response = await analyze(draft, settings.locale, settings.installId, previous);
    } catch (e) {
      if (my !== runId.current) return;
      if (e instanceof ApiError && e.kind === "subscription" && !local.emergency) {
        router.replace("/paywall?next=processing");
        return;
      }
      if (local.emergency) {
        // Safety guidance must not depend on the network or the AI.
        response = { analysis: emergencyFallback(local), emergency: true, emergencyReasons: local.reasons };
      } else {
        setError(e instanceof ApiError ? e.kind : "failed");
        return;
      }
    }
    if (my !== runId.current) return;

    // Defense in depth: the app enforces the same floor the server does.
    response = {
      ...response,
      analysis: enforceFloor(response.analysis, local),
      emergency: response.emergency || local.emergency,
      emergencyReasons: [...new Set([...response.emergencyReasons, ...local.reasons])],
    };

    let savedId: string | undefined;
    if (savesHistory) {
      savedId = newId();
      const trackId = prevEntry ? (prevEntry.trackId ?? prevEntry.id) : undefined;
      if (prevEntry && !prevEntry.trackId) updateHistory(prevEntry.id, { trackId });
      addHistory({
        id: savedId,
        trackId,
        locale: settings.locale,
        createdAt: Date.now(),
        mode: draft.mode,
        subject: draft.subject,
        description: draft.description,
        response,
      });
    }
    setCurrent({ response, saved: !!savedId, savedId, locale: settings.locale });
    router.dismissAll();
    router.push("/result");
  }, [settings.locale, settings.installId, savesHistory, addHistory, history, updateHistory]);

  const retry = () => {
    setError(null);
    setStep(0);
    start();
  };

  useEffect(() => {
    // start() only sets state after awaited work (network/storage), never synchronously inside this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start();
    return () => {
      // Intentional: invalidates any in-flight request so a stale result is ignored after leaving this screen.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      runId.current++;
    };
  }, [start]);

  if (error) {
    const copy =
      error === "offline"
        ? { h: t("offlineTitle"), b: `${t("offlineBody")}\n\n${t("offlineHistory")}` }
        : error === "unsafe"
          ? { h: t("unsafeTitle"), b: t("unsafeBody") }
          : error === "rate_limited"
            ? { h: t("errorTitle"), b: t("rateLimitedBody") }
            : { h: t("errorTitle"), b: t("errorBody") };
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, justifyContent: "center", gap: space.lg }}>
          <View style={{ alignSelf: "center", width: 88, height: 88, borderRadius: 28, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name={error === "offline" ? "cloud-offline-outline" : "alert-circle-outline"} size={42} color={colors.brandText} />
          </View>
          <T v="title" style={{ textAlign: "center" }} accessibilityRole="header">{copy.h}</T>
          <T color={colors.inkSoft} style={{ textAlign: "center" }}>{copy.b}</T>
          <Button label={t("tryAgain")} onPress={retry} />
          <Button kind="secondary" label={t("back")} onPress={() => router.back()} />
          {error === "offline" && (
            <Button kind="ghost" label={t("tabHistory")} onPress={() => { router.dismissAll(); router.navigate("/history"); }} />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: "center", gap: space.xl }} accessibilityLiveRegion="polite">
        {reduce ? null : <ActivityIndicator size="large" color={colors.brand} />}
        <T v="title" style={{ textAlign: "center" }} accessibilityRole="header">
          {isReport ? t("processingReport") : t("processingTitle")}
        </T>
        <View style={{ gap: space.md, alignSelf: "center" }}>
          {steps.map((s, i) => {
            const done = reduce ? false : i < step;
            const active = reduce ? true : i === step;
            return (
              <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <Icon
                  name={done ? "checkmark-circle" : active ? "ellipse" : "ellipse-outline"}
                  size={20}
                  color={done ? colors.teal : active ? colors.brandText : colors.inkSoft}
                />
                <T color={done ? colors.teal : active ? colors.ink : colors.inkSoft} style={{ fontFamily: active ? "DMSans_700Bold" : "DMSans_400Regular" }}>
                  {s}
                </T>
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
