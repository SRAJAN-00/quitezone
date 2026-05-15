import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  QuietBanner,
  QuietCard,
  QuietLoadingCard,
  QuietPill,
  QuietStateCard,
} from "@/components/ui/quietzone-ui";
import { getTheme, Spacing, Radius } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiRequest, getUserFacingError } from "@/lib/api";
import { EventItem, Zone } from "@/lib/quietzone-types";

const REFRESH_TTL_MS = 15000;

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityContent() {
  const theme = getTheme(useColorScheme());
  const isDark = theme.page !== "#F5F5F7";
  const { accessToken } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("all");
  const lastLoadedAtRef = useRef(0);

  const loadEvents = useCallback(
    async (force = false) => {
      if (!accessToken) return;
      if (!force && (events.length > 0 || zones.length > 0) && Date.now() - lastLoadedAtRef.current < REFRESH_TTL_MS) return;

      setLoading(true);
      setError("");

      try {
        const [eventResponse, zoneResponse] = await Promise.all([
          apiRequest<{ events: EventItem[] }>("/api/events?limit=50", {
            token: accessToken,
          }),
          apiRequest<{ zones: Zone[] }>("/api/zones", {
            token: accessToken,
          }),
        ]);
        setEvents(eventResponse.events);
        setZones(zoneResponse.zones);
        lastLoadedAtRef.current = Date.now();
      } catch (nextError) {
        setError(getUserFacingError(nextError));
      } finally {
        setLoading(false);
      }
    },
    [accessToken, events.length, zones.length]
  );

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

  const filteredEvents = useMemo(
    () => events.filter((event) => selectedZoneId === "all" || event.zoneId === selectedZoneId),
    [events, selectedZoneId]
  );

  const blockedCount = filteredEvents.filter((event) => event.metadata?.blocked).length;

  return (
    <ScrollView
      contentContainerStyle={styles.contentContainer}
      style={[styles.container, { backgroundColor: theme.page }]}
    >
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Activity log</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>Recent transitions and automation events.</Text>
        </View>

        {error ? <QuietBanner theme={theme} tone="danger">{error}</QuietBanner> : null}

        {loading ? (
          <QuietLoadingCard label="Loading activity..." theme={theme} />
        ) : events.length === 0 ? (
          <QuietStateCard
            description="No activity yet. When you enter or exit zones, transitions will appear here."
            theme={theme}
            title="No activity yet"
          />
        ) : (
          <>
            <View style={styles.filterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                <Pressable
                  onPress={() => setSelectedZoneId("all")}
                    style={[
                      styles.filterPill,
                      {
                      backgroundColor: selectedZoneId === "all" ? (isDark ? "#F8F8FA" : "#1C1C1E") : theme.surface,
                      borderColor: selectedZoneId === "all" ? (isDark ? "#F8F8FA" : "#1C1C1E") : theme.border,
                      },
                    ]}
                >
                  <Text style={[styles.filterPillText, { color: selectedZoneId === "all" ? (isDark ? "#111113" : "#FFFFFF") : theme.text }]}>
                    All zones
                  </Text>
                </Pressable>

                {zones.map((zone) => (
                  <Pressable
                    key={zone.id}
                    onPress={() => setSelectedZoneId(zone.id)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: selectedZoneId === zone.id ? (isDark ? "#F8F8FA" : "#1C1C1E") : theme.surface,
                        borderColor: selectedZoneId === zone.id ? (isDark ? "#F8F8FA" : "#1C1C1E") : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.filterPillText, { color: selectedZoneId === zone.id ? (isDark ? "#111113" : "#FFFFFF") : theme.text }]}>
                      {zone.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {filteredEvents.length > 0 ? (
              <View style={styles.statsRow}>
                <QuietPill label={`${filteredEvents.length - blockedCount} successful`} theme={theme} />
                {blockedCount > 0 ? <QuietPill label={`${blockedCount} blocked`} muted theme={theme} /> : null}
              </View>
            ) : null}

            <View style={styles.eventList}>
              {filteredEvents.map((event) => (
                <QuietCard key={event.id} theme={theme} style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <View style={styles.eventCopy}>
                      <Text style={[styles.eventZone, { color: theme.text }]}>{event.zoneName || "Unknown zone"}</Text>
                      <Text style={[styles.eventTransition, { color: theme.muted }]}>
                        {event.transition === "enter" ? "Entered zone" : "Exited zone"}
                      </Text>
                    </View>
                    <Text style={[styles.eventTime, { color: theme.muted }]}>{formatTimestamp(event.triggeredAt)}</Text>
                  </View>

                  <View style={[styles.divider, { backgroundColor: theme.border }]} />

                  <View style={styles.eventDetails}>
                    {event.modeApplied ? (
                      <View style={styles.detailItem}>
                        <View style={[styles.dot, { backgroundColor: theme.success }]} />
                        <Text style={[styles.eventMode, { color: theme.text }]}>
                          Applied: <Text style={{ fontWeight: "700" }}>{event.modeApplied}</Text>
                        </Text>
                      </View>
                    ) : null}
                    {event.metadata?.blocked ? (
                      <View style={styles.detailItem}>
                        <View style={[styles.dot, { backgroundColor: theme.danger }]} />
                        <Text style={[styles.eventBlocked, { color: theme.danger }]}>Automation blocked</Text>
                      </View>
                    ) : null}
                  </View>
                </QuietCard>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

export default ActivityContent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  filterBar: {
    marginVertical: 4,
  },
  filterScroll: {
    gap: 8,
  },
  filterPill: {
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  eventList: {
    gap: Spacing.md,
  },
  eventCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventCopy: {
    gap: 2,
    flex: 1,
  },
  eventZone: {
    fontSize: 16,
    fontWeight: "800",
  },
  eventTransition: {
    fontSize: 13,
    fontWeight: "600",
  },
  eventTime: {
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    width: "100%",
    opacity: 0.3,
  },
  eventDetails: {
    gap: 6,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventMode: {
    fontSize: 13,
    fontWeight: "500",
  },
  eventBlocked: {
    fontSize: 13,
    fontWeight: "700",
  },
});
