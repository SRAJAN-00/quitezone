import { Redirect } from "expo-router";

import { AuthLoadingScreen } from "@/components/ui/auth-loading-screen";
import { useAuth } from "@/context/auth-context";

export default function IndexScreen() {
  const { isAuthenticated, isHydrating } = useAuth();

  if (isHydrating) {
    return <AuthLoadingScreen />;
  }

  return <Redirect href={isAuthenticated ? "/(tabs)" : "/(auth)/welcome"} />;
}
