import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  QuietBanner,
  QuietCard,
  QuietLoadingCard,
  QuietPill,
  QuietPrimaryButton,
  QuietSecondaryButton,
  QuietScreen,
  QuietSectionHeader,
  QuietStateCard,
} from "@/components/ui/quietzone-ui";
import { getTheme } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { EventItem, Zone } from "@/lib/quietzone-types";
import { apiRequest, getUserFacingError } from "@/lib/api";

const REFRESH_TTL_MS = 15000;

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityScreen() {
  const theme = getTheme(useColorScheme());
  const { accessToken } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [manualBusy, setManualBusy] = useState<"enter" | "exit" | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("all");
  const lastLoadedAtRef = useRef(0);

  const loadEvents = useCallback(
    async (force = false) => {
      if (!accessToken) {
        return;
      }

      if (
        !force &&
        (events.length > 0 || zones.length > 0) &&
        Date.now() - lastLoadedAtRef.current < REFRESH_TTL_MS
      ) {
        return;
      }

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
    [accessToken, events.length, zones.length],
  );

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents]),
  );

  const filteredEvents = useMemo(
    () =>
      events.filter(
        (event) => selectedZoneId === "all" || event.zoneId === selectedZoneId,
      ),
    [events, selectedZoneId],
  );

  const blockedCount = filteredEvents.filter(
    (event) => event.metadata?.blocked,
  ).length;
  const appliedCount = filteredEvents.filter(
    (event) => event.metadata?.ringerApplied && !event.metadata?.blocked,
  ).length;
  const manualCount = filteredEvents.filter(
    (event) => event.metadata?.source === "manual-v1",
  ).length;

  async function logManualTransition(transition: "enter" | "exit") {
    if (!accessToken) {
      return;
    }

    setManualBusy(transition);
    setActionMessage("");
    try {
      const body =
        transition === "enter"
          ? {
              transition,
              zoneName: "Manual zone check",
              previousMode: "normal",
              modeApplied: "silent",
              metadata: { source: "manual-v1" },
            }
          : {
              transition,
              zoneName: "Manual zone check",
              previousMode: "silent",
              modeApplied: "normal",
              metadata: { source: "manual-v1" },
            };
      await apiRequest("/api/events/geofence-transition", {
        method: "POST",
        body,
        token: accessToken,
      });
      setActionMessage(`Logged "${transition}" transition.`);
      await loadEvents(true);
    } catch (nextError) {
      setActionMessage(getUserFacingError(nextError));
    } finally {
      setManualBusy(null);
    }
  }

  return (
    <QuietScreen theme={theme}>
      <View style={styles.header}>
        <QuietSectionHeader
          subtitle="Recent zone transitions and mode changes."
          theme={theme}
          title="Activity"
        />

        {!loading && events.length > 0 ? (
          <View style={styles.summaryWrap}>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: theme.text }]}>
                {filteredEvents.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.mutedStrong }]}>
                transitions
              </Text>
            </View>
            <View style={styles.summaryPills}>
              <QuietPill label={`${appliedCount} applied`} theme={theme} />
              <QuietPill
                label={`${blockedCount} blocked`}
                muted={blockedCount === 0}
                theme={theme}
              />
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        {!loading && zones.length > 0 ? (
          <QuietCard theme={theme}>
            <Text style={[styles.manualTitle, { color: theme.text }]}>
              Filter by zone
            </Text>
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => setSelectedZoneId("all")}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedZoneId === "all" ? theme.accent : theme.input,
                    borderColor:
                      selectedZoneId === "all" ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      selectedZoneId === "all"
                        ? theme.accentTextOn
                        : theme.text,
                    fontWeight: "700",
                  }}
                >
                  All zones
                </Text>
              </Pressable>
              {zones.map((zone) => {
                const selected = selectedZoneId === zone.id;
                return (
                  <Pressable
                    key={zone.id}
                    onPress={() => setSelectedZoneId(zone.id)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected ? theme.accent : theme.input,
                        borderColor: selected ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? theme.accentTextOn : theme.text,
                        fontWeight: "700",
                      }}
                    >
                      {zone.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </QuietCard>
        ) : null}

        {loading ? (
          <QuietLoadingCard label="Loading recent activity..." theme={theme} />
        ) : error ? (
          <QuietStateCard
            action={
              <QuietPrimaryButton
                label="Retry"
                onPress={() => void loadEvents(true)}
                theme={theme}
              />
            }
            description={error}
            theme={theme}
            title="Could not load activity"
          />
        ) : events.length === 0 ? (
          <QuietStateCard
            description="As your device enters and exits quiet zones, transitions will appear here with timestamps and mode changes."
            theme={theme}
            title="No events yet"
          />
        ) : filteredEvents.length === 0 ? (
          <QuietStateCard
            description="No activity matches the current zone filter yet."
            theme={theme}
            title="No matching events"
          />
        ) : (
          filteredEvents.map((event) => {
            const isEnter = event.transition === "enter";
            const isBlocked = Boolean(event.metadata?.blocked);
            const isManual = event.metadata?.source === "manual-v1";
            const applied =
              Boolean(event.metadata?.ringerApplied) && !isBlocked;
            const statusLabel = isManual
              ? "manual"
              : isBlocked
                ? "blocked"
                : applied
                  ? "applied"
                  : "logged";
            const statusColor = isBlocked
              ? theme.warning
              : applied
                ? theme.success
                : theme.mutedStrong;

            return (
              <QuietCard key={event.id} theme={theme}>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.eventIcon,
                      {
                        backgroundColor: isEnter
                          ? theme.accentSoft
                          : theme.pageAlt,
                      },
                    ]}
                  >
                    <MaterialIcons
                      color={isEnter ? theme.accent : theme.warning}
                      name={isEnter ? "login" : "logout"}
                      size={22}
                    />
                  </View>
                  <View style={styles.copy}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.title, { color: theme.text }]}>
                        {event.zoneName || "Unnamed zone"}{" "}
                        {isEnter ? "entered" : "exited"}
                      </Text>
                      <View
                        style={[
                          styles.eventBadge,
                          {
                            backgroundColor: isEnter
                              ? theme.accentSoft
                              : theme.pageAlt,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.eventBadgeText,
                            { color: isEnter ? theme.accent : theme.warning },
                          ]}
                        >
                          {event.transition}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.meta, { color: theme.muted }]}>
                      {formatTimestamp(event.triggeredAt)}
                    </Text>
                    <Text
                      style={[styles.description, { color: theme.mutedStrong }]}
                    >
                      Mode changed from {event.previousMode} to{" "}
                      {event.modeApplied}.
                    </Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            borderColor: statusColor,
                            backgroundColor: theme.surfaceStrong,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: statusColor },
                          ]}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                      {event.metadata?.source ? (
                        <Text style={[styles.meta, { color: theme.muted }]}>
                          Source: {String(event.metadata.source)}
                        </Text>
                      ) : null}
                    </View>
                    {event.metadata?.reason ? (
                      <Text
                        style={[styles.reasonText, { color: theme.warning }]}
                      >
                        Reason: {String(event.metadata.reason)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </QuietCard>
            );
          })
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
  summaryCard: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  summaryWrap: {
    gap: 10,
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  summaryPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  content: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  manualCopy: {
    fontSize: 13,
    lineHeight: 19,
  },
  manualActions: {
    gap: 10,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
  },
  eventIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
  },
  eventBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  meta: {
    fontSize: 13,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
