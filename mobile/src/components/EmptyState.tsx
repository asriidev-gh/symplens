import React from "react";
import { View } from "react-native";
import { colors, radius, space } from "@/theme";
import { Icon, type IconName } from "./Icon";
import { Button, T } from "./ui";

/** Icon + short message + optional action. Never leave an empty list blank. */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: "center", gap: space.md, paddingVertical: space.xl }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.lg,
          backgroundColor: colors.brandSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={32} color={colors.brandText} />
      </View>
      <T v="h2" style={{ textAlign: "center" }}>{title}</T>
      {body ? <T color={colors.inkSoft} style={{ textAlign: "center" }}>{body}</T> : null}
      {actionLabel && onAction ? (
        <View style={{ alignSelf: "stretch", marginTop: space.sm }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
