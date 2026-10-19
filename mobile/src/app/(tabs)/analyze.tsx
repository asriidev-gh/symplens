import React from "react";
import { Button, Screen, T } from "@/components/ui";
import { startFlow } from "@/lib/flow";
import { useStore } from "@/lib/store";
import { colors, space } from "@/theme";
import { View } from "react-native";

export default function AnalyzeTab() {
  const { t } = useStore();
  return (
    <Screen tabs>
      <T v="title" accessibilityRole="header">{t("homeHeadline")}</T>
      <T color={colors.inkSoft}>{t("homeSub")}</T>
      <View style={{ gap: space.md }}>
        <Button icon="camera-outline" label={t("analyzeSymptom")} onPress={() => startFlow("symptom")} />
        <Button kind="secondary" icon="chatbubble-ellipses-outline" label={t("describeSymptom")} onPress={() => startFlow("symptom", true)} />
      </View>
    </Screen>
  );
}
