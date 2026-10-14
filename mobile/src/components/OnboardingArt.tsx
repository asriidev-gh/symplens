import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";
import { useStore } from "@/lib/store";
import { colors, fonts, radius, softShadow } from "@/theme";
import { Icon } from "./Icon";
import { LOGOS } from "./ThemeLogo";
import { T } from "./ui";

const SIZE = 240;

/** Reduce-motion from the app setting or the OS. */
function useReduceMotion(): boolean {
  const { settings } = useStore();
  const [os, setOs] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOs).catch(() => {});
  }, []);
  return settings.reduceMotion || os;
}

/** Runs a looping animation only while `run` is true; resets to 0 otherwise. */
function useLoop(run: boolean, build: (v: Animated.Value) => Animated.CompositeAnimation, native = true) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!run) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(build(v));
    loop.start();
    return () => {
      loop.stop();
      v.setValue(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  return v;
}

const linear = (v: Animated.Value, ms: number) =>
  Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true });

/** Every piece is a full-stage layer, centered, so pieces stack without manual offsets. */
const Layer = ({ children, style }: { children?: React.ReactNode; style?: object }) => (
  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, style]}>
    {children}
  </Animated.View>
);

function Spin({ run, ms, reverse, children }: { run: boolean; ms: number; reverse?: boolean; children: React.ReactNode }) {
  const v = useLoop(run, (x) => linear(x, ms));
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: reverse ? ["360deg", "0deg"] : ["0deg", "360deg"] });
  return <Layer style={{ transform: [{ rotate }] }}>{children}</Layer>;
}

function Pulse({ run, from = 1, to = 1.08, ms = 1400, children }: { run: boolean; from?: number; to?: number; ms?: number; children: React.ReactNode }) {
  const v = useLoop(run, (x) =>
    Animated.sequence([
      Animated.timing(x, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]),
  );
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  return <Layer style={{ transform: [{ scale }] }}>{children}</Layer>;
}

function Float({ run, dist = 6, ms = 1800, delay = 0, children }: { run: boolean; dist?: number; ms?: number; delay?: number; children: React.ReactNode }) {
  const v = useLoop(run, (x) =>
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(x, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]),
  );
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [dist, -dist] });
  return <Layer style={{ transform: [{ translateY }] }}>{children}</Layer>;
}

/** Expanding ripple ring (privacy step). */
function Ripple({ run, delay }: { run: boolean; delay: number }) {
  const v = useLoop(run, (x) => Animated.sequence([Animated.delay(delay), linear(x, 2600)]));
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.55] });
  const opacity = v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.55, 0] });
  return (
    <Layer style={{ transform: [{ scale }], opacity }}>
      <View style={{ width: 150, height: 150, borderRadius: 75, borderWidth: 3, borderColor: colors.brand }} />
    </Layer>
  );
}

const Ring = ({ size, r, stroke, width, dash }: { size: number; r: number; stroke: string; width: number; dash: string }) => (
  <Svg width={size} height={size}>
    <Circle cx={size / 2} cy={size / 2} r={r} stroke={stroke} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" fill="none" />
  </Svg>
);

/** Corner brackets (scan frame). */
const Brackets = ({ size, color }: { size: number; color: string }) => {
  const a = 26;
  const p = (d: string) => <Path d={d} stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  return (
    <Svg width={size} height={size}>
      {p(`M4 ${a} V12 Q4 4 12 4 H${a}`)}
      {p(`M${size - a} 4 H${size - 12} Q${size - 4} 4 ${size - 4} 12 V${a}`)}
      {p(`M4 ${size - a} V${size - 12} Q4 ${size - 4} 12 ${size - 4} H${a}`)}
      {p(`M${size - a} ${size - 4} H${size - 12} Q${size - 4} ${size - 4} ${size - 4} ${size - 12} V${size - a}`)}
    </Svg>
  );
};

/* ------------------------------- stage backdrop ------------------------------- */

