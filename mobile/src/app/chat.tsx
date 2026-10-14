import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { Button, T } from "@/components/ui";
import { ApiError, followUp } from "@/lib/api";
import { toChatContext } from "@/lib/format";
import { detectEmergency } from "@/lib/safety";
import { getDraft, useCurrent } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { AgeGroup } from "@/lib/types";
import { colors, radius, space, urgencyStyle } from "@/theme";

interface Msg {
  role: "user" | "assistant";
  text: string;
  emergency?: boolean;
}

export default function Chat() {
  const { t, fs, settings, history } = useStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const current = useCurrent();
  const response = (id ? history.find((h) => h.id === id)?.response : undefined) ?? current?.response;
  const ageGroup: AgeGroup = (id ? history.find((h) => h.id === id)?.subject.ageGroup : getDraft().subject?.ageGroup) ?? "adult";

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);

  const emergencyLocal = detectEmergency(msgs.filter((m) => m.role === "user").map((m) => m.text), ageGroup);

  const send = async () => {
    const q = input.trim();
    if (!q || busy || !response) return;
    const next: Msg[] = [...msgs, { role: "user", text: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    setError(null);

    const local = detectEmergency([q], ageGroup);
    try {
      const r = await followUp(
        {
          locale: settings.locale,
          ageGroup,
          context: toChatContext(response),
          history: msgs.slice(-10).map((m) => ({ role: m.role, text: m.text })),
          question: q,
        },
        settings.installId,
      );
      setMsgs([...next, { role: "assistant", text: r.answer, emergency: r.emergency || local.emergency }]);
    } catch (e) {
      if (local.emergency) {
        setMsgs([...next, { role: "assistant", text: t("emergencyBody"), emergency: true }]);
      } else {
        setError(e instanceof ApiError && e.kind === "offline" ? t("offlineBody") : t("errorBody"));
      }
    } finally {
      setBusy(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ padding: space.xl, paddingBottom: space.sm, gap: space.sm }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("back")}
            onPress={() => router.back()}
            hitSlop={12}
            style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}
          >
            <T v="h2" color={colors.ink}>‹ {t("back")}</T>
          </Pressable>
          <T v="title" accessibilityRole="header">{t("chatTitle")}</T>
        </View>

        <ScrollView ref={scroller} contentContainerStyle={{ padding: space.xl, paddingTop: space.sm, gap: space.md }} keyboardShouldPersistTaps="handled">
          {emergencyLocal.emergency && <EmergencyBanner reasons={emergencyLocal.reasons} />}
          <T color={colors.inkSoft}>{t("chatIntro")}</T>
          {msgs.map((m, i) => (
            <View
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                backgroundColor: m.role === "user" ? colors.primary : colors.surface,
                borderRadius: radius.lg,
                padding: space.md,
                borderWidth: m.role === "user" ? 0 : 1,
                borderColor: m.emergency ? urgencyStyle.urgent.border : colors.line,
              }}
            >
              <T color={m.role === "user" ? colors.onPrimary : colors.ink}>{m.text}</T>
            </View>
          ))}
          {busy && <T color={colors.inkSoft}>…</T>}
          {error && <T color={colors.danger} accessibilityRole="alert">{error}</T>}
          <T v="small" color={colors.inkSoft}>{t("notDiagnosis")}</T>
        </ScrollView>

        <View style={{ flexDirection: "row", gap: space.sm, padding: space.lg, alignItems: "flex-end" }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t("chatPlaceholder")}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel={t("chatPlaceholder")}
            multiline
            maxLength={1000}
            style={{
              flex: 1,
              minHeight: 56,
              maxHeight: 120,
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: colors.line,
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              fontSize: fs(17),
              color: colors.ink,
            }}
          />
          <View style={{ width: 96 }}>
            <Button label={t("send")} onPress={send} disabled={busy || !input.trim()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
