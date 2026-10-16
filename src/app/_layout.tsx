import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { UpdateAnalyticsReporter } from "@/components/update-analytics-reporter";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <UpdateAnalyticsReporter />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="a" options={{ title: "页面 A" }} />
        <Stack.Screen name="pageB" options={{ title: "页面 B" }} />
        <Stack.Screen name="pageC" options={{ title: "" }} />
      </Stack>
    </ThemeProvider>
  );
}
