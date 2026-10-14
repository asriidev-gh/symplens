import React from "react";
import { Card, Screen, T } from "@/components/ui";
import { useStore } from "@/lib/store";
import { colors } from "@/theme";

export default function About() {
  const { t } = useStore();
  const blocks = [
    { h: t("aboutApp"), b: t("aboutBody") },
    { h: t("sPrivacy"), b: t("privacyExplain") },
    { h: t("limitations"), b: t("limitationsBody") },
    { h: t("disclaimer"), b: t("disclaimerBody") },
    { h: t("terms"), b: t("termsBody") },
  ];
  return (
    <Screen back>
      <T v="title" accessibilityRole="header">{t("appName")}</T>
      <T color={colors.inkSoft}>{t("descriptor")} · {t("tagline")}</T>
      {blocks.map((x) => (
        <Card key={x.h}>
          <T v="h2" accessibilityRole="header">{x.h}</T>
          <T color={colors.inkSoft}>{x.b}</T>
        </Card>
      ))}
    </Screen>
  );
}
