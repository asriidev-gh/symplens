import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Button, Chip, Gap, Screen, T } from "@/components/ui";
import type { TKey } from "@/i18n";
import { setDraft } from "@/lib/session";
import { useStore } from "@/lib/store";
import { AGE_GROUPS, RELATIONS, type AgeGroup, type Relation } from "@/lib/types";
import { colors, space } from "@/theme";

const DEFAULT_AGE: Record<Relation, AgeGroup> = {
  me: "adult",
  baby: "infant",
  child: "child",
  teen: "teen",
  partner: "adult",
  parent: "older_adult",
  other: "adult",
};

export default function Who() {
  const { t } = useStore();
  const { textOnly } = useLocalSearchParams<{ textOnly?: string }>();
  const [relation, setRelation] = useState<Relation | null>(null);
  const [age, setAge] = useState<AgeGroup>("adult");

  const pick = (r: Relation) => {
    setRelation(r);
    setAge(DEFAULT_AGE[r]);
  };

  const next = () => {
    if (!relation) return;
    setDraft({ subject: { relation, ageGroup: age } });
    router.push(textOnly ? "/analyze/describe" : "/analyze/photo");
  };

  return (
    <Screen back footer={<Button label={t("continue")} disabled={!relation} onPress={next} />}>
      <T v="title" accessibilityRole="header">{t("whoTitle")}</T>
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        {RELATIONS.map((r) => (
          <Chip key={r} label={t(`rel_${r}` as TKey)} selected={relation === r} onPress={() => pick(r)} />
        ))}
      </View>

      {relation && (
        <View style={{ gap: space.sm }}>
          <Gap h={space.sm} />
          <T v="h2" accessibilityRole="header">{t("ageTitle")}</T>
          <T v="small" color={colors.inkSoft}>{t("ageHint")}</T>
          <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
            {AGE_GROUPS.map((a) => (
              <Chip
                key={a}
                label={t(`age_${a}` as TKey)}
                sub={t(`ageRange_${a}` as TKey)}
                selected={age === a}
                onPress={() => setAge(a)}
              />
            ))}
          </View>
        </View>
      )}
    </Screen>
  );
}
