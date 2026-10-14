import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold, useFonts } from "@expo-google-fonts/dm-sans";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/Toast";
import { StoreProvider, useStore } from "@/lib/store";
import { colors } from "@/theme";

function Routes() {
  const { ready, settings } = useStore();
  const [fontsLoaded, fontError] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  if (!ready || (!fontsLoaded && !fontError)) return null;
  return (
    <>
    <StatusBar style={colors.isDark ? "light" : "dark"} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!settings.onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={settings.onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="analyze/who" />
        <Stack.Screen name="analyze/photo" />
        <Stack.Screen name="analyze/describe" />
        <Stack.Screen name="processing" options={{ gestureEnabled: false }} />
        <Stack.Screen name="result" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="about" />
      </Stack.Protected>
    </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ToastProvider>
          <Routes />
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
