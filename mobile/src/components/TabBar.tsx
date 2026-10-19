import type { Tabs } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/lib/store";
import { colors, fonts, softShadow } from "@/theme";
import { Icon, type IconName } from "./Icon";

const ICONS: Record<string, [IconName, IconName]> = {
  index: ["home-outline", "home"],
  history: ["albums-outline", "albums"],
  analyze: ["camera-outline", "camera"],
  settings: ["settings-outline", "settings"],
  safety: ["shield-checkmark-outline", "shield-checkmark"],
};

type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

/** Themed rounded bar with a center camera action. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { fs } = useStore();
  const styles = makeStyles();
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 4 }]} pointerEvents="box-none">
    <View style={[styles.bar, softShadow]}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const label = descriptors[route.key].options.title ?? route.name;
        const center = route.name === "analyze";
        const press = () => {
          const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            onPress={press}
            style={styles.item}
          >
            {center ? (
              <View style={styles.center}>
                <Icon name={ICONS[route.name][1]} size={28} color={colors.onBrand} />
              </View>
            ) : (
              <View style={[styles.pill, focused && { backgroundColor: colors.selected }]}>
                <Icon name={ICONS[route.name][focused ? 1 : 0]} size={22} color={focused ? colors.onSelected : colors.tabInactive} />
              </View>
            )}
            {!center && (
              <Text style={{ fontFamily: focused ? fonts.bold : fonts.medium, fontSize: Math.max(12, fs(12)), color: focused ? colors.tabActiveLabel : colors.tabInactive }}>{label}</Text>
            )}
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
  // Floating glass pill: translucent so content shows through, rounded on all corners.
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  bar: {
    width: "100%",
    maxWidth: 560,
    marginHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.tabBar,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.tabBarBorder,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  item: { flex: 1, alignItems: "center", gap: 2, minHeight: 56, justifyContent: "center" },
  // Same shape for every tab (transparent when idle) so the active state only changes colour, never size or shape.
  pill: { width: 56, height: 32, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  // Seated inside the bar: equal space above and below, no overlap with the top edge.
  center: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  });
