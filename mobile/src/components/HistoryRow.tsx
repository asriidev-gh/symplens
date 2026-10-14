import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { categoryKey, type TKey } from "@/i18n";
import { CATEGORY_ICON, Icon } from "./Icon";
import { useStore } from "@/lib/store";
import type { HistoryEntry } from "@/lib/types";
import { MIN_TOUCH, colors, radius, space, urgencyStyle } from "@/theme";
import { T } from "./ui";

export function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const { t } = useStore();
  const a = entry.response.analysis;
  const u = urgencyStyle[a.urgency];
  const label = t(categoryKey(a.category));
  const urg = t(`urg_${a.urgency}` as TKey);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${urg}`}
      onPress={() => router.push({ pathname: "/result", params: { id: entry.id } })}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH + 12,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        padding: space.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={CATEGORY_ICON[a.category] ?? "medkit-outline"} size={22} color={colors.brandText} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="label">{label}</T>
        <T v="small" color={u.fg}>
          {urg}
        </T>
      </View>
      <T v="small" color={colors.inkSoft}>
        {new Date(entry.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </T>
    </Pressable>
  );
}
