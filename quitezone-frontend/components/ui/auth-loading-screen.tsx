import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getTheme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export function AuthLoadingScreen({ label = "Restoring your session..." }: { label?: string }) {
  const theme = getTheme(useColorScheme());

  return (
    <View style={[styles.container, { backgroundColor: theme.page }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ActivityIndicator color={theme.accent} />
        <Text style={[styles.title, { color: theme.text }]}>QuietZone</Text>
        <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    minWidth: 240,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  label: {
    fontSize: 14,
    textAlign: "center",
  },
});
