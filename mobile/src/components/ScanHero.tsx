import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import type { TKey } from "@/i18n";
import { useStore } from "@/lib/store";
import type { Urgency } from "@/lib/types";
import { colors, motion, radius, softShadow, space, urgencyStyle } from "@/theme";
import { Icon, type IconName } from "./Icon";
import { LipsIcon } from "./LipsIcon";
import { T } from "./ui";

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>["name"] | "lips";

function AreaIcon({ name, size, color }: { name: Glyph; size: number; color: string }) {
  return name === "lips" ? <LipsIcon size={size} color={color} /> : <MaterialCommunityIcons name={name} size={size} color={color} />;
}

type AreaId = "skin" | "hair" | "eyes" | "nose" | "ears" | "mouth" | "arm" | "hands" | "legs" | "feet";

/** Body areas people commonly photograph. Illustrative only: SympLens never claims to detect a condition. */
const AREAS: { id: AreaId; icon: Glyph; label: TKey; photo: ImageSourcePropType; urgency: Urgency }[] = [
  { id: "skin", icon: "hand-back-right-outline", label: "area_skin", photo: require("../../assets/diseases/skin.png"), urgency: "low" },
  { id: "hair", icon: "content-cut", label: "area_hair", photo: require("../../assets/diseases/hair.png"), urgency: "low" },
  { id: "eyes", icon: "eye-outline", label: "area_eyes", photo: require("../../assets/diseases/eyes.png"), urgency: "needs_attention" },
  { id: "nose", icon: "face-man-outline", label: "area_nose", photo: require("../../assets/diseases/nose.png"), urgency: "low" },
  { id: "ears", icon: "ear-hearing", label: "area_ears", photo: require("../../assets/diseases/ears.png"), urgency: "needs_attention" },
  { id: "mouth", icon: "lips", label: "area_mouth", photo: require("../../assets/diseases/mouth.png"), urgency: "needs_attention" },
  { id: "arm", icon: "arm-flex-outline", label: "area_arm", photo: require("../../assets/diseases/arms.png"), urgency: "needs_attention" },
  { id: "hands", icon: "hand-front-right-outline", label: "area_hands", photo: require("../../assets/diseases/hands.jpg"), urgency: "needs_attention" },
  { id: "legs", icon: "walk", label: "area_legs", photo: require("../../assets/diseases/legs.png"), urgency: "needs_attention" },
  { id: "feet", icon: "foot-print", label: "area_feet", photo: require("../../assets/diseases/foot.jpg"), urgency: "low" },
];

/** Each sample line is tagged with the same icons the real result screen uses: see / mean / do. */
const LINES: IconName[] = ["eye-outline", "bulb-outline", "checkmark-circle-outline"];

const FRAME = 148;
const DISC = 118;
/** How long each sample stays up before the next one: long enough to read three short lines. */
const DWELL_MS = 4500;

/**
 * Home hero. Left: an animated scan frame with an example photo. Right: a short sample analysis for the same
 * area. It auto-advances (the progress bar shows when) until the user picks an area; static under reduce-motion.
 */
