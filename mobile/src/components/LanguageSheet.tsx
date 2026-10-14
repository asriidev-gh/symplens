import React from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { LANGUAGES } from "@/i18n";
import { useStore } from "@/lib/store";
import type { Locale } from "@/lib/types";
import { MIN_TOUCH, colors, radius, space } from "@/theme";
import { BottomSheet } from "./BottomSheet";
import { Icon } from "./Icon";
import { T } from "./ui";

/** Language picker. Names are shown in their own language so anyone can find theirs. */
export function LanguageSheet({
  visible,
  onClose,
  title,
  selected: selectedCode,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** highlighted language (defaults to the app language) */
  selected?: Locale;
  /** when given, picking a language calls this instead of changing the app language */
  onSelect?: (code: Locale) => void;
}) {
  const { t, settings, update } = useStore();
  const { height } = useWindowDimensions();
  // Explicit height (not maxHeight): a ScrollView inside an auto-height sheet can collapse to 0 on some layouts.
  const ROW = MIN_TOUCH + space.sm;
  const listHeight = Math.min(height * 0.55, LANGUAGES.length * ROW);
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title ?? t("sLanguage")}>
      <ScrollView style={{ height: listHeight }} showsVerticalScrollIndicator>
        <View accessibilityRole="radiogroup" style={{ gap: space.sm, paddingBottom: space.sm }}>
          {LANGUAGES.map((l) => {
            const selected = (selectedCode ?? settings.locale) === l.code;
            return (
              <Pressable
                key={l.code}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={l.label}
                onPress={() => {
                  if (onSelect) onSelect(l.code);
                  else update({ locale: l.code });
                  onClose();
                }}
                style={{
                  minHeight: MIN_TOUCH,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: space.lg,
                  borderRadius: radius.md,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.selected : colors.line,
                  backgroundColor: selected ? colors.brandSoft : colors.surface,
                }}
              >
                <T v="label">{l.label}</T>
                {selected ? <Icon name="checkmark-circle" size={24} color={colors.selected} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
