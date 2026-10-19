import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { Button, Screen, T } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { LogoArt } from "@/components/ThemeLogo";
import { ApiError, analyze, type ApiErrorKind, type PreviousPayload } from "@/lib/api";
import { readPhotoBase64 } from "@/lib/photos";
import { newId } from "@/lib/format";
import { detectEmergency, emergencyFallback, enforceFloor } from "@/lib/safety";
import { getDraft, setCurrent } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { AnalysisResponse } from "@/lib/types";
import { colors, space } from "@/theme";

const STEP_MS = 1400;
const STAGE = 232;
const CORE = 112;

/** One expanding, fading ring. Three of them, staggered, read as a calm pulse radiating from the logo. */
function Ring({ delay }: { delay: number }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 2700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const opacity = v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.38, 0] });
  return (
    <Animated.View
      style={{ position: "absolute", width: STAGE, height: STAGE, borderRadius: STAGE / 2, backgroundColor: colors.brand, opacity, transform: [{ scale }] }}
    />
  );
}

/** Pulsing ovals fading out behind a gently breathing logo. Static (single soft halo) under reduce-motion. */
function PulseLogo({ reduce }: { reduce: boolean }) {
  const [b] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(b, { toValue: 1, duration: 1350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(b, { toValue: 0, duration: 1350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, b]);
  const breathe = b.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  return (
    <View style={{ width: STAGE, height: STAGE, alignItems: "center", justifyContent: "center", alignSelf: "center" }} aria-hidden>
      {reduce ? (
        <View style={{ position: "absolute", width: STAGE * 0.78, height: STAGE * 0.78, borderRadius: STAGE, backgroundColor: colors.brand, opacity: 0.14 }} />
      ) : (
        <>
          <Ring delay={0} />
          <Ring delay={900} />
          <Ring delay={1800} />
        </>
      )}
      <Animated.View style={{ width: CORE, height: CORE, borderRadius: CORE * 0.28, overflow: "hidden", transform: [{ scale: reduce ? 1 : breathe }] }}>
        <LogoArt size={CORE} />
      </Animated.View>
    </View>
  );
}

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
            : error === "monthly_limit"
              ? { h: t("errorTitle"), b: t("monthlyLimitBody") }
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
        <PulseLogo reduce={reduce} />
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
