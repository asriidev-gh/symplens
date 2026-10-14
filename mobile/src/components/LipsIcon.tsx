import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

/** Outline lips, drawn to match the stroke weight of the Material Community icon set (no mouth glyph exists in it). */
export function LipsIcon({ size = 24, color = "#000" }: { size?: number; color?: string }) {
  return (
    <View aria-hidden>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12.2C5 8 8.2 8.2 12 10.3 15.8 8.2 19 8 21.5 12.2 19 17.2 5 17.2 2.5 12.2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path d="M2.8 12.3C8 14.1 16 14.1 21.2 12.3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
    </View>
  );
}
