import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/Icon";
import { ConfirmSheet } from "@/components/BottomSheet";
import { useToast } from "@/components/Toast";
import { Button, Card, Chip, Screen, T, ToggleRow } from "@/components/ui";
import { LANGUAGES, type TKey } from "@/i18n";
import { LanguageSheet } from "@/components/LanguageSheet";
import { useStore } from "@/lib/store";
import { THEME_IDS, colors, radius, space, themes, type ThemePref } from "@/theme";

const SIZES = [
  { label: "A", scale: 1 },
  { label: "A+", scale: 1.15 },
  { label: "A++", scale: 1.3 },
  { label: "A+++", scale: 1.5 },
];

export default function Settings() {
  const { t, settings, update, deleteAllData } = useStore();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  return (
    <Screen tabs>
      <T v="title" accessibilityRole="header">{t("tabSettings")}</T>

      <Section title={t("sTheme")}>
        <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
          {(["auto", ...THEME_IDS] as ThemePref[]).map((id) => (
            <ThemeOption
              key={id}
              id={id}
              name={t(`theme_${id}` as TKey)}
              desc={t(`themeDesc_${id}` as TKey)}
              selected={settings.theme === id}
              onPress={() => update({ theme: id })}
            />
          ))}
        </View>
      </Section>

      <Section title={t("sPrivacy")}>
        <ToggleRow
          label={t("privateMode")}
          desc={t("privateModeDesc")}
          value={settings.privateMode}
          onChange={(v) => update({ privateMode: v })}
        />
        <ToggleRow
          label={t("localHistory")}
          desc={t("localHistoryDesc")}
          value={settings.historyEnabled}
          onChange={(v) => update({ historyEnabled: v })}
        />
        <T v="small" color={colors.inkSoft}>{t("privacyExplain")}</T>
        <Button kind="danger" label={t("deleteAllData")} onPress={() => setConfirming(true)} accessibilityHint={t("deleteAllDataDesc")} />
      </Section>

      <Section title={t("sAccess")}>
        <T v="label">{t("textSize")}</T>
        <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
          {SIZES.map((s) => (
            <View key={s.label} style={{ minWidth: 76 }}>
              <Chip label={s.label} selected={settings.textScale === s.scale} onPress={() => update({ textScale: s.scale })} />
            </View>
          ))}
        </View>
        <ToggleRow label={t("voicePlayback")} value={settings.voicePlayback} onChange={(v) => update({ voicePlayback: v })} />
        <ToggleRow label={t("reduceMotion")} value={settings.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
      </Section>

      <Section title={t("sLanguage")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t("sLanguage")}: ${LANGUAGES.find((l) => l.code === settings.locale)?.label ?? ""}`}
          onPress={() => setLangOpen(true)}
          style={{ minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <T v="label">{LANGUAGES.find((l) => l.code === settings.locale)?.label}</T>
          <Icon name="chevron-forward" size={20} color={colors.inkSoft} />
        </Pressable>
      </Section>

      <Section title={t("sAccount")}>
        <T color={colors.inkSoft}>{t("accountDesc")}</T>
      </Section>

      <Section title={t("sAbout")}>
        <Button kind="secondary" icon="information-circle-outline" label={t("aboutApp")} onPress={() => router.push("/about")} />
        <Button kind="secondary" icon="play-circle-outline" label={t("replayIntro")} onPress={() => update({ onboarded: false })} />
        <T v="small" color={colors.inkSoft}>{t("tagline")}</T>
      </Section>
      <LanguageSheet visible={langOpen} onClose={() => setLangOpen(false)} />
      <ConfirmSheet
        visible={confirming}
        title={t("deleteAllData")}
        message={t("deleteAllDataConfirm")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          await deleteAllData();
          toast.show({ message: t("deleted"), kind: "success" });
        }}
      />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <T v="h2" accessibilityRole="header">{title}</T>
      <Card>{children}</Card>
    </View>
  );
}

/** Shows each theme in its own colors (read from the palette, not the active theme). */
function ThemeOption({ id, name, desc, selected, onPress }: { id: ThemePref; name: string; desc: string; selected: boolean; onPress: () => void }) {
  const isAuto = id === "auto";
  const p = themes[isAuto ? "tech" : id];
  const q = themes.dark;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}. ${desc}`}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        minHeight: 72,
        padding: space.md,
        borderRadius: radius.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.selected : colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          width: 64,
          height: 48,
          borderRadius: radius.sm,
          backgroundColor: p.bg,
          borderWidth: 1,
          borderColor: p.line,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
        }}
        aria-hidden
      >
        {isAuto ? (
          <>
            <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", backgroundColor: q.bg }} />
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p.primary }} />
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: q.brand }} />
          </>
        ) : (
          <>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p.primary }} />
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p.brand }} />
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line }} />
          </>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <T v="label">{name}</T>
        <T v="small" color={colors.inkSoft}>{desc}</T>
      </View>
      {selected ? <Icon name="checkmark-circle" size={24} color={colors.selected} /> : null}
    </Pressable>
  );
}
