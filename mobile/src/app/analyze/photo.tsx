import { router } from "expo-router";
import React, { useState } from "react";
import { Image, View } from "react-native";
import { Button, Card, IconLine, Screen, T } from "@/components/ui";
import { choosePdf, choosePhoto, takePhoto, type PickResult } from "@/lib/photo";
import { discardAttachment, setDraft, useDraft } from "@/lib/session";
import { useStore } from "@/lib/store";
import { colors, radius, space, urgencyStyle } from "@/theme";

export default function PhotoScreen() {
  const { t } = useStore();
  const draft = useDraft();
  const isReport = draft.mode === "report";
  const att = draft.attachment;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const run = async (fn: () => Promise<PickResult>) => {
    setBusy(true);
    setProblem(null);
    const r = await fn();
    setBusy(false);
    if (r.ok) {
      discardAttachment();
      setDraft({ attachment: r.attachment });
    } else if (r.reason === "permission") setProblem(t("photoPermission"));
    else if (r.reason !== "cancelled") setProblem(t("errorBody"));
  };

  const warning =
    att?.quality === "blurry_or_dark" ? t("photoBlurry") : att?.quality === "low_resolution" ? t("photoLowRes") : null;

  const footer = (
    <>
      <Button label={t("continue")} disabled={!att || busy} onPress={() => router.push("/analyze/describe")} />
      {!isReport && !att && (
        <Button kind="ghost" label={t("continueNoPhoto")} onPress={() => router.push("/analyze/describe")} />
      )}
    </>
  );

  return (
    <Screen back footer={footer}>
      <T v="title" accessibilityRole="header">{isReport ? t("reportTitle") : t("photoTitle")}</T>

      {att?.previewUri ? (
        <Image
          source={{ uri: att.previewUri }}
          accessibilityLabel={t("photoPreview")}
          style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.line }}
          resizeMode="cover"
        />
      ) : att ? (
        <Card><IconLine icon="document-text-outline" v="label" color={colors.ink}>PDF</IconLine></Card>
      ) : (
        <Card>
          {isReport ? (
            <T color={colors.inkSoft}>{t("reportHint")}</T>
          ) : (
            [t("photoTip1"), t("photoTip2"), t("photoTip3")].map((tip) => (
              <T key={tip} color={colors.inkSoft}>• {tip}</T>
            ))
          )}
        </Card>
      )}

      {warning && (
        <Card style={{ backgroundColor: urgencyStyle.needs_attention.bg, borderColor: urgencyStyle.needs_attention.border }} accessibilityRole="alert">
          <T color={urgencyStyle.needs_attention.fg}>{warning}</T>
        </Card>
      )}
      {problem && <T color={colors.danger} accessibilityRole="alert">{problem}</T>}

      <View style={{ gap: space.md }}>
        <Button icon="camera-outline" label={att ? t("retake") : t("takePhoto")} disabled={busy} onPress={() => run(takePhoto)} kind={att ? "secondary" : "primary"} />
        <Button kind="secondary" icon="images-outline" label={t("choosePhoto")} disabled={busy} onPress={() => run(choosePhoto)} />
        {isReport && <Button kind="secondary" icon="document-text-outline" label={t("choosePdf")} disabled={busy} onPress={() => run(choosePdf)} />}
      </View>
      <IconLine icon="lock-closed-outline">{t("photoNotSent")}</IconLine>
    </Screen>
  );
}