function Stage({ children }: { children: React.ReactNode }) {
  const { settings } = useStore();
  const theme = settings.theme;
  const grid = [];
  for (let i = 1; i < 8; i++) {
    const p = (SIZE / 8) * i;
    grid.push(<Line key={`v${i}`} x1={p} y1={0} x2={p} y2={SIZE} stroke={colors.line} strokeWidth={1} opacity={theme === "dark" ? 0.7 : 0.9} />);
    grid.push(<Line key={`h${i}`} x1={0} y1={p} x2={SIZE} y2={p} stroke={colors.line} strokeWidth={1} opacity={theme === "dark" ? 0.7 : 0.9} />);
  }
  return (
    <View
      style={[
        styles.stage,
        softShadow,
        { backgroundColor: theme === "warm" ? colors.brandSoft : colors.surface, borderColor: theme === "dark" ? colors.brandBorder : colors.cardBorder },
      ]}
      aria-hidden
    >
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        {theme === "warm" ? (
          <G>
            <Circle cx={30} cy={40} r={64} fill={colors.cream} opacity={0.75} />
            <Circle cx={210} cy={200} r={78} fill={colors.secondary} opacity={0.55} />
            <Circle cx={200} cy={34} r={26} fill={colors.brand} opacity={0.25} />
          </G>
        ) : (
          <G>{grid}</G>
        )}
        {theme === "dark" ? <Circle cx={SIZE / 2} cy={SIZE / 2} r={92} fill={colors.brand} opacity={0.1} /> : null}
      </Svg>
      {children}
    </View>
  );
}

/* --------------------------------- the 5 steps --------------------------------- */

function LensStep({ run }: { run: boolean }) {
  return (
    <>
      <Spin run={run} ms={9000}>
        <Ring size={196} r={90} stroke={colors.brandText} width={6} dash="110 56 36 56" />
      </Spin>
      <Spin run={run} ms={7000} reverse>
        <Ring size={160} r={74} stroke={colors.brand} width={4} dash="26 22" />
      </Spin>
      <Pulse run={run} from={0.96} to={1.07}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx={60} cy={60} r={52} fill={colors.surface} stroke={colors.line} strokeWidth={2} />
          <Circle cx={60} cy={60} r={32} fill={colors.brandSoft} stroke={colors.brandText} strokeWidth={4} />
          <Circle cx={60} cy={60} r={15} fill={colors.brandText} />
          <Circle cx={54} cy={54} r={5} fill="#fff" opacity={0.85} />
        </Svg>
      </Pulse>
    </>
  );
}

function CameraStep({ run }: { run: boolean }) {
  const flash = useLoop(run, (x) =>
    Animated.sequence([
      Animated.delay(1600),
      Animated.timing(x, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]),
  );
  return (
    <>
      <Pulse run={run} from={0.93} to={1} ms={1100}>
        <Brackets size={190} color={colors.brandText} />
      </Pulse>
      <Layer>
        <Svg width={140} height={112} viewBox="0 0 140 112">
          <Path d="M48 18 L56 6 H84 L92 18" fill={colors.brandSoft} stroke={colors.brandText} strokeWidth={4} strokeLinejoin="round" />
          <Rect x={8} y={18} width={124} height={82} rx={16} fill={colors.surface} stroke={colors.brandText} strokeWidth={4} />
          <Circle cx={70} cy={59} r={28} fill={colors.brandSoft} stroke={colors.brandText} strokeWidth={4} />
          <Circle cx={70} cy={59} r={15} fill={colors.brandText} />
          <Circle cx={64} cy={53} r={4.5} fill="#fff" opacity={0.85} />
          <Rect x={104} y={28} width={14} height={8} rx={3} fill={colors.brand} />
        </Svg>
      </Layer>
      <Layer style={{ opacity: flash }}>
        <View style={{ width: SIZE, height: SIZE, backgroundColor: "#fff", opacity: 0.55 }} />
      </Layer>
    </>
  );
}

function Dot({ run, delay }: { run: boolean; delay: number }) {
  const v = useLoop(run, (x) =>
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(x, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0.25, duration: 260, useNativeDriver: true }),
      Animated.delay(900 - delay),
    ]),
  );
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  return <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.onPrimary, opacity, marginHorizontal: 4 }} />;
}

