import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { ConfirmSheet } from "@/components/BottomSheet";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { HistoryRow } from "@/components/HistoryRow";
import { Button, Screen, T } from "@/components/ui";
import { dayLabel } from "@/lib/format";
import { useStore } from "@/lib/store";
import { router } from "expo-router";
import { colors, space } from "@/theme";

export default function History() {
  const { t, history, clearHistory, settings } = useStore();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  const groups = useMemo(() => {
    const out: { label: string; items: typeof history }[] = [];
    for (const e of history) {
      const label = dayLabel(e.createdAt, t);
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(e);
      else out.push({ label, items: [e] });
    }
    return out;
  }, [history, t]);

  return (
    <Screen tabs>
      <T v="title" accessibilityRole="header">{t("historyTitle")}</T>
      {!settings.historyEnabled || settings.privateMode ? (
        <T color={colors.inkSoft}>{t("historyOff")}</T>
      ) : null}
      {history.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          title={t("historyEmpty")}
          body={t("noRecent")}
          actionLabel={t("analyzeSymptom")}
          onAction={() => router.navigate("/analyze")}
        />
      ) : (
        <>
          {groups.map((g) => (
            <View key={g.label} style={{ gap: space.sm }}>
              <T v="label" color={colors.inkSoft}>{g.label}</T>
              {g.items.map((e) => (
                <HistoryRow key={e.id} entry={e} />
              ))}
            </View>
          ))}
          <Button kind="danger" label={t("deleteAll")} onPress={() => setConfirming(true)} />
          <ConfirmSheet
            visible={confirming}
            title={t("deleteAll")}
            message={t("deleteAllConfirm")}
            confirmLabel={t("delete")}
            cancelLabel={t("cancel")}
            destructive
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              setConfirming(false);
              clearHistory();
              toast.show({ message: t("deleted"), kind: "success" });
            }}
          />
        </>
      )}
    </Screen>
  );
}
