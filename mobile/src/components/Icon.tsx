import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { colors } from "@/theme";

/** One icon set (Ionicons, outline/filled) for the whole app. Decorative by default: pair with a text label. */
export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export function Icon({ name, size = 22, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} aria-hidden />;
}

export const CATEGORY_ICON: Record<string, IconName> = {
  respiratory: "pulse",
  skin: "hand-left-outline",
  eye: "eye-outline",
  mouth_throat: "happy-outline",
  digestive: "nutrition-outline",
  urinary: "water-outline",
  wound_injury: "bandage-outline",
  nail_hair_scalp: "cut-outline",
  swelling_pain: "fitness-outline",
  document: "document-text-outline",
  other: "medkit-outline",
};
