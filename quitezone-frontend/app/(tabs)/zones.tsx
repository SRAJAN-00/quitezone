import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  QuietCard,
  QuietLoadingCard,
  QuietPill,
  QuietPrimaryButton,
  QuietScreen,
  QuietSectionHeader,
  QuietStateCard,
} from "@/components/ui/quietzone-ui";
import { getTheme } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Zone } from "@/lib/quietzone-types";
import { apiRequest, getUserFacingError } from "@/lib/api";
import { getZoneScheduleSummary } from "@/lib/zone-schedule";

const REFRESH_TTL_MS = 15000;
const DEFAULT_NOTIFICATIONS = {
  enabled: true,
  notifyOnEnter: true,
  notifyOnExit: true,
  onlyOnFailure: false,
};

function getNotificationBadgeLabels(zone: Zone) {
  const notifications = {
    ...DEFAULT_NOTIFICATIONS,
    ...(zone.notifications || {}),
  };

  if (!notifications.enabled) {
    return ["Alerts off"];
  }

  if (notifications.onlyOnFailure) {
    return ["Failures only"];
  }

  if (notifications.notifyOnEnter && notifications.notifyOnExit) {
    return ["Enter + Exit alerts"];
  }

  if (notifications.notifyOnEnter) {
    return ["Enter alerts"];
  }

  if (notifications.notifyOnExit) {
    return ["Exit alerts"];
  }

  return ["Alerts off"];
}

function getModeLabel(mode: Zone["targetMode"]) {
  return mode === "silent" ? "Silent mode" : "Vibrate mode";
}

export default function ZonesScreen() {
  const router = useRouter();
  const theme = getTheme(useColorScheme());
  const { accessToken } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastLoadedAtRef = useRef(0);
  const activeCount = zones.filter((zone) => zone.isActive).length;

  const loadZones = useCallback(async (force = false) => {
    if (!accessToken) {
      return;
    }

    if (!force && zones.length > 0 && Date.now() - lastLoadedAtRef.current < REFRESH_TTL_MS) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<{ zones: Zone[] }>("/api/zones", {
        token: accessToken,
      });
      setZones(response.zones);
      lastLoadedAtRef.current = Date.now();
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, zones.length]);

  useFocusEffect(
    useCallback(() => {
      void loadZones();
    }, [loadZones])
  );

  return (
    <QuietScreen theme={theme}>
      <View style={styles.header}>
        <View style={[styles.heroPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <QuietSectionHeader
            subtitle="Create, review, and edit the spaces where QuietZone should take over."
            theme={theme}
            title="Zones"
          />
            <View style={styles.heroActions}>
              <QuietPrimaryButton label="Create zone" onPress={() => router.push("/zone-editor")} theme={theme} />
              <Text style={[styles.heroHint, { color: theme.mutedStrong }]}>
                Keep your key spaces covered. Tap any zone to edit it.
              </Text>
            </View>

          {!loading && !error && zones.length > 0 ? (
            <View style={styles.summaryRow}>
              <QuietPill label={`${zones.length} total`} theme={theme} />
              <QuietPill label={`${activeCount} active`} theme={theme} />
              <QuietPill
                label={`${zones.length - activeCount} paused`}
                muted
                theme={theme}
              />
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.content}>
        {loading ? (
          <QuietLoadingCard label="Loading your zone library..." theme={theme} />
        ) : error ? (
          <QuietStateCard
            action={<QuietPrimaryButton label="Retry" onPress={() => void loadZones(true)} theme={theme} />}
            description={error}
            theme={theme}
            title="Could not load zones"
          />
        ) : zones.length === 0 ? (
          <QuietStateCard
            action={<QuietPrimaryButton label="Create your first zone" onPress={() => router.push("/zone-editor")} theme={theme} />}
            description="Start with the map-based editor to place your first quiet zone and choose how the phone should behave there."
            theme={theme}
            title="No zones yet"
          />
        ) : (
          zones.map((zone) => (
            <Pressable key={zone.id} onPress={() => router.push({ pathname: "/zone-editor", params: { id: zone.id } })}>
              {({ pressed }) => (
                <QuietCard theme={theme} style={{ opacity: pressed ? 0.88 : 1 }}>
                  <View style={styles.zoneHeader}>
                    <View style={[styles.zoneIcon, { backgroundColor: theme.surfaceStrong }]}>
                      <MaterialIcons
                        color={theme.mutedStrong}
                        name={zone.targetMode === "silent" ? "notifications-off" : "vibration"}
                        size={22}
                      />
                    </View>
                    <View style={styles.zoneCopy}>
                      <View style={styles.zoneTitleRow}>
                        <Text style={[styles.zoneTitle, { color: theme.text }]}>{zone.name}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: zone.isActive ? "#DCFCE7" : theme.surfaceStrong,
                              borderColor: zone.isActive ? "#16A34A" : theme.borderStrong,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusLabel,
                              { color: zone.isActive ? "#15803D" : theme.mutedStrong },
                            ]}
                          >
                            {zone.isActive ? "Active" : "Paused"}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.zoneMeta, { color: theme.muted }]}>
                        {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                      </Text>
                      <Text style={[styles.zoneMeta, { color: theme.muted }]}>
                        {getZoneScheduleSummary(zone.schedule)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pills}>
                    <QuietPill label={`${zone.radiusMeters}m`} theme={theme} />
                    <QuietPill label={getModeLabel(zone.targetMode)} theme={theme} />
                  </View>
                  <View style={styles.pills}>
                    {getNotificationBadgeLabels(zone).map((label) => (
                      <QuietPill key={`${zone.id}-${label}`} label={label} muted theme={theme} />
                    ))}
                  </View>

                  <View style={styles.footerRow}>
                    <Text style={[styles.footerLabel, { color: theme.muted }]}>Tap to edit zone details</Text>
                    <MaterialIcons color={theme.mutedStrong} name="chevron-right" size={20} />
                  </View>
                </QuietCard>
              )}
            </Pressable>
          ))
        )}
      </View>
    </QuietScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroPanel: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  heroActions: {
    gap: 8,
  },
  heroHint: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  content: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  zoneHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  zoneIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  zoneCopy: {
    flex: 1,
    gap: 4,
  },
  zoneTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  zoneTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  zoneMeta: {
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
