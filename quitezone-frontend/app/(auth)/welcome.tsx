import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  QuietPrimaryButton,
  QuietScreen,
  QuietSecondaryButton,
} from "@/components/ui/quietzone-ui";
import { getTheme, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const features = [
  { icon: "location-on", text: "Create quiet zones around classrooms, libraries, and studios." },
  { icon: "volume-off", text: "Switch your sound profile automatically when you arrive." },
  { icon: "history", text: "Review event history and adjust zones with a calmer workflow." },
];

const metrics = [
  { label: "Zones", value: "Map-first" },
  { label: "Session", value: "Persistent" },
  { label: "Signals", value: "Live API" },
];

const heroPillLabels = ["Map-based zones", "Persistent login", "Live backend data"];

export default function WelcomeScreen() {
  const theme = getTheme(useColorScheme());

  return (
    <QuietScreen theme={theme} scroll={true}>
      <View style={styles.heroContainer}>
        <Text style={[styles.eyebrow, { color: theme.muted }]}>Quiet campus flow</Text>
        <Text style={[styles.title, { color: theme.text }]}>QuietZone keeps the right rooms quiet.</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          A calmer workspace for setting quiet zones and tracking automation.
        </Text>
        <View style={styles.heroPills}>
          {heroPillLabels.map((label) => (
            <View key={label} style={[styles.heroPill, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Text style={[styles.heroPillText, { color: theme.mutedStrong }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.metricPanel, {
        backgroundColor: theme.surface,
        borderColor: theme.border,
        shadowColor: theme.text,
      }]}>
        {metrics.map((metric, idx) => (
          <View key={metric.label} style={[
            styles.metricItem,
            idx < metrics.length - 1 && { borderRightWidth: 1, borderRightColor: theme.border },
          ]}>
            <Text style={[styles.metricValue, { color: theme.text }]}>{metric.value}</Text>
            <Text style={[styles.metricLabel, { color: theme.muted }]}>{metric.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.body}>
        <View style={styles.featureList}>
          {features.map((feature) => (
            <View
              key={feature.text}
              style={[
                styles.featureCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  shadowColor: theme.text,
                },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: theme.accentSoft }]}>
                <MaterialIcons color={theme.accent} name={feature.icon as any} size={24} />
              </View>
              <Text style={[styles.featureText, { color: theme.text }]}>{feature.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionContainer}>
          <QuietPrimaryButton label="Create account" onPress={() => router.push("/(auth)/register")} theme={theme} />
          <QuietSecondaryButton label="I already have an account" onPress={() => router.push("/(auth)/login")} theme={theme} />
        </View>
      </View>
    </QuietScreen>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  heroPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  metricPanel: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: Spacing.lg,
    marginTop: 0,
    paddingVertical: Spacing.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
  },
  featureList: {
    gap: Spacing.md,
  },
  featureCard: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  featureIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  actionContainer: {
    gap: Spacing.md,
  }
});
