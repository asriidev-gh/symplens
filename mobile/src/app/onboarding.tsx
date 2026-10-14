import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, FlatList, Pressable, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { BrandSplash, OnboardingArt } from "@/components/OnboardingArt";
import { ThemeLogo } from "@/components/ThemeLogo";
import { Button, T } from "@/components/ui";
import type { TKey } from "@/i18n";
import { useStore } from "@/lib/store";
import { colors, radius, softShadow, space } from "@/theme";

const PAGES: { t: TKey; b: TKey }[] = [
  { t: "appName", b: "tagline" }, // step 0: brand splash (custom layout)
  { t: "ob1t", b: "ob1b" },
  { t: "ob2t", b: "ob2b" },
  { t: "ob3t", b: "ob3b" },
  { t: "ob4t", b: "ob4b" },
  { t: "ob5t", b: "ob5b" },
];

/** Title + body rise and fade in when their page becomes active (skipped under reduce-motion). */
function PageText({ title, body, active, reduce }: { title: string; body: string; active: boolean; reduce: boolean }) {
  const [v] = useState(() => new Animated.Value(reduce || active ? 1 : 0));
  useEffect(() => {
    if (reduce) {
      v.setValue(1);
      return;
    }
    if (!active) {
      v.setValue(0);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: 420, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [active, reduce, v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY }], alignItems: "center", gap: space.md }}>
      <T v="display" style={{ textAlign: "center" }} accessibilityRole="header">{title}</T>
      <T color={colors.inkSoft} style={{ textAlign: "center", maxWidth: 320 }}>{body}</T>
    </Animated.View>
  );
}

export default function Onboarding() {
  const { t, update, settings } = useStore();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [listH, setListH] = useState(0);
  const list = useRef<FlatList>(null);
  const last = index === PAGES.length - 1;
  const reduce = settings.reduceMotion;

  const goTo = (i: number) => {
    setIndex(i);
    list.current?.scrollToOffset({ offset: i * width, animated: true });
  };
  const finish = () => update({ onboarded: true });
  const next = () => (last ? finish() : goTo(index + 1));
  const settle = (x: number) => setIndex(Math.max(0, Math.min(PAGES.length - 1, Math.round(x / width))));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* top bar: privacy mark · app name · skip */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.xl, paddingTop: space.sm }}>
        <View
          style={[{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, softShadow]}
          aria-hidden
        >
          <Icon name="lock-closed-outline" size={20} />
        </View>
        {index > 0 ? <ThemeLogo size={36} withName /> : null}
        <View style={{ minWidth: 44, alignItems: "flex-end" }}>
          {!last ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t("skip")} onPress={finish} hitSlop={12} style={{ minHeight: 44, justifyContent: "center" }}>
              <T v="label" color={colors.brandText}>{t("skip")}</T>
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        ref={list}
        data={PAGES}
        horizontal
        pagingEnabled
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => setListH(e.nativeEvent.layout.height)}
        keyExtractor={(p) => p.t}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
        onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.x)}
        renderItem={({ item, index: i }) =>
          i === 0 ? (
            <View style={{ width, minHeight: listH }}>
              <BrandSplash active={index === 0} />
            </View>
          ) : (
            <View style={{ width, minHeight: listH, padding: space.xl, justifyContent: "center", alignItems: "center", gap: space.xl }}>
              <OnboardingArt step={i - 1} active={i === index} />
              <PageText title={t(item.t)} body={t(item.b)} active={i === index} reduce={reduce} />
            </View>
          )
        }
      />

      <View style={{ padding: space.xl, gap: space.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: space.sm }} accessibilityElementsHidden>
          {PAGES.map((p, i) => (
            <View
              key={p.t}
              style={{
                width: i === index ? 26 : 8,
                height: 8,
                borderRadius: radius.pill,
                backgroundColor: i === index ? colors.selected : colors.track,
              }}
            />
          ))}
        </View>
        <Button label={last ? t("startAnalyzing") : t("continue")} trailingIcon="arrow-forward" onPress={next} />
      </View>
    </SafeAreaView>
  );
}
