import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import {
  QuietBanner,
  QuietCard,
  QuietPrimaryButton,
  QuietSecondaryButton,
  QuietScreen,
  QuietSectionHeader,
} from "@/components/ui/quietzone-ui";
import { getTheme, Spacing, Radius } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useThemeContext } from "@/context/theme-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ActivityContent } from "./activity-content";
import { FeedbackContent } from "./feedback-content";

type SettingsTab = "preferences" | "activity" | "feedback";

export default function SettingsScreen() {
  const theme = getTheme(useColorScheme());
  const isDark = theme.page !== "#F5F5F7";
  const { colorScheme, setTheme } = useThemeContext();
  const { logout, saveNotificationDefaults, user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("preferences");
  const [enabled, setEnabled] = useState(true);
  const [notifyOnEnter, setNotifyOnEnter] = useState(true);
  const [notifyOnExit, setNotifyOnExit] = useState(true);
  const [onlyOnFailure, setOnlyOnFailure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "danger">("success");

  useEffect(() => {
    const defaults = user?.notificationDefaults;
    if (!defaults) return;
    setEnabled(defaults.enabled);
    setNotifyOnEnter(defaults.notifyOnEnter);
    setNotifyOnExit(defaults.notifyOnExit);
    setOnlyOnFailure(defaults.onlyOnFailure);
  }, [user?.notificationDefaults]);

  async function handleSave() {
    setBusy(true);
    setMessage("");
    const saved = await saveNotificationDefaults({
      enabled,
      notifyOnEnter,
      notifyOnExit,
      onlyOnFailure,
    });

    if (saved) {
      setMessageTone("success");
      setMessage("Notification defaults updated.");
    } else {
      setMessageTone("danger");
      setMessage("Could not save notification defaults. Try again.");
    }
    setBusy(false);
  }

  return (
    <QuietScreen theme={theme}>
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {(["preferences", "activity", "feedback"] as SettingsTab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              {
                backgroundColor: activeTab === tab ? (isDark ? "#F8F8FA" : "#1C1C1E") : "transparent",
              },
            ]}
          >
            <MaterialIcons 
              color={activeTab === tab ? (isDark ? "#111113" : "#FFFFFF") : theme.icon}
              name={tab === "preferences" ? "settings" : tab === "activity" ? "history" : "rate-review"} 
              size={18} 
            />
            <Text style={[styles.tabLabel, { color: activeTab === tab ? (isDark ? "#111113" : "#FFFFFF") : theme.muted }]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.content}>
        {activeTab === "preferences" && (
          <View style={styles.section}>
            <QuietSectionHeader
              subtitle="Control the default behavior for your quiet zones."
              theme={theme}
              title="Preferences"
            />
            
            <QuietCard theme={theme} style={styles.settingsCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons color={theme.accent} name="notifications" size={22} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Notification defaults</Text>
              </View>

              <View style={styles.optionStack}>
                <SettingRow
                  label="Enable notifications"
                  value={enabled}
                  onValueChange={setEnabled}
                  theme={theme}
                />
                <SettingRow
                  label="Notify on entry"
                  value={notifyOnEnter}
                  onValueChange={setNotifyOnEnter}
                  theme={theme}
                />
                <SettingRow
                  label="Notify on exit"
                  value={notifyOnExit}
                  onValueChange={setNotifyOnExit}
                  theme={theme}
                />
                <SettingRow
                  label="Only notify on failure"
                  hint="Send alerts only when automation is blocked or fails."
                  value={onlyOnFailure}
                  onValueChange={setOnlyOnFailure}
                  theme={theme}
                  last
                />
              </View>

              <QuietPrimaryButton busy={busy} label="Save defaults" onPress={() => void handleSave()} theme={theme} style={styles.saveBtn} />
              {message && <QuietBanner theme={theme} tone={messageTone}>{message}</QuietBanner>}
            </QuietCard>

            <QuietCard theme={theme} style={styles.settingsCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons color={theme.accent} name="palette" size={22} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Appearance</Text>
              </View>
              <SettingRow
                label="Dark mode"
                hint="Use a low-light interface."
                value={colorScheme === "dark"}
                onValueChange={(v) => setTheme(v ? "dark" : "light")}
                theme={theme}
                last
              />
            </QuietCard>

            <QuietCard theme={theme} style={styles.settingsCard}>
              <View style={styles.cardHeader}>
                <MaterialIcons color={theme.accent} name="account-circle" size={22} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>Account</Text>
              </View>
              <Text style={[styles.accountInfo, { color: theme.muted }]}>
                Signed in as <Text style={{ color: theme.text, fontWeight: "700" }}>{user?.email}</Text>
              </Text>
              {user?.role === "admin" ? (
                <QuietSecondaryButton label="Open admin panel" onPress={() => router.push("/admin")} theme={theme} />
              ) : null}
              <QuietSecondaryButton label="Log out" onPress={() => void logout()} theme={theme} />
            </QuietCard>
          </View>
        )}

        {activeTab === "activity" && <ActivityContent />}
        {activeTab === "feedback" && <FeedbackContent />}
      </View>
    </QuietScreen>
  );
}

function SettingRow({ 
  label, 
  hint, 
  value, 
  onValueChange, 
  theme, 
  last 
}: { 
  label: string; 
  hint?: string; 
  value: boolean; 
  onValueChange: (v: boolean) => void; 
  theme: any;
  last?: boolean;
}) {
  return (
    <View style={[styles.optionRow, !last && { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
      <View style={styles.optionCopy}>
        <Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text>
        {hint && <Text style={[styles.optionHint, { color: theme.muted }]}>{hint}</Text>}
      </View>
      <Switch 
        onValueChange={onValueChange} 
        value={value}
        trackColor={{ false: theme.borderStrong, true: theme.page === "#F5F5F7" ? "#1C1C1E" : "#F8F8FA" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: 4,
  },
  tab: {
    alignItems: "center",
    borderRadius: Radius.pill,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  section: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  settingsCard: {
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  optionStack: {
    gap: 0,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    gap: 16,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  optionHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  saveBtn: {
    marginTop: 8,
  },
  accountInfo: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
});
