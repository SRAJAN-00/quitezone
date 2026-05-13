import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  QuietCard,
  QuietLoadingCard,
  QuietPill,
  QuietPrimaryButton,
  QuietScreen,
  QuietSectionHeader,
  QuietSecondaryButton,
  QuietStateCard,
} from "@/components/ui/quietzone-ui";
import { getTheme } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiRequest, getUserFacingError } from "@/lib/api";
import {
  AdminAnalytics,
  AdminEvent,
  AdminUser,
  AdminZone,
} from "@/lib/quietzone-types";

const REFRESH_TTL_MS = 15000;

type AdminOverviewResponse = {
  counts: {
    users: number;
    zones: number;
    events: number;
  };
  analytics: AdminAnalytics;
  recentUsers: AdminUser[];
  recentZones: AdminZone[];
  recentEvents: AdminEvent[];
};

function formatTimestamp(timestamp?: string) {
  if (!timestamp) {
    return "Unknown";
  }
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryMetric({
  label,
  value,
  theme,
}: {
  label: string;
  value: number;
  theme: ReturnType<typeof getTheme>;
}) {
  return (
    <View
      style={[
        styles.summaryMetric,
        { borderColor: theme.overlay, backgroundColor: theme.overlay },
      ]}
    >
      <Text style={[styles.summaryMetricValue, { color: theme.accentTextOn }]}>
        {value}
      </Text>
      <Text style={[styles.summaryMetricLabel, { color: theme.accentTextOn }]}>
        {label}
      </Text>
    </View>
  );
}

function InsightPanel({
  title,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  theme,
}: {
  title: string;
  primaryLabel: string;
  primaryValue: number;
  secondaryLabel: string;
  secondaryValue: number;
  theme: ReturnType<typeof getTheme>;
}) {
  return (
    <View
      style={[
        styles.insightPanel,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.insightTitle, { color: theme.text }]}>{title}</Text>
      <View style={styles.insightValues}>
        <View style={styles.insightValueBlock}>
          <Text style={[styles.insightValue, { color: theme.text }]}>
            {primaryValue}
          </Text>
          <Text style={[styles.insightLabel, { color: theme.mutedStrong }]}>
            {primaryLabel}
          </Text>
        </View>
        <View
          style={[styles.insightDivider, { backgroundColor: theme.border }]}
        />
        <View style={styles.insightValueBlock}>
          <Text style={[styles.insightValue, { color: theme.text }]}>
            {secondaryValue}
          </Text>
          <Text style={[styles.insightLabel, { color: theme.mutedStrong }]}>
            {secondaryLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

function AnalyticsMiniBar({
  color,
  label,
  value,
  maxValue,
  theme,
}: {
  color: string;
  label: string;
  value: number;
  maxValue: number;
  theme: ReturnType<typeof getTheme>;
}) {
  const ratio = maxValue > 0 ? value / maxValue : 0;

  return (
    <View style={styles.barColumn}>
      <Text style={[styles.barValue, { color: theme.text }]}>{value}</Text>
      <View
        style={[
          styles.barTrack,
          { backgroundColor: theme.pageAlt, borderColor: theme.border },
        ]}
      >
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: color,
              height: `${Math.max(ratio * 100, value > 0 ? 12 : 0)}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.barLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const theme = getTheme(useColorScheme());
  const { accessToken, isAuthenticated, isHydrating, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const lastLoadedAtRef = useRef(0);
  const dailyActivity = overview?.analytics.recentDailyActivity ?? [];
  const maxDailyEvents = dailyActivity.reduce(
    (max, day) => Math.max(max, day.events),
    0,
  );
  const totalWeeklyUsers = dailyActivity.reduce(
    (sum, day) => sum + day.users,
    0,
  );
  const totalWeeklyZones = dailyActivity.reduce(
    (sum, day) => sum + day.zones,
    0,
  );
  const totalWeeklyEvents = dailyActivity.reduce(
    (sum, day) => sum + day.events,
    0,
  );

  const loadAdminData = useCallback(
    async (force = false) => {
      if (!accessToken || user?.role !== "admin") {
        setOverview(null);
        setUsers([]);
        setLoading(false);
        return;
      }

      if (
        !force &&
        overview &&
        users.length > 0 &&
        Date.now() - lastLoadedAtRef.current < REFRESH_TTL_MS
      ) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [overviewRes, usersRes] = await Promise.all([
          apiRequest<AdminOverviewResponse>("/api/admin/overview", {
            token: accessToken,
          }),
          apiRequest<{ users: AdminUser[] }>("/api/admin/users", {
            token: accessToken,
          }),
        ]);

        setOverview(overviewRes);
        setUsers(usersRes.users);
        lastLoadedAtRef.current = Date.now();
      } catch (nextError) {
        setError(getUserFacingError(nextError));
      } finally {
        setLoading(false);
      }
    },
    [accessToken, overview, user?.role, users.length],
  );

  useFocusEffect(
    useCallback(() => {
      void loadAdminData();
    }, [loadAdminData]),
  );

  async function updateUserRole(
    targetUser: AdminUser,
    nextRole: "user" | "admin",
  ) {
    if (!accessToken) {
      return;
    }

    setBusyUserId(targetUser.id);
    setError("");

    try {
      await apiRequest(`/api/admin/users/${targetUser.id}/role`, {
        method: "PATCH",
        token: accessToken,
        body: { role: nextRole },
      });
      await loadAdminData(true);
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setBusyUserId(null);
    }
  }

  if (isHydrating) {
    return <QuietLoadingCard label="Checking admin session..." theme={theme} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (user?.role !== "admin") {
    return (
      <QuietScreen theme={theme}>
        <View style={styles.section}>
          <QuietStateCard
            description="This area is available only to admin users."
            theme={theme}
            title="Admin Access Required"
          />
        </View>
      </QuietScreen>
    );
  }

  return (
    <QuietScreen theme={theme}>
      <View style={styles.section}>
        {loading ? (
          <QuietLoadingCard label="Loading admin overview..." theme={theme} />
        ) : error ? (
          <QuietStateCard
            action={
              <QuietPrimaryButton
                label="Retry"
                onPress={() => void loadAdminData(true)}
                theme={theme}
              />
            }
            description={error}
            theme={theme}
            title="Could not load admin data"
          />
        ) : overview ? (
          <>
            <QuietCard
              theme={theme}
              style={[
                styles.heroCard,
                { backgroundColor: theme.accent, borderColor: theme.accent },
              ]}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroCopy}>
                  <Text
                    style={[styles.heroEyebrow, { color: theme.accentTextOn }]}
                  >
                    SYSTEM OVERVIEW
                  </Text>
                  <Text
                    style={[styles.heroTitle, { color: theme.accentTextOn }]}
                  >
                    Users, zones, and activity
                  </Text>
                </View>
              </View>
              <View style={styles.summaryMetricsRow}>
                <SummaryMetric
                  label="Users"
                  theme={theme}
                  value={overview.counts.users}
                />
                <SummaryMetric
                  label="Zones"
                  theme={theme}
                  value={overview.counts.zones}
                />
                <SummaryMetric
                  label="Events"
                  theme={theme}
                  value={overview.counts.events}
                />
              </View>
            </QuietCard>

            <View style={styles.analyticsGrid}>
              <InsightPanel
                primaryLabel="active"
                primaryValue={overview.analytics.zoneStatus.active}
                secondaryLabel="paused"
                secondaryValue={overview.analytics.zoneStatus.paused}
                theme={theme}
                title="Zone Status"
              />
              <InsightPanel
                primaryLabel="admins"
                primaryValue={overview.analytics.roleBreakdown.admin}
                secondaryLabel="members"
                secondaryValue={overview.analytics.roleBreakdown.user}
                theme={theme}
                title="Users"
              />
              <InsightPanel
                primaryLabel="enter"
                primaryValue={overview.analytics.eventTransitions.enter}
                secondaryLabel="exit"
                secondaryValue={overview.analytics.eventTransitions.exit}
                theme={theme}
                title="Transitions"
              />
            </View>

            <QuietCard theme={theme} style={styles.sectionCard}>
              <QuietSectionHeader
                subtitle="Latest members"
                theme={theme}
                title="Recent Users"
              />
              {overview.recentUsers.length === 0 ? (
                <Text style={[styles.itemMeta, { color: theme.muted }]}>
                  No users yet.
                </Text>
              ) : (
                overview.recentUsers.map((member) => (
                  <View
                    key={member.id}
                    style={[
                      styles.listRow,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={styles.listCopy}>
                      <Text style={[styles.itemTitle, { color: theme.text }]}>
                        {member.email}
                      </Text>
                      <Text style={[styles.itemMeta, { color: theme.muted }]}>
                        Joined {formatTimestamp(member.createdAt)}
                      </Text>
                    </View>
                    <QuietPill
                      label={member.role}
                      muted={member.role !== "admin"}
                      theme={theme}
                    />
                  </View>
                ))
              )}
            </QuietCard>

            <QuietCard theme={theme} style={styles.sectionCard}>
              <QuietSectionHeader
                subtitle="Promote or demote accounts as needed."
                theme={theme}
                title="Role Management"
              />
              {users.map((member) => {
                const isBusy = busyUserId === member.id;
                const nextRole = member.role === "admin" ? "user" : "admin";
                const isCurrentUser = member.id === user?.id;
                return (
                  <View
                    key={member.id}
                    style={[
                      styles.actionRow,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={styles.rowLead}>
                      <View
                        style={[
                          styles.rowIcon,
                          { backgroundColor: theme.accentSoft },
                        ]}
                      >
                        <MaterialIcons
                          color={theme.text}
                          name="person-outline"
                          size={18}
                        />
                      </View>
                    </View>
                    <View style={styles.listCopy}>
                      <Text style={[styles.itemTitle, { color: theme.text }]}>
                        {member.email}
                      </Text>
                      <Text style={[styles.itemMeta, { color: theme.muted }]}>
                        Joined {formatTimestamp(member.createdAt)}
                        {isCurrentUser ? " • Current user" : ""}
                      </Text>
                    </View>
                    <View style={styles.roleActions}>
                      <QuietPill
                        label={member.role}
                        muted={member.role !== "admin"}
                        theme={theme}
                      />
                      <QuietSecondaryButton
                        busy={isBusy}
                        disabled={isBusy || isCurrentUser}
                        label={
                          isCurrentUser
                            ? "Current user"
                            : member.role === "admin"
                              ? "Make user"
                              : "Make admin"
                        }
                        onPress={() => void updateUserRole(member, nextRole)}
                        theme={theme}
                      />
                    </View>
                  </View>
                );
              })}
            </QuietCard>

            <QuietCard theme={theme} style={styles.sectionCard}>
              <QuietSectionHeader
                subtitle="Latest zones created across the system."
                theme={theme}
                title="Recent Zones"
              />
              {overview.recentZones.length === 0 ? (
                <Text style={[styles.itemMeta, { color: theme.muted }]}>
                  No zones yet.
                </Text>
              ) : (
                overview.recentZones.map((zone) => (
                  <View
                    key={zone.id}
                    style={[
                      styles.listRow,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={styles.rowLead}>
                      <View
                        style={[
                          styles.rowIcon,
                          { backgroundColor: theme.accentSoft },
                        ]}
                      >
                        <MaterialIcons
                          color={theme.text}
                          name="place"
                          size={18}
                        />
                      </View>
                    </View>
                    <View style={styles.listCopy}>
                      <Text style={[styles.itemTitle, { color: theme.text }]}>
                        {zone.name}
                      </Text>
                      <Text style={[styles.itemMeta, { color: theme.muted }]}>
                        {zone.ownerEmail || "Unknown owner"} •{" "}
                        {zone.radiusMeters}m • {zone.targetMode}
                      </Text>
                    </View>
                    <QuietPill
                      label={zone.isActive ? "Active" : "Paused"}
                      muted={!zone.isActive}
                      theme={theme}
                    />
                  </View>
                ))
              )}
            </QuietCard>

            <QuietCard theme={theme} style={styles.sectionCard}>
              <QuietSectionHeader
                subtitle="Most recent transition logs from user devices."
                theme={theme}
                title="Recent Events"
              />
              {overview.recentEvents.length === 0 ? (
                <Text style={[styles.itemMeta, { color: theme.muted }]}>
                  No events yet.
                </Text>
              ) : (
                overview.recentEvents.map((event) => (
                  <View
                    key={event.id}
                    style={[
                      styles.listRow,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={styles.rowLead}>
                      <View
                        style={[
                          styles.rowIcon,
                          {
                            backgroundColor:
                              event.transition === "enter"
                                ? theme.accentSoft
                                : theme.pageAlt,
                          },
                        ]}
                      >
                        <MaterialIcons
                          color={
                            event.transition === "enter"
                              ? theme.text
                              : theme.warning
                          }
                          name={
                            event.transition === "enter" ? "login" : "logout"
                          }
                          size={18}
                        />
                      </View>
                    </View>
                    <View style={styles.listCopy}>
                      <Text style={[styles.itemTitle, { color: theme.text }]}>
                        {event.userEmail || "Unknown user"} •{" "}
                        {event.zoneName || "Unnamed zone"}
                      </Text>
                      <Text style={[styles.itemMeta, { color: theme.muted }]}>
                        {event.transition} • {event.previousMode} →{" "}
                        {event.modeApplied} •{" "}
                        {formatTimestamp(event.triggeredAt)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </QuietCard>
          </>
        ) : null}
      </View>
    </QuietScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroCard: {
    gap: 20,
    paddingVertical: 22,
  },
  heroTopRow: {
    gap: 14,
  },
  heroCopy: {
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.9,
    lineHeight: 36,
    maxWidth: 420,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 480,
    opacity: 0.82,
  },
  heroPills: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  summaryMetricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryMetric: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 104,
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  summaryMetricValue: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  summaryMetricLabel: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.82,
  },
  analyticsGrid: {
    gap: 12,
  },
  activityPanel: {
    backgroundColor: "transparent",
    gap: 12,
  },
  analyticsSummaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  analyticsSummaryItem: {
    flex: 1,
    gap: 4,
  },
  analyticsSummaryValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  analyticsSummaryLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  insightPanel: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  insightValues: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  insightValueBlock: {
    flex: 1,
    gap: 4,
  },
  insightDivider: {
    height: 38,
    width: 1,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  chartRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
    minHeight: 160,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  barValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  barTrack: {
    borderRadius: 999,
    borderWidth: 1,
    height: 100,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: "100%",
  },
  barFill: {
    borderRadius: 999,
    minHeight: 0,
    width: "100%",
  },
  barLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  sectionCard: {
    gap: 0,
  },
  listRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  actionRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowLead: {
    justifyContent: "flex-start",
  },
  rowIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  listCopy: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  itemMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  roleActions: {
    alignItems: "flex-end",
    gap: 8,
    minWidth: 120,
  },
  eventIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 24,
  },
});
