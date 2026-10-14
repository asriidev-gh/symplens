import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useStore } from "@/lib/store";
import { colors, shadow } from "@/theme";
import { T } from "./ui";

/** Full illustrated logos: great when large (brand splash), too detailed and low-contrast at header size. */
export const LOGOS = {
  tech: require("../../assets/logos/logo-tech.png"),
  warm: require("../../assets/logos/logo-warm.png"),
  dark: require("../../assets/logos/logo-dark.png"),
} as const;

/** Full-art logo for the active theme (used big, on the brand splash). */
export function LogoArt({ size }: { size: number }) {
  const { settings } = useStore();
  return <Image source={LOGOS[settings.theme]} style={{ width: size, height: size }} resizeMode="contain" />;
}

/**
 * Compact brand mark for headers: a solid theme-colored badge with a simple, bold eye-and-plus symbol.
 * Always high contrast against the page in every theme, and crisp at any size (vector).
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  const radius = Math.round(size * 0.3);
  const gradient = colors.primaryGradient;
  const icon = Math.round(size * 0.64);
  return (
    <View style={[{ width: size, height: size, borderRadius: radius }, shadow]} aria-hidden>
      <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.primary, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {gradient ? <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        {/* own layer above the gradient: on web an absolutely positioned gradient would otherwise paint over the SVG */}
        <View style={{ zIndex: 1 }}>
        <Svg width={icon} height={icon} viewBox="0 0 24 24" fill="none">
          <Path
            d="M1.8 12C4.6 6.6 8.2 4.8 12 4.8S19.4 6.6 22.2 12C19.4 17.4 15.8 19.2 12 19.2S4.6 17.4 1.8 12Z"
            stroke={colors.onPrimary}
            strokeWidth={1.9}
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={12} r={4.6} stroke={colors.onPrimary} strokeWidth={1.6} opacity={0.55} />
          <Path d="M12 9.7V14.3M9.7 12H14.3" stroke={gradient ? colors.onPrimary : colors.brand} strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
        </View>
      </View>
    </View>
  );
}

/** Header lockup: brand mark + wordmark. */
export function ThemeLogo({ size = 40, withName = false }: { size?: number; withName?: boolean }) {
  const { t } = useStore();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessibilityRole="header" accessibilityLabel={t("appName")}>
      <BrandMark size={size} />
      {withName ? <T v="h2" style={{ letterSpacing: -0.2 }}>{t("appName")}</T> : null}
    </View>
  );
}
