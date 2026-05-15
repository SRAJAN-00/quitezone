import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "@/lib/silent-automation/geofence-runtime";

import { AuthProvider } from "@/context/auth-context";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppThemeProvider } from "@/context/theme-context";

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </AppThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const quietTheme = Colors[colorScheme];
  const navTheme =
    colorScheme === "dark"
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: quietTheme.background,
            card: quietTheme.surface,
            text: quietTheme.text,
            border: quietTheme.border,
            primary: quietTheme.accent,
            notification: quietTheme.danger,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: quietTheme.background,
            card: quietTheme.surface,
            text: quietTheme.text,
            border: quietTheme.border,
            primary: quietTheme.accent,
            notification: quietTheme.danger,
          },
        };

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="zone-editor" options={{ presentation: "modal" }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
