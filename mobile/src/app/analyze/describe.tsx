import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { Button, Chip, Gap, Screen, T } from "@/components/ui";
import type { TKey } from "@/i18n";
import { detectEmergency } from "@/lib/safety";
import { setDraft, useDraft } from "@/lib/session";
import { startDictation } from "@/lib/speech";
import { useStore } from "@/lib/store";
import { useSubscription } from "@/lib/subscription";
import { DURATIONS } from "@/lib/types";
import { colors, radius, space } from "@/theme";

export default function Describe() {
  const { t, fs, settings } = useStore();
  const draft = useDraft();
  const [text, setText] = useState(draft.description);
  const [listening, setListening] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const baseRef = useRef("");
  const isReport = draft.mode === "report";

  useEffect(() => () => stopRef.current?.(), []);

  // Runs on-device on every keystroke: emergency guidance never waits for the network.
  const safety = useMemo(
    () => detectEmergency([text], draft.subject?.ageGroup ?? "adult"),
    [text, draft.subject?.ageGroup],
  );

  const sub = useSubscription();
  const canAnalyze = text.trim().length > 0 || !!draft.attachment;

  const toggleVoice = async () => {
    if (listening) {
      stopRef.current?.();
      return;
    }
    setVoiceMsg(null);
    baseRef.current = text ? `${text.trim()} ` : "";
    const stop = await startDictation(
      settings.locale,
      (spoken) => setText(baseRef.current + spoken),
      () => setListening(false),
    );
    if (!stop) {
      setVoiceMsg(t("voiceUnavailable"));
      return;
    }
    stopRef.current = stop;
    setListening(true);
  };

  const analyze = () => {
    setDraft({ description: text.trim(), answers: [] });
    // Emergency guidance is always free; everything else needs the yearly plan (the server enforces this too).
    if (sub.status === "inactive" && !safety.emergency) router.push("/paywall?next=processing");
    else router.push("/processing");
  };

  return (
    <Screen
      back
      footer={
        <>
          {!canAnalyze && <T v="small" color={colors.inkSoft} style={{ textAlign: "center" }}>{t("needSomething")}</T>}
          <Button label={t("analyzeBtn")} disabled={!canAnalyze} onPress={analyze} />
        </>
      }
    >
      {safety.emergency && <EmergencyBanner reasons={safety.reasons} showKeepGoing />}

      <T v="title" accessibilityRole="header">{t("describeTitle")}</T>
      <T color={colors.inkSoft}>{t("describeHint")}</T>

      <TextInput
        value={text}
        onChangeText={(v) => {
          setText(v);
          setDraft({ description: v });
        }}
        placeholder={t("describePlaceholder")}
        placeholderTextColor={colors.placeholder}
        multiline
        maxLength={2000}
        textAlignVertical="top"
        accessibilityLabel={t("describeTitle")}
        style={{
          minHeight: 130,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: listening ? colors.brand : colors.line,
          padding: space.lg,
          fontSize: fs(17),
          color: colors.ink,
        }}
      />
      <Button
        kind="secondary"
        icon={listening ? "stop-circle-outline" : "mic-outline"}
        label={listening ? t("voiceStop") : t("voiceStart")}
        onPress={toggleVoice}
      />
      {voiceMsg && <T v="small" color={colors.inkSoft}>{voiceMsg}</T>}

      {!isReport && (
        <View style={{ gap: space.sm }}>
          <Gap h={space.sm} />
          <T v="h2" accessibilityRole="header">{t("durationTitle")}</T>
          <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
            {DURATIONS.map((d) => (
              <Chip
                key={d}
                label={t(`dur_${d}` as TKey)}
                selected={draft.duration === d}
                onPress={() => setDraft({ duration: draft.duration === d ? undefined : d })}
              />
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}
