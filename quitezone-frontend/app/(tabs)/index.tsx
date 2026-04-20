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

  const activeZones = zones.filter((zone) => zone.isActive);
  const latestEvent = events[0];

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
        </View>
      </QuietHero>

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
  accountTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  accountMeta: {
    fontSize: 14,
  },
});