function ChatStep({ run }: { run: boolean }) {
  return (
    <>
      <Float run={run} dist={4} ms={1900}>
        {/* bubble B (reply) */}
        <Svg width={190} height={170} viewBox="0 0 190 170">
          <Path
            d="M70 84 H160 Q178 84 178 102 V122 Q178 140 160 140 H138 L122 156 V140 H70 Q52 140 52 122 V102 Q52 84 70 84 Z"
            fill={colors.brandSoft}
            stroke={colors.brandText}
            strokeWidth={3.5}
            strokeLinejoin="round"
          />
          <Line x1={78} y1={106} x2={150} y2={106} stroke={colors.brandText} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
          <Line x1={78} y1={122} x2={126} y2={122} stroke={colors.brandText} strokeWidth={4} strokeLinecap="round" opacity={0.4} />
        </Svg>
      </Float>
      <Float run={run} dist={5} ms={1500} delay={250}>
        {/* bubble A (typing) */}
        <View style={{ width: 190, height: 170 }}>
          <Svg width={190} height={170} viewBox="0 0 190 170" style={StyleSheet.absoluteFill}>
            <Path
              d="M30 22 H112 Q130 22 130 40 V60 Q130 78 112 78 H62 L44 94 V78 H30 Q12 78 12 60 V40 Q12 22 30 22 Z"
              fill={colors.primary}
              stroke={colors.primary}
              strokeWidth={3.5}
              strokeLinejoin="round"
            />
          </Svg>
          <View style={{ position: "absolute", left: 12, top: 22, width: 118, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <Dot run={run} delay={0} />
            <Dot run={run} delay={220} />
            <Dot run={run} delay={440} />
          </View>
        </View>
      </Float>
    </>
  );
}

function PrivacyStep({ run }: { run: boolean }) {
  return (
    <>
      <Ripple run={run} delay={0} />
      <Ripple run={run} delay={1300} />
      <Float run={run} dist={4} ms={1700}>
        <Svg width={130} height={150} viewBox="0 0 120 140">
          <Path
            d="M60 6 L110 24 V66 C110 100 88 124 60 136 C32 124 10 100 10 66 V24 Z"
            fill={colors.brandSoft}
            stroke={colors.brandText}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <Path d="M47 62 V54 a13 13 0 0 1 26 0 V62" fill="none" stroke={colors.brandText} strokeWidth={5} strokeLinecap="round" />
          <Rect x={38} y={62} width={44} height={34} rx={8} fill={colors.brandText} />
          <Circle cx={60} cy={77} r={5} fill={colors.surface} />
          <Rect x={58} y={80} width={4} height={9} rx={2} fill={colors.surface} />
        </Svg>
      </Float>
    </>
  );
}

function HelpStep({ run }: { run: boolean }) {
  const draw = useLoop(
    run,
    (x) =>
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.delay(500),
        Animated.timing(x, { toValue: 0, duration: 1, useNativeDriver: false }),
      ]),
    false,
  );
  const ECG = 300;
  // A plain <Path> driven from a listener: Animated.createAnimatedComponent leaks native-only props into the DOM on web.
  const [dashoffset, setDashoffset] = useState(ECG);
  useEffect(() => {
    const id = draw.addListener(({ value }) => setDashoffset(ECG * (1 - value)));
    return () => draw.removeListener(id);
  }, [draw]);
  const beat = useLoop(run, (x) =>
    Animated.sequence([
      Animated.timing(x, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0.6, duration: 140, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 520, useNativeDriver: true }),
      Animated.delay(900),
    ]),
  );
  const scale = beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  return (
    <>
      <Spin run={run} ms={16000}>
        <Ring size={206} r={98} stroke={colors.brand} width={3} dash="4 12" />
      </Spin>
      <Layer style={{ transform: [{ scale }], bottom: 64 }}>
        <Svg width={92} height={92} viewBox="0 0 92 92">
          <Circle cx={46} cy={46} r={42} fill={colors.surface} stroke={colors.danger} strokeWidth={4} />
          <Path d="M38 20 H54 V38 H72 V54 H54 V72 H38 V54 H20 V38 H38 Z" fill={colors.danger} />
        </Svg>
      </Layer>
      <Layer style={{ top: 120 }}>
        <Svg width={SIZE} height={70} viewBox={`0 0 ${SIZE} 70`}>
          <Path
            d="M14 36 H78 L92 14 L108 58 L122 28 L132 36 H226"
            fill="none"
            stroke={colors.brandText}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${ECG}`}
            strokeDashoffset={dashoffset}
          />
        </Svg>
      </Layer>
    </>
  );
}

const STEPS = [LensStep, CameraStep, ChatStep, PrivacyStep, HelpStep];

export function OnboardingArt({ step, active }: { step: number; active: boolean }) {
  const reduce = useReduceMotion();
  const Art = STEPS[step] ?? LensStep;
  return (
    <Stage>
      <Art run={active && !reduce} />
    </Stage>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.lg + 10,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  center: { alignItems: "center", justifyContent: "center" },
});


/* ------------------------------- brand splash (step 0) ------------------------------- */

function BrandBackdrop() {
  const { settings } = useStore();
  const theme = settings.theme;
  const W = 400;
  const H = 760;
  const lines = [];
  if (theme !== "warm") {
    for (let i = 1; i < 10; i++) {
      lines.push(<Line key={`v${i}`} x1={(W / 10) * i} y1={0} x2={(W / 10) * i} y2={H} stroke={colors.line} strokeWidth={1} opacity={theme === "dark" ? 0.45 : 0.7} />);
    }
    for (let i = 1; i < 19; i++) {
      lines.push(<Line key={`h${i}`} x1={0} y1={(H / 19) * i} x2={W} y2={(H / 19) * i} stroke={colors.line} strokeWidth={1} opacity={theme === "dark" ? 0.45 : 0.7} />);
    }
  }
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      {theme === "warm" ? (
        <G>
          <Path d={`M0 90 C 110 30, 250 170, ${W} 80 L${W} 0 L0 0 Z`} fill={colors.brandSoft} opacity={0.85} />
          <Path d={`M0 600 C 130 540, 270 660, ${W} 580 L${W} ${H} L0 ${H} Z`} fill={colors.secondary} opacity={0.65} />
          <Circle cx={340} cy={150} r={34} fill={colors.brand} opacity={0.18} />
          <Circle cx={50} cy={520} r={22} fill={colors.brand} opacity={0.2} />
        </G>
      ) : (
        <G>
          {lines}
          <Circle cx={W / 2} cy={250} r={170} fill={colors.brand} opacity={theme === "dark" ? 0.14 : 0.1} />
        </G>
      )}
      {theme === "dark" ? (
        <G>
          {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((i) => (
            <Line key={`p${i}`} x1={W / 2} y1={560} x2={W / 2 + i * 95} y2={H} stroke={colors.brand} strokeWidth={1.2} opacity={0.4} />
          ))}
          {[570, 595, 628, 670, 725].map((y) => (
            <Line key={`r${y}`} x1={0} y1={y} x2={W} y2={y} stroke={colors.brandBorder} strokeWidth={1.2} opacity={0.7} />
          ))}
        </G>
      ) : null}
    </Svg>
  );
}

function Wordmark() {
  const { settings, fs } = useStore();
  const theme = settings.theme;
  const dark = theme === "dark";
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }} accessible accessibilityRole="header" accessibilityLabel="SympLens">
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: fs(46),
          letterSpacing: -0.5,
          color: theme === "warm" ? colors.brandText : colors.ink,
          textShadowColor: dark ? colors.brand : "transparent",
          textShadowRadius: dark ? 16 : 0,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        Symp
        <Text style={{ fontFamily: theme === "tech" ? fonts.regular : fonts.bold, color: theme === "tech" ? colors.brandText : dark ? colors.brandText : colors.brandText }}>Lens</Text>
        {theme === "tech" ? <Text style={{ color: colors.brand }}>.</Text> : null}
      </Text>
      {theme === "warm" ? (
        <View style={{ marginTop: 6, marginLeft: 2 }}>
          <Icon name="leaf" size={18} color={colors.teal} />
        </View>
      ) : null}
    </View>
  );
}

/** First intro step: themed backdrop, floating logo, wordmark and tagline. */
export function BrandSplash({ active }: { active: boolean }) {
  const reduce = useReduceMotion();
  const run = active && !reduce;
  const { settings, t } = useStore();
  const theme = settings.theme;
  const glow = useLoop(run, (x) =>
    Animated.sequence([
      Animated.timing(x, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]),
  );
  const haloScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });
  const haloOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [theme === "dark" ? 0.35 : 0.18, theme === "dark" ? 0.6 : 0.3] });
  return (
    <View style={{ flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", gap: 18 }}>
      <BrandBackdrop />
      <View style={{ width: 230, height: 230 }}>
        <Layer style={{ transform: [{ scale: haloScale }], opacity: haloOpacity }}>
          <View style={{ width: 210, height: 210, borderRadius: 105, backgroundColor: colors.brand }} />
        </Layer>
        <Float run={run} dist={7} ms={2000}>
          <Image source={LOGOS[theme]} style={[{ width: 188, height: 188 }, softShadow]} resizeMode="contain" accessibilityLabel={t("appName")} />
        </Float>
      </View>
      <Wordmark />
      <T v="small" color={colors.brandText} style={{ letterSpacing: 1.2, fontFamily: fonts.medium }}>{t("descriptor").toUpperCase()}</T>
      <T color={colors.inkSoft} style={{ textAlign: "center", maxWidth: 300 }}>{t("tagline")}</T>
    </View>
  );
}
