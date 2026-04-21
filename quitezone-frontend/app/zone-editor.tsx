import * as Location from "expo-location";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { QuietLoadingCard, QuietPrimaryButton, QuietScreen, QuietSecondaryButton, QuietInput, QuietBanner } from "@/components/ui/quietzone-ui";
import { ZoneMap } from "@/components/ui/zone-map-view";
import { getTheme } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Zone } from "@/lib/quietzone-types";
import { apiRequest, getUserFacingError } from "@/lib/api";

const FALLBACK_REGION = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const RADIUS_PRESETS = [50, 100, 150, 250, 400];

export default function ZoneEditorScreen() {
  const theme = getTheme(useColorScheme());
  const { id } = useLocalSearchParams<{ id?: string }>();
  const zoneId = typeof id === "string" ? id : undefined;
  const isEdit = Boolean(zoneId);
  const { accessToken, isAuthenticated, isHydrating } = useAuth();

  const [name, setName] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [targetMode, setTargetMode] = useState<"silent" | "vibrate">("silent");
  const [isActive, setIsActive] = useState(true);
  const [coordinate, setCoordinate] = useState({
    latitude: FALLBACK_REGION.latitude,
    longitude: FALLBACK_REGION.longitude,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const region = useMemo(
    () => ({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }),
    [coordinate.latitude, coordinate.longitude]
  );

  useEffect(() => {
    let active = true;

    async function loadEditorState() {
      if (!accessToken) {
        return;
      }

      setInitialLoading(true);
      setError("");

      try {
        if (isEdit && zoneId) {
          const response = await apiRequest<{ zones: Zone[] }>("/api/zones", {
            token: accessToken,
          });
          const current = response.zones.find((zone) => zone.id === zoneId);
          if (!current) {
            throw new Error("Zone not found");
          }

          if (!active) {
            return;
          }

          setName(current.name);
          setRadiusMeters(current.radiusMeters);
          setTargetMode(current.targetMode);
          setIsActive(current.isActive);
          setCoordinate({
            latitude: current.lat,
            longitude: current.lng,
          });
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) {
          return;
        }

        if (permission.status !== "granted") {
          setLocationMessage("Location permission is off, so QuietZone is using a fallback map region.");
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        if (!active) {
          return;
        }

        setLocationMessage("Map centered near your current location.");
        if (!isEdit) {
          setCoordinate({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(getUserFacingError(nextError));
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    }

    void loadEditorState();

    return () => {
      active = false;
    };
  }, [accessToken, isEdit, zoneId, reloadKey]);

  if (isHydrating) {
    return <QuietLoadingCard label="Opening editor..." theme={theme} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  async function saveZone() {
    if (!accessToken) {
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Zone name must be at least 2 characters.");
      return;
    }

    if (radiusMeters < 50 || radiusMeters > 3000) {
      setError("Radius must be between 50 and 3000 meters.");
      return;
    }

    if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
      setError("Pick a valid location on the map.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: trimmedName,
        lat: coordinate.latitude,
        lng: coordinate.longitude,
        radiusMeters,
        targetMode,
        isActive,
      };

      if (isEdit && zoneId) {
        await apiRequest(`/api/zones/${zoneId}`, {
          method: "PATCH",
          body: payload,
          token: accessToken,
        });
      } else {
        await apiRequest("/api/zones", {
          method: "POST",
          body: payload,
          token: accessToken,
        });
      }

      router.back();
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete zone", "This will permanently remove the zone from your account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteZone();
        },
      },
    ]);
  }

  async function deleteZone() {
    if (!accessToken || !zoneId) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await apiRequest(`/api/zones/${zoneId}`, {
        method: "DELETE",
        token: accessToken,
      });
      router.back();
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <QuietScreen theme={theme}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.mutedStrong }]}>{isEdit ? "Edit zone" : "Create zone"}</Text>
        <Text style={[styles.title, { color: theme.text }]}>
          {isEdit ? "Adjust your quiet boundary." : "Place a new quiet boundary."}
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Tap the map to place the zone center, choose the sound behavior, and save it into your QuietZone library.
        </Text>
      </View>

      <View style={styles.content}>
        {initialLoading ? (
          <QuietLoadingCard label="Loading zone editor..." theme={theme} />
        ) : (
          <>
            {locationMessage ? <QuietBanner theme={theme}>{locationMessage}</QuietBanner> : null}
            {error ? (
              <>
                <QuietBanner theme={theme} tone="danger">{error}</QuietBanner>
                <QuietSecondaryButton
                  disabled={saving || deleting}
                  label="Retry load"
                  onPress={() => setReloadKey((value) => value + 1)}
                  theme={theme}
                />
              </>
            ) : null}

            <QuietInput
              label="Zone name"
              message="Use a name you will recognize quickly during class or meeting setup."
              onChangeText={setName}
              placeholder="Library, lecture hall, studio..."
              theme={theme}
              value={name}
            />

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.sectionLabel, { color: theme.text }]}>Location</Text>
                <Text style={[styles.cardMeta, { color: theme.muted }]}>Adjust the center coordinate</Text>
              </View>
              <View style={styles.mapWrap}>
                <ZoneMap
                  coordinate={coordinate}
                  onChangeCoordinate={setCoordinate}
                  radiusMeters={radiusMeters}
                  region={region}
                  theme={theme}
                />
              </View>

              <Text style={[styles.coordinateText, { color: theme.mutedStrong }]}>
                {coordinate.latitude.toFixed(5)}, {coordinate.longitude.toFixed(5)}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.sectionLabel, { color: theme.text }]}>Radius</Text>
                <Text style={[styles.cardMeta, { color: theme.muted }]}>{radiusMeters} meters</Text>
              </View>
              <View style={styles.choiceWrap}>
                {RADIUS_PRESETS.map((preset) => {
                  const selected = radiusMeters === preset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => setRadiusMeters(preset)}
                      style={[
                        styles.choice,
                        {
                          backgroundColor: selected ? theme.accent : theme.input,
                          borderColor: selected ? theme.accent : theme.border,
                        },
                      ]}
                    >
                      <Text style={{ color: selected ? theme.accentTextOn : theme.text, fontWeight: "700" }}>
                        {preset}m
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.sectionLabel, { color: theme.text }]}>Mode</Text>
                <Text style={[styles.cardMeta, { color: theme.muted }]}>Choose the behavior inside this zone</Text>
              </View>
              <View style={styles.choiceWrap}>
                {(["silent", "vibrate"] as const).map((mode) => {
                  const selected = targetMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setTargetMode(mode)}
                      style={[
                        styles.choice,
                        {
                          backgroundColor: selected ? theme.accent : theme.input,
                          borderColor: selected ? theme.accent : theme.border,
                        },
                      ]}
                    >
                      <Text style={{ color: selected ? theme.accentTextOn : theme.text, fontWeight: "700" }}>
                        {mode}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[styles.sectionLabel, { color: theme.text }]}>Active</Text>
                  <Text style={[styles.switchHint, { color: theme.muted }]}>
                    Turn this off if you want to keep the zone saved without applying automation.
                  </Text>
                </View>
                <Switch onValueChange={setIsActive} value={isActive} />
              </View>
            </View>

            <View style={styles.buttonStack}>
              <QuietPrimaryButton
                busy={saving}
                disabled={name.trim().length < 2}
                label={isEdit ? "Save changes" : "Create zone"}
                onPress={() => void saveZone()}
                theme={theme}
              />
              <QuietSecondaryButton label="Cancel" onPress={() => router.back()} theme={theme} />
              {isEdit ? (
                <QuietSecondaryButton
                  busy={deleting}
                  label="Delete zone"
                  onPress={confirmDelete}
                  theme={theme}
                />
              ) : null}
            </View>
          </>
        )}
      </View>
    </QuietScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  content: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "700",
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  mapWrap: {
    borderRadius: 22,
    overflow: "hidden",
  },
  map: {
    height: 300,
    width: "100%",
  },
  coordinateText: {
    fontSize: 13,
  },
  choiceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  choice: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  switchCopy: {
    flex: 1,
    gap: 6,
  },
  switchHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonStack: {
    gap: 12,
    paddingBottom: 18,
  },
});
