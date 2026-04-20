import { Redirect, Stack } from "expo-router";

import { AuthLoadingScreen } from "@/components/ui/auth-loading-screen";
import { useAuth } from "@/context/auth-context";

export default function AuthLayout() {
  const { isAuthenticated, isHydrating } = useAuth();

  if (isHydrating) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
