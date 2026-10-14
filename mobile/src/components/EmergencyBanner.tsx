import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { translate } from "@/i18n";
import { useStore } from "@/lib/store";
import type { Locale } from "@/lib/types";
import { colors, radius, space } from "@/theme";
import { Button, IconHeading, T } from "./ui";

/** Shown above everything else. Never gated by account, subscription, or network. */
export function EmergencyBanner({ reasons, showKeepGoing, locale }: { reasons: string[]; showKeepGoing?: boolean; locale?: Locale }) {
  const store = useStore();
  const t = locale ? (k: Parameters<typeof store.t>[0]) => translate(locale, k) : store.t;
  const styles = makeStyles();
  return (
    <View style={styles.box} accessibilityRole="alert" accessible>
      <IconHeading icon="warning" color="#fff">{t("emergencyTitle")}</IconHeading>
      <T color="#fff">{t("emergencyBody")}</T>
      {reasons.length > 0 && (
        <T v="small" color="#fff">
          {t("emergencyReasonsLabel")} {reasons.join(", ")}
        </T>
      )}
      <Button kind="secondary" label={t("openDialer")} icon="call-outline" onPress={() => Linking.openURL("tel:")} />
      {showKeepGoing ? <T v="small" color="#fff">{t("emergencyKeepGoing")}</T> : null}
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
  box: { backgroundColor: colors.danger, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  });
