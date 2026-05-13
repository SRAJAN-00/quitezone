import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  QuietCard,
  QuietHero,
  QuietLoadingCard,
  QuietPill,
  QuietPrimaryButton,
  QuietScreen,
  QuietSectionHeader,
  QuietStateCard,
  QuietSecondaryButton,
} from "@/components/ui/quietzone-ui";
import { getTheme } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiRequest, getUserFacingError } from "@/lib/api";
import { EventItem, Zone } from "@/lib/quietzone-types";
import { getSilentAutomationOverview, startSilentAutomationMonitoring } from "@/lib/silent-automation/geofence-runtime";
import { requestSilentAutomationAccess } from "@/lib/silent-automation/native";

const REFRESH_TTL_MS = 15000;

export default function HomeScreen() {
  const router = useRouter();
  const theme = getTheme(useColorScheme());
  const { accessToken, logout, user } = useAuth();
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
  } | null>(null);
  const lastLoadedAtRef = useRef(0);

  const loadDashboard = useCallback(async (force = false) => {
    if (!accessToken) {
      return;
    }

    if (!force && Date.now() - lastLoadedAtRef.current < REFRESH_TTL_MS) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [zoneRes, eventRes, automationOverview] = await Promise.all([
        apiRequest<{ zones: Zone[] }>("/api/zones", { token: accessToken }),
        apiRequest<{ events: EventItem[] }>("/api/events?limit=5", { token: accessToken }),
        getSilentAutomationOverview(),
      ]);

      setZones(zoneRes.zones);
      setEvents(eventRes.events);
      setAutomationInfo({
        canControlRinger: automationOverview.canControlRinger,
        monitoringActive: automationOverview.monitoringActive,
        zoneCount: automationOverview.zoneCount,
        reason: automationOverview.reason,
      });
      lastLoadedAtRef.current = Date.now();
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  async function handleAutomationSetup() {
    setAutomationBusy(true);
    setAutomationMessage("");
    try {
      const access = await requestSilentAutomationAccess();
      if (!access.granted) {
        setAutomationMessage(access.reason || "Grant policy access in Android settings and retry.");
      }

      if (accessToken) {
        await startSilentAutomationMonitoring(accessToken);
      }

      await loadDashboard(true);
      if (access.granted) {
        setAutomationMessage("Automation setup refreshed.");
      }
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
        subtitle="Manage your zones, track recent transitions, and keep automation ready."
        theme={theme}
        title={`Welcome${user ? `, ${user.email.split("@")[0]}` : ""}`}
      >
        <View style={styles.heroPills}>
          <QuietPill label={`${activeZones.length} active zones`} theme={theme} />
          <QuietPill label={`${events.length} recent events`} theme={theme} />
        </View>
      </QuietHero>

      <View style={styles.section}>
        <QuietSectionHeader subtitle="Quick summary for your account." theme={theme} title="Overview" />
        {loading ? (
          <QuietLoadingCard label="Loading dashboard..." theme={theme} />
        ) : error ? (
          <QuietStateCard
            action={<QuietSecondaryButton label="Retry" onPress={() => void loadDashboard(true)} theme={theme} />}
            description={error}
            theme={theme}
            title="Could not load dashboard"
          />
        ) : (
          <View style={styles.statsGrid}>
            <QuietCard theme={theme} style={styles.statCard}>
              <Text style={[styles.statValue, { color: theme.text }]}>{zones.length}</Text>
              <Text style={[styles.statLabel, { color: theme.mutedStrong }]}>Zones</Text>
            </QuietCard>
            <QuietCard theme={theme} style={styles.statCard}>
              <Text style={[styles.statValue, { color: theme.text }]}>{events.length}</Text>
              <Text style={[styles.statLabel, { color: theme.mutedStrong }]}>Recent events</Text>
              <Text style={[styles.statNote, { color: theme.muted }]}>{latestEvent ? latestEvent.transition : "none yet"}</Text>
            </QuietCard>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <QuietSectionHeader subtitle="Android silent/vibrate automation status." theme={theme} title="Automation" />
        <QuietCard theme={theme}>
          <Text style={[styles.statLabel, { color: theme.text }]}>
            Status: {automationInfo?.canControlRinger && automationInfo?.monitoringActive ? "Ready" : "Needs setup"}
          </Text>
          <Text style={[styles.statNote, { color: theme.muted }]}>
            Monitoring: {automationInfo?.monitoringActive ? "Active" : "Inactive"} • Zones synced: {automationInfo?.zoneCount ?? 0}
          </Text>
          <Text style={[styles.statNote, { color: theme.muted }]}>
            {automationInfo?.reason || "Use setup if automation is not switching as expected."}
          </Text>
          <QuietPrimaryButton
            busy={automationBusy}
            label="Setup / Refresh automation"
            onPress={() => void handleAutomationSetup()}
            theme={theme}
          />
          {automationMessage ? <Text style={[styles.statNote, { color: theme.warning }]}>{automationMessage}</Text> : null}
        </QuietCard>
      </View>

      <View style={styles.section}>
        <QuietSectionHeader subtitle="Most-used actions." theme={theme} title="Quick Actions" />
        <View style={styles.actionStack}>
          <QuietPrimaryButton label="Create new zone" onPress={() => router.push("/zone-editor")} theme={theme} />
          <QuietSecondaryButton label="Open zones" onPress={() => router.push("/(tabs)/zones")} theme={theme} />
          <QuietSecondaryButton label="View activity" onPress={() => router.push("/(tabs)/activity")} theme={theme} />
          <QuietSecondaryButton label="Share feedback" onPress={() => router.push("/(tabs)/feedback" as never)} theme={theme} />
        </View>
      </View>

      <View style={styles.section}>
        <QuietSectionHeader subtitle="Session controls." theme={theme} title="Account" />
        <QuietCard theme={theme}>
          <View style={styles.accountRow}>
            <View style={[styles.accountIcon, { backgroundColor: theme.accentSoft }]}>
              <MaterialIcons color={theme.accent} name="verified-user" size={22} />
            </View>
            <View style={styles.accountCopy}>
              <Text style={[styles.accountTitle, { color: theme.text }]}>{user?.email}</Text>
              <Text style={[styles.accountMeta, { color: theme.muted }]}>Signed in as {user?.role}</Text>
            </View>
          </View>
          <QuietSecondaryButton label="Log out" onPress={() => void logout()} theme={theme} />
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
    flex: 1,
    gap: 6,
    minHeight: 120,
    minWidth: "45%",
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
