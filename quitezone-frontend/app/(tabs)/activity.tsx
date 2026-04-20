import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  QuietBanner,
  QuietCard,
  QuietLoadingCard,
  QuietPrimaryButton,
  QuietSecondaryButton,
  QuietScreen,
  QuietSectionHeader,
  QuietStateCard,
} from "@/components/ui/quietzone-ui";
import { getTheme } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { EventItem } from "@/lib/quietzone-types";
import { apiRequest, getUserFacingError } from "@/lib/api";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [manualBusy, setManualBusy] = useState<"enter" | "exit" | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  const loadEvents = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<{ events: EventItem[] }>("/api/events?limit=20", {
        token: accessToken,
      });
      setEvents(response.events);
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents])
  );

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
      await loadEvents();
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
          subtitle="Recent geofence transitions and mode changes across your quiet zones."
          theme={theme}
          title="Activity"
        />

        {!loading && events.length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: theme.text }]}>{events.length}</Text>
            <Text style={[styles.summaryLabel, { color: theme.mutedStrong }]}>captured transitions</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <QuietCard theme={theme}>
          <Text style={[styles.manualTitle, { color: theme.text }]}>Manual transition</Text>
          <Text style={[styles.manualCopy, { color: theme.muted }]}>
            Use this to generate v1 activity events without background automation.
          </Text>
          <View style={styles.manualActions}>
            <QuietPrimaryButton
              busy={manualBusy === "enter"}
              disabled={manualBusy !== null}
              label="Log enter"
              onPress={() => void logManualTransition("enter")}
              theme={theme}
            />
            <QuietSecondaryButton
              busy={manualBusy === "exit"}
              disabled={manualBusy !== null}
              label="Log exit"
              onPress={() => void logManualTransition("exit")}
              theme={theme}
            />
          </View>
          {actionMessage ? <QuietBanner theme={theme}>{actionMessage}</QuietBanner> : null}
        </QuietCard>
        {loading ? (
          <QuietLoadingCard label="Loading recent activity..." theme={theme} />
        ) : error ? (
          <QuietStateCard
            action={<QuietPrimaryButton label="Retry" onPress={() => void loadEvents()} theme={theme} />}
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
        ) : (
          events.map((event) => {
            const isEnter = event.transition === "enter";
            return (
              <QuietCard key={event.id} theme={theme}>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.eventIcon,
                      { backgroundColor: isEnter ? theme.accentSoft : theme.pageAlt },
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
                        {event.zoneName || "Unnamed zone"} {isEnter ? "entered" : "exited"}
                      </Text>
                      <View
                        style={[
                          styles.eventBadge,
                          { backgroundColor: isEnter ? theme.accentSoft : theme.pageAlt },
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
                    <Text style={[styles.description, { color: theme.mutedStrong }]}>
                      Mode changed from {event.previousMode} to {event.modeApplied}.
                    </Text>
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
});
