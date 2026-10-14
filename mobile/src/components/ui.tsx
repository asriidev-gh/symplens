import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/lib/store";
import { Icon, type IconName } from "./Icon";
import type { Urgency } from "@/lib/types";
import { MIN_TOUCH, colors, fonts, radius, shadow, softShadow, space, urgencyStyle } from "@/theme";

type Variant = "display" | "title" | "h2" | "body" | "small" | "label";
const sizes: Record<Variant, { size: number; weight: TextStyle["fontWeight"]; lh: number }> = {
  display: { size: 34, weight: "800", lh: 40 },
  title: { size: 26, weight: "800", lh: 32 },
  h2: { size: 19, weight: "700", lh: 25 },
  body: { size: 17, weight: "400", lh: 25 },
  small: { size: 14, weight: "400", lh: 20 },
  label: { size: 16, weight: "600", lh: 22 },
};

export function T({
  v = "body",
  color = colors.ink,
  style,
  children,
  ...rest
}: {
  v?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
} & React.ComponentProps<typeof Text>) {
  const { fs } = useStore();
  const s = sizes[v];
  const family = s.weight === "800" || s.weight === "700" ? fonts.bold : s.weight === "600" ? fonts.medium : fonts.regular;
  return (
    <Text
      {...rest}
      style={[{ fontFamily: family, fontSize: fs(s.size), lineHeight: fs(s.lh), color }, style]}
    >
      {children}
    </Text>
  );
}

export function Screen({
  children,
  scroll = true,
  footer,
  back = false,
  onBack,
  title,
  edges,
  tabs = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
  title?: string;
  edges?: ("top" | "bottom")[];
  /** true on tab screens: leaves room for the floating tab bar */
  tabs?: boolean;
}) {
  const { t } = useStore();
  const styles = makeStyles();
  const body = (
    <>
      {(back || title) && (
        <View style={styles.header}>
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("back")}
              onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
              hitSlop={12}
              style={styles.backBtn}
            >
              <T v="h2" color={colors.ink}>‹ {t("back")}</T>
            </Pressable>
          )}
          {title ? <T v="h2" accessibilityRole="header">{title}</T> : null}
        </View>
      )}
      {children}
    </>
  );
  return (
    <SafeAreaView style={styles.screen} edges={edges ?? ["top"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, tabs && { paddingBottom: TAB_BAR_SPACE }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={styles.content}>{body}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
  icon,
  trailingIcon,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "accent" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  icon?: IconName;
  trailingIcon?: IconName;
  accessibilityHint?: string;
}) {
  const styles = makeStyles();
  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    accent: { bg: colors.brand, fg: colors.onBrand, border: colors.brand },
    secondary: { bg: colors.secondary, fg: colors.onSecondary, border: colors.secondaryBorder },
    ghost: { bg: "transparent", fg: colors.brandText, border: "transparent" },
    danger: { bg: colors.danger, fg: "#fff", border: colors.danger },
  }[kind];
  const gradient = kind === "primary" ? colors.primaryGradient : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        (kind === "primary" || kind === "accent") && shadow,
        kind === "secondary" && softShadow,
        gradient && { overflow: "hidden", borderColor: "transparent" },
      ]}
    >
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm }}>
        {icon ? <Icon name={icon} size={20} color={palette.fg} /> : null}
        <T v="label" color={palette.fg} style={{ textAlign: "center", flexShrink: 1 }}>{label}</T>
        {trailingIcon ? <Icon name={trailingIcon} size={20} color={palette.fg} /> : null}
      </View>
    </Pressable>
  );
}

export function Card({ children, style, ...rest }: { children: React.ReactNode; style?: StyleProp<ViewStyle> } & React.ComponentProps<typeof View>) {
  const styles = makeStyles();
  return (
    <View {...rest} style={[styles.card, softShadow, style]}>
      {children}
    </View>
  );
}

export function Chip({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = makeStyles();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}
    >
      <T v="label" color={colors.ink}>{label}</T>
      {sub ? <T v="small" color={colors.inkSoft}>{sub}</T> : null}
    </Pressable>
  );
}

export function UrgencyBadge({ urgency, label, desc, large }: { urgency: Urgency; label: string; desc: string; large?: boolean }) {
  const styles = makeStyles();
  const s = urgencyStyle[urgency];
  return (
    <View
      accessible
      accessibilityLabel={`${label}. ${desc}`}
      style={[styles.urgency, { backgroundColor: s.bg, borderColor: s.border }, large && { padding: space.lg }]}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Icon name={urgency === "low" ? "checkmark-circle" : urgency === "urgent" ? "alert-circle" : "warning"} size={large ? 24 : 20} color={s.fg} />
          <T v={large ? "h2" : "label"} color={s.fg}>{label}</T>
        </View>
        <T v="small" color={s.fg}>{desc}</T>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }} accessibilityElementsHidden>
          {[1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: large ? 12 : 8,
                borderRadius: 6,
                backgroundColor: i <= s.level ? s.fill : colors.track,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const styles = makeStyles();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <T v="label">{label}</T>
        {desc ? <T v="small" color={colors.inkSoft}>{desc}</T> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.selected, false: colors.track }}
      />
    </View>
  );
}

/** Section heading with a leading icon. */
export function IconHeading({ icon, children, color = colors.ink }: { icon: IconName; children: React.ReactNode; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <Icon name={icon} size={22} color={color === colors.ink ? colors.brandText : color} />
      <T v="h2" color={color} accessibilityRole="header" style={{ flexShrink: 1 }}>{children}</T>
    </View>
  );
}

/** Small supporting line with a leading icon (e.g. privacy notes). */
export function IconLine({ icon, children, color = colors.inkSoft, v = "small" }: { icon: IconName; children: React.ReactNode; color?: string; v?: "small" | "label" | "body" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
      <View style={{ paddingTop: 2 }}><Icon name={icon} size={16} color={color} /></View>
      <T v={v} color={color} style={{ flexShrink: 1 }}>{children}</T>
    </View>
  );
}

export function Gap({ h = space.lg }: { h?: number }) {
  return <View style={{ height: h }} />;
}

/** Created at render time so the active theme's colors are used (themes switch at runtime). */
/** Space reserved below tab-screen content for the floating bar. */
const TAB_BAR_SPACE = 128;
/** Readable line length on tablets and the web preview. */
export const MAX_CONTENT_WIDTH = 560;

const makeStyles = () =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingBottom: space.xxl, gap: space.lg, flexGrow: 1, width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  header: { gap: space.sm },
  backBtn: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  footer: { padding: space.xl, paddingTop: space.md, gap: space.sm, backgroundColor: colors.bg, width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  button: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chip: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    justifyContent: "center",
  },
  urgency: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: MIN_TOUCH, paddingVertical: space.xs },
  });
