import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  QuietBanner,
  QuietCard,
  QuietPill,
  QuietPrimaryButton,
  QuietScreen,
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
  const { accessToken, user } = useAuth();
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
  const username = user?.email.split("@")[0] ?? "there";
  const automationReady = !!(automationInfo?.canControlRinger && automationInfo?.monitoringActive);

  return (
    <QuietScreen theme={theme}>
      <View style={styles.root}>
        <View style={styles.hero}>
          <Text style={[styles.heroDate, { color: theme.muted }]}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
          <Text style={[styles.heroTitle, { color: theme.text }]}>
            Welcome back,{"\n"}
            <Text style={styles.heroAccent}>{username}</Text>
          </Text>
          <Text style={[styles.heroSub, { color: theme.muted }]}>
            Manage zones, track transitions, keep automation ready.
          </Text>
          <View style={styles.heroPills}>
            <QuietPill label={`${activeZones.length} active zones`} muted theme={theme} />
            <QuietPill label={`${events.length} recent events`} muted theme={theme} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
          <View style={styles.overviewRow}>
            <QuietCard theme={theme} style={styles.card}>
              <Text style={[styles.cardNum, { color: theme.text }]}>{loading ? "0" : zones.length}</Text>
              <Text style={[styles.cardLabel, { color: theme.muted }]}>Zones</Text>
            </QuietCard>
            <QuietCard theme={theme} style={styles.card}>
              <Text style={[styles.cardNum, { color: theme.text }]}>{loading ? "0" : events.length}</Text>
              <Text style={[styles.cardLabel, { color: theme.muted }]}>Recent Events</Text>
            </QuietCard>
          </View>
          {error ? (
            <View style={styles.errorWrap}>
              <QuietBanner theme={theme} tone="danger">{error}</QuietBanner>
              <QuietSecondaryButton label="Retry" onPress={() => void loadDashboard(true)} theme={theme} />
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Automation</Text>
          <QuietCard theme={theme}>
            <View style={styles.autoTop}>
              <Text style={[styles.autoTitle, { color: theme.text }]}>Silent / Vibrate</Text>
              <View style={[styles.badge, { backgroundColor: automationReady ? "#DCFCE7" : "#FFF3CD" }]}>
                <Text style={[styles.badgeText, { color: automationReady ? "#15803D" : "#B45309" }]}>
                  {automationReady ? "Ready" : "Needs setup"}
                </Text>
              </View>
            </View>
            <Text style={[styles.autoMeta, { color: theme.muted }]}>
              Monitoring: {automationInfo?.monitoringActive ? "Active" : "Inactive"} · Zones synced: {automationInfo?.zoneCount ?? 0}
            </Text>
            <Text style={[styles.autoMeta, { color: theme.muted }]}>
              {automationInfo?.reason || "Notification policy access not granted"}
            </Text>
            <QuietPrimaryButton
              busy={automationBusy}
              label="Set up automation"
              onPress={() => void handleAutomationSetup()}
              theme={theme}
            />
            {automationMessage ? <Text style={[styles.autoMeta, { color: theme.warning }]}>{automationMessage}</Text> : null}
          </QuietCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.actions}>
            <QuietPrimaryButton label="Create new zone" onPress={() => router.push("/zone-editor")} theme={theme} />
            <QuietSecondaryButton label="Open zones" onPress={() => router.push("/(tabs)/zones")} theme={theme} />
            <QuietSecondaryButton label="Open settings" onPress={() => router.push("/(tabs)/settings")} theme={theme} />
          </View>
        </View>
      </View>
    </QuietScreen>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: "100%",
    paddingBottom: 16,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  heroDate: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 34,
    marginBottom: 4,
  },
  heroAccent: {
    color: "#7C3AED",
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  heroPills: {
    flexDirection: "row",
    gap: 8,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  overviewRow: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  cardNum: {
    fontSize: 36,
    fontWeight: "600",
    lineHeight: 38,
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  autoTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  autoTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  autoMeta: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  actions: {
    gap: 10,
  },
  errorWrap: {
    gap: 10,
    marginTop: 10,
  },
});
