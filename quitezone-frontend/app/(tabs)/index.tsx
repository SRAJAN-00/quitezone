import * as Location from "expo-location";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  QuietCard,
  QuietHero,
  QuietLoadingCard,
  QuietPill,
  QuietPrimaryButton,
  QuietScreen,
  QuietSecondaryButton,
  QuietSectionHeader,
  QuietStateCard,
} from "@/components/ui/quietzone-ui";
import { getTheme } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { EventItem, Zone } from "@/lib/quietzone-types";
import { apiRequest, getUserFacingError } from "@/lib/api";
import { loadOnboardingDismissed, saveOnboardingDismissed } from "@/lib/onboarding-storage";
import { getSilentAutomationOverview, startSilentAutomationMonitoring } from "@/lib/silent-automation/geofence-runtime";
import { requestSilentAutomationAccess } from "@/lib/silent-automation/native";

export default function HomeScreen() {
  const router = useRouter();
  const theme = getTheme(useColorScheme());
  const { accessToken, apiBaseUrl, logout, user } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [automationBusy, setAutomationBusy] = useState(false);
  const [automationMessage, setAutomationMessage] = useState("");
  const [locationReady, setLocationReady] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [automationInfo, setAutomationInfo] = useState<{
    canControlRinger: boolean;
    monitoringActive: boolean;
    zoneCount: number;
    reason?: string | null;
    lastResult: {
      timestamp: string;
      transition: "enter" | "exit";
      zoneName: string;
      modeRequested: "silent" | "vibrate" | "normal";
      applied: boolean;
      blocked: boolean;
      reason?: string | null;
    } | null;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [zoneRes, eventRes] = await Promise.all([
        apiRequest<{ zones: Zone[] }>("/api/zones", { token: accessToken }),
        apiRequest<{ events: EventItem[] }>("/api/events?limit=5", {
          token: accessToken,
        }),
      ]);

      setZones(zoneRes.zones);
      setEvents(eventRes.events);
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadAutomationOverview() {
        const info = await getSilentAutomationOverview();
        if (!active) {
          return;
        }
        setAutomationInfo({
          canControlRinger: info.canControlRinger,
          monitoringActive: info.monitoringActive,
          zoneCount: info.zoneCount,
          reason: info.reason,
          lastResult: info.lastResult,
        });
      }

      void loadAutomationOverview();
      return () => {
        active = false;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadSetupState() {
        if (!user?.id) {
          return;
        }

        const [foreground, background, dismissed] = await Promise.all([
          Location.getForegroundPermissionsAsync(),
          Location.getBackgroundPermissionsAsync(),
          loadOnboardingDismissed(user.id),
        ]);

        if (!active) {
          return;
        }

        setLocationReady(foreground.status === "granted" && background.status === "granted");
        setSetupDismissed(dismissed);
      }

      void loadSetupState();

      return () => {
        active = false;
      };
    }, [user?.id])
  );

  async function handleAutomationSetup() {
    setAutomationBusy(true);
    setAutomationMessage("");
    try {
      const access = await requestSilentAutomationAccess();
      if (!access.granted) {
        setAutomationMessage(access.reason || "Grant policy access in Android settings, then return.");
      } else {
        setAutomationMessage("Policy access is enabled.");
      }

      if (accessToken) {
        await startSilentAutomationMonitoring(accessToken);
      }
      const info = await getSilentAutomationOverview();
      setAutomationInfo({
        canControlRinger: info.canControlRinger,
        monitoringActive: info.monitoringActive,
        zoneCount: info.zoneCount,
        reason: info.reason,
        lastResult: info.lastResult,
      });
    } catch (nextError) {
      setAutomationMessage(getUserFacingError(nextError));
    } finally {
      setAutomationBusy(false);
    }
  }

  async function handleLocationSetup() {
    const foreground = await Location.requestForegroundPermissionsAsync();
    const background = await Location.requestBackgroundPermissionsAsync();
    setLocationReady(foreground.status === "granted" && background.status === "granted");
  }

  async function dismissSetupChecklist() {
    if (!user?.id) {
      return;
    }

    await saveOnboardingDismissed(user.id, true);
    setSetupDismissed(true);
  }

  async function restoreSetupChecklist() {
    if (!user?.id) {
      return;
    }

    await saveOnboardingDismissed(user.id, false);
    setSetupDismissed(false);
  }

  const activeZones = zones.filter((zone) => zone.isActive);
  const latestEvent = events[0];
  const setupItems = [
    {
      key: "location",
      done: locationReady,
      title: "Allow location access",
      description: "QuietZone needs foreground and background location to react when you arrive.",
      actionLabel: "Enable location",
      onPress: () => void handleLocationSetup(),
      busy: false,
    },
    {
      key: "automation",
      done: Boolean(automationInfo?.canControlRinger && automationInfo?.monitoringActive),
      title: "Finish automation setup",
      description: "Grant Android policy access so the phone can switch to silent or vibrate in a zone.",
      actionLabel: "Setup automation",
      onPress: () => void handleAutomationSetup(),
      busy: automationBusy,
    },
    {
      key: "zone",
      done: zones.length > 0,
      title: "Create your first zone",
      description: "Place one real-world space on the map so QuietZone has something to monitor.",
      actionLabel: "Create zone",
      onPress: () => router.push("/zone-editor"),
      busy: false,
    },
  ];
  const setupCompletedCount = setupItems.filter((item) => item.done).length;
  const showSetupChecklist = !setupDismissed && setupCompletedCount < setupItems.length;

  return (
    <QuietScreen theme={theme}>
      <QuietHero
        eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        subtitle="Review your current zone coverage and keep your automations aligned with the places that matter."
        theme={theme}
        title={`Good morning${user ? `, ${user.email.split("@")[0]}` : ""}!`}
      >
        <View style={styles.heroPills}>
          <QuietPill
            label={`${activeZones.length} active zones`}
            theme={theme}
          />
          <QuietPill label={`${events.length} recent events`} theme={theme} />
          {showSetupChecklist ? (
            <QuietPill label={`${setupCompletedCount}/${setupItems.length} setup steps`} muted theme={theme} />
          ) : null}
        </View>
      </QuietHero>

      {showSetupChecklist ? (
        <View style={styles.section}>
          <QuietSectionHeader
            subtitle="Finish these once so the app can automate reliably in the background."
            theme={theme}
            title="Getting Started"
          />
          <QuietCard theme={theme}>
            {setupItems.map((item) => (
              <View key={item.key} style={styles.setupItem}>
                <View style={styles.setupCopy}>
                  <Text style={[styles.statLabel, { color: theme.text }]}>
                    {item.done ? "Done" : "Next"}: {item.title}
                  </Text>
                  <Text style={[styles.statNote, { color: theme.muted }]}>
                    {item.description}
                  </Text>
                </View>
                {item.done ? (
                  <QuietPill label="Ready" theme={theme} />
                ) : (
                  <QuietSecondaryButton
                    busy={item.busy}
                    disabled={item.busy}
                    label={item.actionLabel}
                    onPress={item.onPress}
                    theme={theme}
                  />
                )}
              </View>
            ))}
            <QuietSecondaryButton
              label="Dismiss checklist"
              onPress={() => void dismissSetupChecklist()}
              theme={theme}
            />
          </QuietCard>
        </View>
      ) : setupCompletedCount < setupItems.length ? (
        <View style={styles.section}>
          <QuietSectionHeader
            subtitle="Bring the setup guide back if you want the app to walk you through the remaining steps."
            theme={theme}
            title="Setup Guide"
          />
          <QuietCard theme={theme}>
            <Text style={[styles.statNote, { color: theme.muted }]}>
              You can restore the getting-started checklist anytime from here.
            </Text>
            <QuietSecondaryButton
              label="Show checklist again"
              onPress={() => void restoreSetupChecklist()}
              theme={theme}
            />
          </QuietCard>
        </View>
      ) : null}

      <View style={styles.section}>
        <QuietSectionHeader
          subtitle="Quick status across your session, API, and zone coverage."
          theme={theme}
          title="Overview"
        />

        {loading ? (
          <QuietLoadingCard
            label="Refreshing your dashboard..."
            theme={theme}
          />
        ) : error ? (
          <QuietStateCard
            action={
              <QuietSecondaryButton
                label="Retry"
                onPress={() => void loadDashboard()}
                theme={theme}
              />
            }
            description={`${error}\nAPI target: ${apiBaseUrl}`}
            theme={theme}
            title="Could not load dashboard"
          />
        ) : (
          <View style={styles.statsGrid}>
            <QuietCard theme={theme} style={styles.statCard}>
              <View>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {zones.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.mutedStrong }]}>
                  Zones created
                </Text>
              </View>
              <Text style={[styles.statNote, { color: theme.accent }]}>
                {activeZones.length} currently active
              </Text>
            </QuietCard>

            <QuietCard theme={theme} style={styles.statCard}>
              <View>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {events.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.mutedStrong }]}>
                  Recent events
                </Text>
              </View>
              <Text style={[styles.statNote, { color: theme.muted }]} numberOfLines={1}>
                {latestEvent ? latestEvent.transition : "none yet"}
              </Text>
            </QuietCard>

            <QuietCard theme={theme} style={[styles.statCard, styles.statCardFull]}>
              <View style={styles.apiTargetRow}>
                <View style={styles.apiTargetCopy}>
                  <Text style={[styles.statLabel, { color: theme.mutedStrong }]}>
                    API Target
                  </Text>
                  <Text
                    style={[styles.statNote, { color: theme.muted, marginTop: 2 }]}
                    numberOfLines={1}
                  >
                    {apiBaseUrl}
                  </Text>
                </View>
                <QuietPill label="Live" theme={theme} />
              </View>
            </QuietCard>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <QuietSectionHeader
          subtitle="Android-only automation setup for silent mode on zone entry."
          theme={theme}
          title="Silent Automation"
        />
        <QuietCard theme={theme}>
          <Text style={[styles.statLabel, { color: theme.mutedStrong }]}>
            Control status: {automationInfo?.canControlRinger ? "Enabled" : "Needs setup"}
          </Text>
          <Text style={[styles.statNote, { color: theme.muted }]}>
            Monitoring: {automationInfo?.monitoringActive ? "Active" : "Not active"} • Zones synced: {automationInfo?.zoneCount ?? 0}
          </Text>
          <Text style={[styles.statNote, { color: theme.muted }]}>
            {automationInfo?.reason || "If setup is complete, entering a zone will apply silent/vibrate."}
          </Text>
          {automationInfo?.lastResult ? (
            <Text style={[styles.statNote, { color: theme.muted }]}>
              Last transition: {automationInfo.lastResult.transition} {automationInfo.lastResult.zoneName} ({automationInfo.lastResult.modeRequested}) at{" "}
              {new Date(automationInfo.lastResult.timestamp).toLocaleTimeString()}.
            </Text>
          ) : null}
          <QuietPrimaryButton
            busy={automationBusy}
            label="Setup / Refresh automation"
            onPress={() => void handleAutomationSetup()}
            theme={theme}
          />
          {automationMessage ? (
            <Text style={[styles.statNote, { color: theme.warning }]}>{automationMessage}</Text>
          ) : null}
        </QuietCard>
      </View>

      <View style={styles.section}>
        <QuietSectionHeader
          subtitle="The fastest way to shape your quiet-zone setup."
          theme={theme}
          title="Quick actions"
        />
        <View style={styles.actionStack}>
          <QuietPrimaryButton
            label="Create a new zone"
            onPress={() => router.push("/zone-editor")}
            theme={theme}
          />
          <QuietSecondaryButton
            label="Open zone library"
            onPress={() => router.push("/(tabs)/zones")}
            theme={theme}
          />
          <QuietSecondaryButton
            label="Review event history"
            onPress={() => router.push("/(tabs)/activity")}
            theme={theme}
          />
        </View>
      </View>

      <View style={styles.section}>
        <QuietSectionHeader
          subtitle="Identity and session controls."
          theme={theme}
          title="Account"
        />
        <QuietCard theme={theme}>
          <View style={styles.accountRow}>
            <View
              style={[
                styles.accountIcon,
                { backgroundColor: theme.accentSoft },
              ]}
            >
              <MaterialIcons
                color={theme.accent}
                name="verified-user"
                size={22}
              />
            </View>
            <View style={styles.accountCopy}>
              <Text style={[styles.accountTitle, { color: theme.text }]}>
                {user?.email}
              </Text>
              <Text style={[styles.accountMeta, { color: theme.muted }]}>
                Signed in as {user?.role}
              </Text>
            </View>
          </View>
          <QuietSecondaryButton
            label="Log out"
            onPress={() => void logout()}
            theme={theme}
          />
        </QuietCard>
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
  section: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    minHeight: 140,
    flex: 1,
    minWidth: "45%",
    justifyContent: "space-between",
  },
  statCardFull: {
    minHeight: 80,
    width: "100%",
    justifyContent: "center",
  },
  apiTargetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  apiTargetCopy: {
    flex: 1,
    paddingRight: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  statNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionStack: {
    gap: 12,
  },
  accountRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  accountIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  accountCopy: {
    flex: 1,
    gap: 4,
  },
  setupItem: {
    gap: 12,
  },
  setupCopy: {
    gap: 6,
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  accountMeta: {
    fontSize: 14,
  },
});
