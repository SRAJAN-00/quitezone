import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Redirect, Tabs } from "expo-router";

import { AuthLoadingScreen } from "@/components/ui/auth-loading-screen";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const { isAuthenticated, isHydrating, user } = useAuth();

  if (isHydrating) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="home-filled" size={size} />,
        }}
      />
      <Tabs.Screen
        name="zones"
        options={{
          title: "Zones",
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="place" size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="history" size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="notifications" size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="settings" size={size} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: user?.role === "admin" ? undefined : null,
          title: "Admin",
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="admin-panel-settings" size={size} />,
        }}
      />
    </Tabs>
  );
}
