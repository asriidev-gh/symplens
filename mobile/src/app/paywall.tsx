import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Button, Card, IconLine, Screen, T } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useStore } from "@/lib/store";
import { useSubscription } from "@/lib/subscription";
import { colors, space } from "@/theme";

/** Shown when someone taps Analyze without a subscription. One plan: yearly, billed up front, no free trial. */
export default function Paywall() {
  const { t } = useStore();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { status, price, purchase, restore } = useSubscription();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const done = () => (next === "processing" ? router.replace("/processing") : router.back());
  const fill = (s: string) => s.replace("{price}", price);

  const onBuy = async () => {
    setBusy(true);
    const r = await purchase();
    setBusy(false);
    if (r === "ok") return done();
    if (r === "error") toast.show({ message: t("paywallError"), kind: "error" });
  };
  const onRestore = async () => {
    setBusy(true);
    const ok = await restore();
    setBusy(false);
    if (ok) return done();
    toast.show({ message: t("paywallNothing"), kind: "info" });
  };

  const canBuy = status !== "unavailable" && status !== "loading";

  return (
    <Screen
      back
      footer={
        <>
          <Button label={fill(t("paywallCta"))} onPress={onBuy} disabled={busy || !canBuy} />
          <T v="small" color={colors.inkSoft} style={{ textAlign: "center" }}>{fill(t("paywallTerms"))}</T>
          {status === "unavailable" && <T v="small" color={colors.inkSoft} style={{ textAlign: "center" }}>{t("paywallUnavailable")}</T>}
          <Button label={t("paywallRestore")} kind="ghost" onPress={onRestore} disabled={busy || status === "unavailable"} />
          <Button label={t("paywallNotNow")} kind="ghost" onPress={() => router.back()} />
        </>
      }
    >
      <T v="title" accessibilityRole="header">{t("paywallTitle")}</T>
      <T color={colors.inkSoft}>{t("paywallSub")}</T>
      <Card>
        <View style={{ gap: space.sm }}>
          <IconLine icon="scan-outline" color={colors.ink} v="body">{t("paywallB1")}</IconLine>
          <IconLine icon="language-outline" color={colors.ink} v="body">{t("paywallB2")}</IconLine>
          <IconLine icon="trending-up-outline" color={colors.ink} v="body">{t("paywallB3")}</IconLine>
          <IconLine icon="lock-closed-outline" color={colors.ink} v="body">{t("paywallB4")}</IconLine>
        </View>
      </Card>
      <Card>
        <T v="h2">{fill(t("paywallPrice"))}</T>
        <T color={colors.inkSoft}>{t("paywallEmergency")}</T>
      </Card>
    </Screen>
  );
}
