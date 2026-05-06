import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Redirect, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
import { AdminEvent, AdminUser, AdminZone } from "@/lib/quietzone-types";

type AdminOverviewResponse = {
  counts: {
    users: number;
    zones: number;
    events: number;
  };
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

export default function AdminScreen() {
  const theme = getTheme(useColorScheme());
  const { accessToken, isAuthenticated, isHydrating, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const loadAdminData = useCallback(async () => {
    if (!accessToken || user?.role !== "admin") {
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
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, user?.role]);

  useFocusEffect(
    useCallback(() => {
      void loadAdminData();
    }, [loadAdminData])
  );

  async function updateUserRole(targetUser: AdminUser, nextRole: "user" | "admin") {
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
      await loadAdminData();
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
        <QuietSectionHeader
          subtitle="Review the overall system and manage user roles."
          theme={theme}
          title="Admin"
        />

        {loading ? (
          <QuietLoadingCard label="Loading admin overview..." theme={theme} />
        ) : error ? (
          <QuietStateCard
            action={<QuietPrimaryButton label="Retry" onPress={() => void loadAdminData()} theme={theme} />}
            description={error}
            theme={theme}
            title="Could not load admin data"
          />
        ) : overview ? (
          <>
            <View style={styles.statsGrid}>
              <QuietCard theme={theme} style={styles.statCard}>
                <Text style={[styles.statValue, { color: theme.text }]}>{overview.counts.users}</Text>
                <Text style={[styles.statLabel, { color: theme.mutedStrong }]}>Users</Text>
              </QuietCard>
              <QuietCard theme={theme} style={styles.statCard}>
                <Text style={[styles.statValue, { color: theme.text }]}>{overview.counts.zones}</Text>
                <Text style={[styles.statLabel, { color: theme.mutedStrong }]}>Zones</Text>
              </QuietCard>
              <QuietCard theme={theme} style={styles.statCard}>
                <Text style={[styles.statValue, { color: theme.text }]}>{overview.counts.events}</Text>
                <Text style={[styles.statLabel, { color: theme.mutedStrong }]}>Events</Text>
              </QuietCard>
            </View>

            <QuietCard theme={theme}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Users</Text>
              {users.map((member) => {
                const isBusy = busyUserId === member.id;
                const nextRole = member.role === "admin" ? "user" : "admin";
                return (
                  <View key={member.id} style={styles.listItem}>
                    <View style={styles.listCopy}>
                      <Text style={[styles.itemTitle, { color: theme.text }]}>{member.email}</Text>
                      <Text style={[styles.itemMeta, { color: theme.muted }]}>
                        Joined {formatTimestamp(member.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.roleActions}>
                      <QuietPill label={member.role} muted={member.role !== "admin"} theme={theme} />
                      <QuietSecondaryButton
                        busy={isBusy}
                        disabled={isBusy}
                        label={member.role === "admin" ? "Make user" : "Make admin"}
                        onPress={() => void updateUserRole(member, nextRole)}
                        theme={theme}
                      />
                    </View>
                  </View>
                );
              })}
            </QuietCard>

            <QuietCard theme={theme}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Zones</Text>
              {overview.recentZones.length === 0 ? (
                <Text style={[styles.itemMeta, { color: theme.muted }]}>No zones yet.</Text>
              ) : (
                overview.recentZones.map((zone) => (
                  <View key={zone.id} style={styles.listItem}>
                    <View style={styles.listCopy}>
                      <Text style={[styles.itemTitle, { color: theme.text }]}>{zone.name}</Text>
                      <Text style={[styles.itemMeta, { color: theme.muted }]}>
                        {zone.ownerEmail || "Unknown owner"} • {zone.radiusMeters}m • {zone.targetMode}
                      </Text>
                    </View>
                    <QuietPill label={zone.isActive ? "Active" : "Paused"} muted={!zone.isActive} theme={theme} />
                  </View>
                ))
              )}
            </QuietCard>

            <QuietCard theme={theme}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Events</Text>
              {overview.recentEvents.length === 0 ? (
                <Text style={[styles.itemMeta, { color: theme.muted }]}>No events yet.</Text>
              ) : (
                overview.recentEvents.map((event) => (
                  <View key={event.id} style={styles.listItem}>
                    <View style={styles.eventIcon}>
                      <MaterialIcons
                        color={event.transition === "enter" ? theme.accent : theme.warning}
                        name={event.transition === "enter" ? "login" : "logout"}
                        size={20}
                      />
                    </View>
                    <View style={styles.listCopy}>
                      <Text style={[styles.itemTitle, { color: theme.text }]}>
                        {event.userEmail || "Unknown user"} • {event.zoneName || "Unnamed zone"}
                      </Text>
                      <Text style={[styles.itemMeta, { color: theme.muted }]}>
                        {event.transition} • {event.previousMode} → {event.modeApplied} • {formatTimestamp(event.triggeredAt)}
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
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minHeight: 120,
    justifyContent: "center",
  },
  statValue: {
    fontSize: 30,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  listItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
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
