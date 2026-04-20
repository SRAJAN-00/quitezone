import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  QuietHero,
  QuietPill,
  QuietPrimaryButton,
  QuietScreen,
  QuietSecondaryButton,
} from "@/components/ui/quietzone-ui";
import { getTheme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const features = [
  "Create quiet zones around classrooms, libraries, and studios.",
  "Switch your sound profile automatically when you arrive.",
  "Review event history and adjust zones with a calmer workflow.",
];

const metrics = [
  { label: "Quiet zones", value: "Map-first" },
  { label: "Session", value: "Persistent" },
  { label: "Signals", value: "Live API" },
];

export default function WelcomeScreen() {
  const theme = getTheme(useColorScheme());

  return (
    <QuietScreen theme={theme}>
      <QuietHero
        eyebrow="Quiet campus flow"
        subtitle="A calmer mobile workspace for setting quiet zones, tracking automation, and keeping your phone respectful in the places that need it most."
        theme={theme}
        title="QuietZone keeps the right rooms quiet without making you think about it."
      >
        <View style={styles.heroPills}>
          <QuietPill label="Map-based zones" theme={theme} />
          <QuietPill label="Persistent login" theme={theme} />
          <QuietPill label="Live backend data" theme={theme} />
        </View>

        <View style={styles.metricPanel}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: theme.accentTextOn }]}>{metric.value}</Text>
              <Text style={[styles.metricLabel, { color: "#bfd0c6" }]}>{metric.label}</Text>
            </View>
          ))}
        </View>
      </QuietHero>

      <View style={styles.body}>
        {features.map((feature) => (
          <View key={feature} style={[styles.featureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: theme.accentSoft }]}>
              <MaterialIcons color={theme.accent} name="check" size={22} />
            </View>
            <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
          </View>
        ))}

        <QuietPrimaryButton label="Create account" onPress={() => router.push("/(auth)/register")} theme={theme} />
        <QuietSecondaryButton label="I already have an account" onPress={() => router.push("/(auth)/login")} theme={theme} />
      </View>
    </QuietScreen>
  );
}

const styles = StyleSheet.create({
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  metricPanel: {
    backgroundColor: "rgba(247, 242, 234, 0.08)",
    borderRadius: 22,
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    padding: 16,
  },
  metricItem: {
    flex: 1,
    gap: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  body: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  featureCard: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  featureIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
});
