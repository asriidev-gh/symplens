import React from "react";
import { Card, IconHeading, Screen, T } from "@/components/ui";
import type { IconName } from "@/components/Icon";
import { useStore } from "@/lib/store";
import { colors } from "@/theme";

export default function Safety() {
  const { t } = useStore();
  const blocks = [
    { i: "lock-closed-outline" as IconName, h: t("sPrivacy"), b: t("privacyExplain") },
    { i: "compass-outline" as IconName, h: t("limitations"), b: t("limitationsBody") },
    { i: "medkit-outline" as IconName, h: t("disclaimer"), b: t("disclaimerBody") },
    { i: "information-circle-outline" as IconName, h: t("aboutApp"), b: t("aboutBody") },
    { i: "document-text-outline" as IconName, h: t("terms"), b: t("termsBody") },
  ];
  return (
    <Screen tabs>
      <T v="title" accessibilityRole="header">{t("tabSafety")}</T>
      <T color={colors.inkSoft}>{t("tagline")}</T>
      {blocks.map((x) => (
        <Card key={x.h}>
          <IconHeading icon={x.i}>{x.h}</IconHeading>
          <T color={colors.inkSoft}>{x.b}</T>
        </Card>
      ))}
    </Screen>
  );
}