export function ScanHero() {
  const { t, settings } = useStore();
  const styles = makeStyles();
  const focused = useIsFocused(); // tabs stay mounted: do not animate while another tab is showing
  const { width } = useWindowDimensions();
  const stacked = width < 380; // very narrow phones: stack instead of two columns
  const [osReduce, setOsReduce] = useState(false);
  const reduce = settings.reduceMotion || osReduce;
  const [index, setIndex] = useState(0);
  const [manual, setManual] = useState(false);
  const [scan] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOsReduce).catch(() => {});
  }, []);

  // Scan line sweeps top to bottom.
  useEffect(() => {
    if (reduce || !focused) {
      scan.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, focused, scan]);

  // One animation drives the cycle: when the progress bar fills, move to the next area.
  useEffect(() => {
    progress.setValue(0);
    if (reduce || manual || !focused) return;
    const anim = Animated.timing(progress, { toValue: 1, duration: DWELL_MS, easing: Easing.linear, useNativeDriver: true });
    anim.start(({ finished }) => {
      if (finished) setIndex((i) => (i + 1) % AREAS.length);
    });
    return () => anim.stop();
  }, [index, reduce, manual, focused, progress]);

  // Quick fade when the area changes.
  useEffect(() => {
    if (reduce) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: motion.base, useNativeDriver: true }).start();
  }, [index, reduce, fade]);

  const active = AREAS[index];
  const u = urgencyStyle[active.urgency];
  const lineY = scan.interpolate({ inputRange: [0, 1], outputRange: [-FRAME / 2 + 24, FRAME / 2 - 24] });

  return (
    <View style={styles.hero}>
      <View style={[styles.row, stacked && { flexDirection: "column" }]}>
        {/* left: scan frame + example photo */}
        <View style={styles.frame} aria-hidden>
          <Animated.View style={[styles.disc, { opacity: fade }]}>
            <Image source={active.photo} style={styles.photo} resizeMode="cover" />
          </Animated.View>
          <Animated.View style={[styles.scanLine, { transform: [{ translateY: lineY }] }]} />
          <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 }]} />
          <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 }]} />
          <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 }]} />
          <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 }]} />
        </View>

        {/* right: sample analysis for the same area */}
        <View style={styles.card}>
          <Animated.View style={{ opacity: fade, gap: space.sm }}>
            <View style={styles.cardHead}>
              <T v="small" color={colors.brandText} style={styles.kicker}>{t("sampleTitle").toUpperCase()}</T>
              <View style={styles.headRight}>
                {!reduce && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={manual ? t("playSamples") : t("pauseSamples")}
                    onPress={() => setManual((m) => !m)}
                    hitSlop={10}
                    style={styles.pauseBtn}
                  >
                    <Icon name={manual ? "play-circle-outline" : "pause-circle-outline"} size={22} color={colors.brandText} />
                  </Pressable>
                )}
              <View style={[styles.pill, { backgroundColor: u.bg, borderColor: u.border }]}>
                <T v="small" color={u.fg} style={{ fontFamily: "DMSans_700Bold", fontSize: 11, lineHeight: 14 }}>
                  {t(`urg_${active.urgency}` as TKey)}
                </T>
              </View>
              </View>
            </View>
            <View style={styles.titleRow}>
              <AreaIcon name={active.icon} size={20} color={colors.brandText} />
              <T v="h2" numberOfLines={1} style={{ flexShrink: 1 }}>{t(active.label)}</T>
            </View>
            {LINES.map((icon, n) => (
              <View key={icon} style={styles.line}>
                <View style={{ paddingTop: 2 }}>
                  <Icon name={icon} size={15} color={colors.brandText} />
                </View>
                <T v="small" style={styles.lineText}>{t(`sample_${active.id}_${n + 1}` as TKey)}</T>
              </View>
            ))}
          </Animated.View>
          {!reduce && !manual && focused ? (
            <View style={styles.track} aria-hidden>
              <Animated.View style={[styles.fill, { transform: [{ scaleX: progress }] }]} />
            </View>
          ) : null}
        </View>
      </View>

      <T v="small" color={colors.inkSoft} style={{ textAlign: "center" }}>{t("areasTitle")}</T>

      <View style={styles.pills} accessibilityRole="radiogroup">
        {AREAS.map((a, i) => {
          const selected = i === index;
          return (
            <Pressable
              key={a.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(a.label)}
              onPress={() => {
                setManual(true);
                setIndex(i);
              }}
              hitSlop={4}
              style={[styles.tile, softShadow, selected && styles.tileActive]}
            >
              <AreaIcon name={a.icon} size={24} color={selected ? colors.onSelected : colors.brandText} />
              <T
                v="small"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
                color={selected ? colors.onSelected : colors.ink}
                style={{ fontFamily: "DMSans_500Medium", fontSize: 13 }}
              >
                {t(a.label)}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Created at render time so the active theme's colors are used (themes switch at runtime).
const makeStyles = () =>
  StyleSheet.create({
    hero: {
      backgroundColor: colors.brandSoft,
      borderRadius: radius.lg + 6,
      padding: space.lg,
      gap: space.lg,
    },
    row: { flexDirection: "row", alignItems: "center", gap: space.md },
    frame: { width: FRAME, height: FRAME, alignItems: "center", justifyContent: "center", alignSelf: "center" },
    // Round container: the whole photo fills it (cover), clipped to a circle.
    disc: {
      width: DISC,
      height: DISC,
      borderRadius: DISC / 2,
      backgroundColor: colors.surface,
      overflow: "hidden",
      borderWidth: 4,
      borderColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    photo: { width: DISC - 8, height: DISC - 8, borderRadius: (DISC - 8) / 2 },
    scanLine: {
      position: "absolute",
      width: FRAME - 36,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.brand,
      opacity: 0.9,
      shadowColor: colors.brand,
      shadowOpacity: 0.9,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 0 },
    },
    corner: { position: "absolute", width: 26, height: 26, borderColor: colors.brandText },
    card: {
      flex: 1,
      alignSelf: "stretch",
      minHeight: FRAME,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: space.md,
      paddingBottom: space.md + 4,
      justifyContent: "center",
      overflow: "hidden",
    },
    cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
    kicker: { fontFamily: "DMSans_700Bold", fontSize: 10, lineHeight: 14, letterSpacing: 0.8, flexShrink: 1 },
    headRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    pauseBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
    pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
    line: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
    lineText: { flex: 1, fontSize: 13, lineHeight: 18 },
    track: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: colors.track },
    fill: { height: 3, backgroundColor: colors.brand, transformOrigin: "left" },
    pills: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space.sm, alignSelf: "stretch" },
    tile: {
      width: "18.4%",
      minHeight: 62,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingHorizontal: 2,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    tileActive: { backgroundColor: colors.selected },
  });
