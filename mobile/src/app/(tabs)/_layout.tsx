import { Tabs } from "expo-router";
import React from "react";
import { TabBar } from "@/components/TabBar";
import { useStore } from "@/lib/store";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { t } = useStore();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, tabBarStyle: { position: "absolute" } }}>
      <Tabs.Screen name="index" options={{ title: t("tabHome") }} />
      <Tabs.Screen name="history" options={{ title: t("tabHistory") }} />
      <Tabs.Screen name="analyze" options={{ title: t("tabAnalyze") }} />
      <Tabs.Screen name="settings" options={{ title: t("tabSettings") }} />
      <Tabs.Screen name="safety" options={{ title: t("tabSafety") }} />
    </Tabs>
  );
}
