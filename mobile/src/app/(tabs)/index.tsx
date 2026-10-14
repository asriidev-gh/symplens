import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { HistoryRow } from "@/components/HistoryRow";
import { LanguageSheet } from "@/components/LanguageSheet";
import { ScanHero } from "@/components/ScanHero";
import { ThemeLogo } from "@/components/ThemeLogo";
import { Button, Card, IconLine, Screen, T } from "@/components/ui";
import { startFlow } from "@/lib/flow";
import { useStore } from "@/lib/store";
import { colors, softShadow, space } from "@/theme";
import { Icon, type IconName } from "@/components/Icon";

function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const styles = makeStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.iconBtn, softShadow]}
    >
      <Icon name={icon} size={22} />
    </Pressable>
  );
}

export default function Home() {
  const { t, history, settings } = useStore();
  const [langOpen, setLangOpen] = useState(false);
  const styles = makeStyles();
  const showRecent = settings.historyEnabled && !settings.privateMode;
  return (
    <Screen tabs>
      <View style={styles.topRow}>
        <ThemeLogo size={44} withName />
        <IconButton
          icon="language-outline"
          label={t("sLanguage")}
          onPress={() => setLangOpen(true)}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <T v="display" accessibilityRole="header">{t("homeHeadline")}</T>
        <T color={colors.inkSoft}>{t("homeSub")}</T>
      </View>

      <ScanHero />

      <View style={{ gap: space.md }}>
        <Button icon="camera-outline" label={t("analyzeSymptom")} onPress={() => startFlow("symptom")} />
        <Button kind="secondary" icon="chatbubble-ellipses-outline" label={t("describeSymptom")} onPress={() => startFlow("symptom", true)} />
        <Button kind="secondary" icon="document-text-outline" label={t("analyzeReport")} onPress={() => startFlow("report")} />
      </View>

      <Card style={{ backgroundColor: colors.tealSoft, borderColor: colors.tealBorder }}>
        <IconLine icon="lock-closed" v="label" color={colors.tealText}>{t("privateByDesign")}</IconLine>
        <T v="small" color={colors.tealText}>{t("privateByDesignBody")}</T>
      </Card>

      {showRecent && (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T v="h2" accessibilityRole="header">{t("recent")}</T>
            {history.length > 3 && (
              <Pressable onPress={() => router.navigate("/history")} accessibilityRole="button" hitSlop={10}>
                <T v="small" color={colors.brandText}>{t("tabHistory")} ›</T>
              </Pressable>
            )}
          </View>
          {history.length === 0 ? (
            <T color={colors.inkSoft}>{t("noRecent")}</T>
          ) : (
            history.slice(0, 3).map((e) => <HistoryRow key={e.id} entry={e} />)
          )}
        </View>
      )}
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
    </Screen>
  );
}

const makeStyles = () =>
  StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  });
