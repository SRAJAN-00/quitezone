import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

export default function ZonesScreen() {
  const router = useRouter();
  const theme = getTheme(useColorScheme());
  const { accessToken } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const activeCount = zones.filter((zone) => zone.isActive).length;

  const loadZones = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiRequest<{ zones: Zone[] }>("/api/zones", {
        token: accessToken,
      });
      setZones(response.zones);
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadZones();
    }, [loadZones])
  );

  return (
    <QuietScreen theme={theme}>
      <View style={styles.header}>
        <QuietSectionHeader
          action={<QuietPrimaryButton label="New zone" onPress={() => router.push("/zone-editor")} theme={theme} />}
          subtitle="Create, review, and edit the spaces where QuietZone should take over."
          theme={theme}
          title="Zones"
        />

        {!loading && !error && zones.length > 0 ? (
          <View style={styles.summaryRow}>
            <QuietPill label={`${zones.length} total`} theme={theme} />
            <QuietPill label={`${activeCount} active`} theme={theme} />
            <QuietPill
              label={`${zones.filter((zone) => zone.targetMode === "silent").length} silent`}
              muted
              theme={theme}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        {loading ? (
          <QuietLoadingCard label="Loading your zone library..." theme={theme} />
        ) : error ? (
          <QuietStateCard
            action={<QuietPrimaryButton label="Retry" onPress={() => void loadZones()} theme={theme} />}
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
                    <View style={[styles.zoneIcon, { backgroundColor: theme.accentSoft }]}>
                      <MaterialIcons
                        color={theme.accent}
                        name={zone.targetMode === "silent" ? "notifications-off" : "vibration"}
                        size={22}
                      />
                    </View>
                    <View style={styles.zoneCopy}>
                      <Text style={[styles.zoneTitle, { color: theme.text }]}>{zone.name}</Text>
                      <Text style={[styles.zoneMeta, { color: theme.muted }]}>
                        {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pills}>
                    <QuietPill label={`${zone.radiusMeters}m`} theme={theme} />
                    <QuietPill label={zone.targetMode} theme={theme} />
                    <QuietPill label={zone.isActive ? "Active" : "Paused"} muted theme={theme} />
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
  zoneTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  zoneMeta: {
    fontSize: 14,
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
