import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

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
import { apiRequest, getUserFacingError } from "@/lib/api";
import { EventItem } from "@/lib/quietzone-types";

const REFRESH_TTL_MS = 15000;

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPushStatus(event: EventItem) {
  const push = event.metadata?.push;
  if (!push) {
    return {
      label: "Not recorded",
      tone: "muted" as const,
      detail: "No push data was recorded for this event.",
    };
  }

  if (push.sent > 0 && push.failed > 0) {
    return {
      label: "Partially sent",
      tone: "warning" as const,
      detail: `${push.sent} sent, ${push.failed} failed.`,
    };
  }

  if (push.sent > 0 && push.failed === 0) {
    return {
      label: "Sent",
      tone: "success" as const,
      detail: `${push.sent} delivered to device token(s).`,
    };
  }

  if (push.failed > 0) {
    return {
      label: "Failed",
      tone: "danger" as const,
      detail: `${push.failed} failed.`,
    };
  }

  return {
    label: "Skipped",
    tone: "muted" as const,
    detail: push.reason || "Push was skipped by policy or config.",
  };
}

export default function NotificationsScreen() {
  const theme = getTheme(useColorScheme());
  const { accessToken } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const lastLoadedAtRef = useRef(0);

  const loadHistory = useCallback(async (force = false) => {
    if (!accessToken) {
      return;
    }

    if (!force && events.length > 0 && Date.now() - lastLoadedAtRef.current < REFRESH_TTL_MS) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<{ events: EventItem[] }>("/api/events?limit=60", {
        token: accessToken,
      });
      setEvents(response.events);
      lastLoadedAtRef.current = Date.now();
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, events.length]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  const sentCount = events.filter((event) => (event.metadata?.push?.sent || 0) > 0).length;
  const skippedCount = events.filter(
    (event) => (event.metadata?.push?.sent || 0) === 0 && (event.metadata?.push?.failed || 0) === 0
  ).length;
  const failedCount = events.filter((event) => (event.metadata?.push?.failed || 0) > 0).length;

  return (
    <QuietScreen theme={theme}>
      <View style={styles.header}>
        <QuietSectionHeader
          subtitle="Push outcomes for recent zone transitions."
          theme={theme}
          title="Notifications"
        />
        {!loading && events.length > 0 ? (
          <View style={styles.summaryPills}>
            <QuietPill label={`${sentCount} sent`} theme={theme} />
            <QuietPill label={`${skippedCount} skipped`} muted theme={theme} />
            <QuietPill label={`${failedCount} failed`} muted={failedCount === 0} theme={theme} />
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        {loading ? (
          <QuietLoadingCard label="Loading notification history..." theme={theme} />
        ) : error ? (
          <QuietStateCard
            action={<QuietPrimaryButton label="Retry" onPress={() => void loadHistory(true)} theme={theme} />}
            description={error}
            theme={theme}
            title="Could not load notification history"
          />
        ) : events.length === 0 ? (
          <QuietStateCard
            description="No notification outcomes yet. Trigger zone transitions to build history."
            theme={theme}
            title="No notification history"
          />
        ) : (
          events.map((event) => {
            const status = getPushStatus(event);
            const statusColor =
              status.tone === "success"
                ? theme.success
                : status.tone === "warning"
                ? theme.warning
                : status.tone === "danger"
                ? theme.danger
                : theme.mutedStrong;

            return (
              <QuietCard key={event.id} theme={theme}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: theme.accentSoft }]}>
                    <MaterialIcons color={theme.accent} name="notifications-active" size={20} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={[styles.title, { color: theme.text }]}>
                      {event.zoneName || "Unnamed zone"} - {event.transition}
                    </Text>
                    <Text style={[styles.meta, { color: theme.muted }]}>{formatTimestamp(event.triggeredAt)}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{status.label}</Text>
                      </View>
                      <Text style={[styles.meta, { color: theme.mutedStrong }]}>{status.detail}</Text>
                    </View>
                    {event.metadata?.push?.reason ? (
                      <Text style={[styles.reason, { color: theme.warning }]}>Reason: {event.metadata.push.reason}</Text>
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
  summaryPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  content: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  reason: {
    fontSize: 13,
    lineHeight: 18,
  },
});
