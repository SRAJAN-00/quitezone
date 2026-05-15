import * as Location from "expo-location";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { 
  QuietBanner, 
  QuietInput, 
  QuietLoadingCard, 
  QuietPrimaryButton, 
  QuietSecondaryButton, 
  QuietCard, 
  QuietHero 
} from "@/components/ui/quietzone-ui";
import { ZoneMap } from "@/components/ui/zone-map-view";
import { getTheme, Spacing, Radius } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Zone } from "@/lib/quietzone-types";
import { apiRequest, getUserFacingError } from "@/lib/api";
import {
  DEFAULT_ZONE_SCHEDULE,
  normalizeZoneSchedule,
  validateZoneSchedule,
} from "@/lib/zone-schedule";
import { syncGeofencesFromApi } from "@/lib/silent-automation/geofence-runtime";

const FALLBACK_REGION = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};
const MAX_LAST_KNOWN_AGE_MS = 5 * 60 * 1000;

const RADIUS_PRESETS = [50, 100, 150, 250, 400];
const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];
const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  notifyOnEnter: true,
  notifyOnExit: true,
  onlyOnFailure: false,
};

function SettingRow({
  label,
  hint,
  value,
  onValueChange,
  theme,
  last,
  compact,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  theme: any;
  last?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.settingRow, compact && styles.settingRowCompact, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <View style={styles.settingCopy}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
        {hint ? <Text style={[styles.settingHint, { color: theme.muted }]}>{hint}</Text> : null}
      </View>
      <Switch onValueChange={onValueChange} value={value} />
    </View>
  );
}

export default function ZoneEditorScreen() {
  const theme = getTheme(useColorScheme());
  const { id } = useLocalSearchParams<{ id?: string }>();
  const zoneId = typeof id === "string" ? id : undefined;
  const isEdit = Boolean(zoneId);
  const { accessToken, isAuthenticated, isHydrating, user } = useAuth();

  const [name, setName] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [targetMode, setTargetMode] = useState<"silent" | "vibrate">("silent");
  const [isActive, setIsActive] = useState(true);
  const [address, setAddress] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDays, setScheduleDays] = useState<number[]>([...DEFAULT_ZONE_SCHEDULE.daysOfWeek]);
  const [scheduleStartTime, setScheduleStartTime] = useState(DEFAULT_ZONE_SCHEDULE.startTime);
  const [scheduleEndTime, setScheduleEndTime] = useState(DEFAULT_ZONE_SCHEDULE.endTime);
  const [notificationsEnabled, setNotificationsEnabled] = useState(DEFAULT_NOTIFICATION_SETTINGS.enabled);
  const [notifyOnEnter, setNotifyOnEnter] = useState(DEFAULT_NOTIFICATION_SETTINGS.notifyOnEnter);
  const [notifyOnExit, setNotifyOnExit] = useState(DEFAULT_NOTIFICATION_SETTINGS.notifyOnExit);
  const [notifyOnlyOnFailure, setNotifyOnlyOnFailure] = useState(DEFAULT_NOTIFICATION_SETTINGS.onlyOnFailure);
  const [coordinate, setCoordinate] = useState({
    latitude: FALLBACK_REGION.latitude,
    longitude: FALLBACK_REGION.longitude,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addressLookupBusy, setAddressLookupBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [mapFullScreenVisible, setMapFullScreenVisible] = useState(false);
  const [mapInteracting, setMapInteracting] = useState(false);

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
          setAddress(current.address ?? "");
          setRadiusMeters(current.radiusMeters);
          setTargetMode(current.targetMode);
          setIsActive(current.isActive);
          const currentSchedule = normalizeZoneSchedule(current.schedule);
          setScheduleEnabled(currentSchedule.enabled);
          setScheduleDays(currentSchedule.daysOfWeek);
          setScheduleStartTime(currentSchedule.startTime);
          setScheduleEndTime(currentSchedule.endTime);
          const currentNotifications = {
            ...DEFAULT_NOTIFICATION_SETTINGS,
            ...(current.notifications || {}),
          };
          setNotificationsEnabled(currentNotifications.enabled);
          setNotifyOnEnter(currentNotifications.notifyOnEnter);
          setNotifyOnExit(currentNotifications.notifyOnExit);
          setNotifyOnlyOnFailure(currentNotifications.onlyOnFailure);
          setCoordinate({
            latitude: current.lat,
            longitude: current.lng,
          });
        } else {
          setAddress("");
          const nextDefaults = {
            ...DEFAULT_NOTIFICATION_SETTINGS,
            ...(user?.notificationDefaults || {}),
          };
          setNotificationsEnabled(nextDefaults.enabled);
          setNotifyOnEnter(nextDefaults.notifyOnEnter);
          setNotifyOnExit(nextDefaults.notifyOnExit);
          setNotifyOnlyOnFailure(nextDefaults.onlyOnFailure);
        }

        const permission = await Location.getForegroundPermissionsAsync();
        if (!active) {
          return;
        }

        if (permission.status !== "granted") {
          setLocationMessage("Location permission is off, so QuietZone is using a fallback map region.");
          return;
        }

        const lastKnownPosition = await Location.getLastKnownPositionAsync();
        const lastKnownIsFresh =
          Boolean(lastKnownPosition?.timestamp) &&
          Date.now() - Number(lastKnownPosition?.timestamp) <= MAX_LAST_KNOWN_AGE_MS;
        const position = lastKnownIsFresh
          ? lastKnownPosition
          : await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
        if (!active) {
          return;
        }
        if (!position) {
          setLocationMessage("Could not read a recent device location, so QuietZone is using the fallback map region.");
          return;
        }

        setLocationMessage(
          lastKnownIsFresh
            ? "Map centered using a recent device location."
            : "Map centered using your live device location."
        );
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
  }, [accessToken, isEdit, zoneId, reloadKey, user?.notificationDefaults]);

  async function centerMapOnCurrentLocation() {
    try {
      setError("");
      let permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== "granted") {
        setLocationMessage("Location permission is required to use your current location.");
        return;
      }

      const lastKnownPosition = await Location.getLastKnownPositionAsync();
      const lastKnownIsFresh =
        Boolean(lastKnownPosition?.timestamp) &&
        Date.now() - Number(lastKnownPosition?.timestamp) <= MAX_LAST_KNOWN_AGE_MS;
      const position = lastKnownIsFresh
        ? lastKnownPosition
        : await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

      if (!position) {
        setLocationMessage("Could not fetch your current location. Try again in an open area.");
        return;
      }

      setCoordinate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationMessage(
        lastKnownIsFresh
          ? "Map centered to your recent current location."
          : "Map centered to your live current location."
      );
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    }
  }

  async function centerMapOnAddress() {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setError("Enter an address or landmark first.");
      return;
    }

    try {
      setError("");
      setAddressLookupBusy(true);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmedAddress)}`
      );

      if (!response.ok) {
        throw new Error("Could not look up that address right now.");
      }

      const results = (await response.json()) as { lat: string; lon: string; display_name?: string }[];
      const match = results[0];

      if (!match) {
        setLocationMessage("No matching address was found. Try a more specific place name.");
        return;
      }

      setCoordinate({
        latitude: Number(match.lat),
        longitude: Number(match.lon),
      });
      setLocationMessage(`Centered map on ${match.display_name || trimmedAddress}.`);
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setAddressLookupBusy(false);
    }
  }

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

    const schedule = normalizeZoneSchedule({
      enabled: scheduleEnabled,
      daysOfWeek: scheduleDays,
      startTime: scheduleStartTime,
      endTime: scheduleEndTime,
    });
    const scheduleError = validateZoneSchedule(schedule);
    if (scheduleError) {
      setError(scheduleError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: trimmedName,
        address: address.trim() || undefined,
        lat: coordinate.latitude,
        lng: coordinate.longitude,
        radiusMeters,
        targetMode,
        isActive,
        schedule,
        notifications: {
          enabled: notificationsEnabled,
          notifyOnEnter,
          notifyOnExit,
          onlyOnFailure: notifyOnlyOnFailure,
        },
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

      await syncGeofencesFromApi(accessToken);

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

      await syncGeofencesFromApi(accessToken);

      router.back();
    } catch (nextError) {
      setError(getUserFacingError(nextError));
    } finally {
      setDeleting(false);
    }
  }

  function toggleScheduleDay(day: number) {
    setScheduleDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b)
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.page }]} edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.page }]}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!mapInteracting}
        showsVerticalScrollIndicator={false}
      >
        <QuietHero
          theme={theme}
          title={isEdit ? "Edit zone" : "New zone"}
          subtitle="Place your boundary, set the phone behavior, and save."
          eyebrow="Zone configuration"
        />

        <View style={styles.body}>
          {initialLoading ? (
            <QuietLoadingCard label="Loading editor..." theme={theme} />
          ) : (
            <>
              {locationMessage ? <QuietBanner theme={theme} style={styles.banner}>{locationMessage}</QuietBanner> : null}
              {error ? (
                <View style={styles.bannerWrap}>
                  <QuietBanner theme={theme} tone="danger">{error}</QuietBanner>
                  <QuietSecondaryButton
                    disabled={saving || deleting}
                    label="Retry load"
                    onPress={() => setReloadKey((value) => value + 1)}
                    theme={theme}
                  />
                </View>
              ) : null}

              <QuietCard theme={theme} style={styles.editorCard}>
                <QuietInput
                  label="Zone name"
                  onChangeText={setName}
                  placeholder="Library, office, gym..."
                  theme={theme}
                  value={name}
                />
                <QuietInput
                  label="Address"
                  message="Enter a place name, road, or full address, then center the pin there."
                  onChangeText={setAddress}
                  placeholder="123 Main St, Bangalore"
                  theme={theme}
                  value={address}
                />
                <QuietPrimaryButton
                  busy={addressLookupBusy}
                  disabled={saving || deleting}
                  label="Find address"
                  onPress={() => void centerMapOnAddress()}
                  theme={theme}
                  style={styles.addressBtn}
                />
              </QuietCard>

              <QuietCard theme={theme} style={styles.editorCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.sectionLabel, { color: theme.text }]}>Location</Text>
                  <Text style={[styles.cardMeta, { color: theme.muted }]}>
                    {coordinate.latitude.toFixed(5)}, {coordinate.longitude.toFixed(5)}
                  </Text>
                </View>
                <View style={[styles.mapWrap, { borderColor: theme.border }]}>
                  <ZoneMap
                    coordinate={coordinate}
                    height={320}
                    onInteractionEnd={() => setMapInteracting(false)}
                    onInteractionStart={() => setMapInteracting(true)}
                    onChangeCoordinate={setCoordinate}
                    radiusMeters={radiusMeters}
                    region={region}
                    theme={theme}
                  />
                </View>
                <View style={styles.locationActions}>
                  <QuietSecondaryButton
                    disabled={saving || deleting}
                    label="My location"
                    onPress={() => void centerMapOnCurrentLocation()}
                    theme={theme}
                    style={styles.halfBtn}
                  />
                  <QuietSecondaryButton
                    disabled={saving || deleting}
                    label="Full screen"
                    onPress={() => setMapFullScreenVisible(true)}
                    theme={theme}
                    style={styles.halfBtn}
                  />
                </View>
              </QuietCard>

              <QuietCard theme={theme} style={styles.editorCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.sectionLabel, { color: theme.text }]}>Radius</Text>
                  <Text style={[styles.cardMeta, { color: theme.muted }]}>{radiusMeters} meters</Text>
                </View>
                <View style={styles.choiceGrid}>
                  {RADIUS_PRESETS.map((preset) => {
                    const selected = radiusMeters === preset;
                    return (
                      <Pressable
                        key={preset}
                        onPress={() => setRadiusMeters(preset)}
                        style={[
                          styles.choice,
                          {
                            backgroundColor: selected ? theme.accent : theme.surfaceStrong,
                            borderColor: selected ? theme.accent : theme.border,
                          },
                        ]}
                      >
                        <Text style={[styles.choiceText, { color: selected ? theme.accentTextOn : theme.text }]}>
                          {preset}m
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </QuietCard>

              <QuietCard theme={theme} style={styles.editorCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.sectionLabel, { color: theme.text }]}>Target mode</Text>
                  <Text style={[styles.cardMeta, { color: theme.muted }]}>Behavior inside zone</Text>
                </View>
                <View style={styles.modeChoiceWrap}>
                  {(["silent", "vibrate"] as const).map((mode) => {
                    const selected = targetMode === mode;
                    return (
                      <Pressable
                        key={mode}
                        onPress={() => setTargetMode(mode)}
                        style={[
                          styles.modeChoice,
                          {
                            backgroundColor: selected ? theme.accent : theme.surfaceStrong,
                            borderColor: selected ? theme.accent : theme.border,
                          },
                        ]}
                      >
                        <MaterialIcons 
                          name={mode === "silent" ? "notifications-off" : "vibration"} 
                          size={18} 
                          color={selected ? theme.accentTextOn : theme.icon} 
                        />
                        <Text style={[styles.choiceText, { color: selected ? theme.accentTextOn : theme.text }]}>
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </QuietCard>

              <QuietCard theme={theme} style={styles.editorCard}>
                <SettingRow
                  label="Active"
                  hint="Apply automation when inside this zone."
                  value={isActive}
                  onValueChange={setIsActive}
                  theme={theme}
                  last={!scheduleEnabled}
                />
                
                <SettingRow
                  label="Schedule"
                  hint="Limit automation to specific days/hours."
                  value={scheduleEnabled}
                  onValueChange={setScheduleEnabled}
                  theme={theme}
                  last
                />

                {scheduleEnabled && (
                  <View style={styles.scheduleDetail}>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <View style={styles.daysWrap}>
                      {DAYS.map((day) => {
                        const selected = scheduleDays.includes(day.value);
                        return (
                          <Pressable
                            key={day.value}
                            onPress={() => toggleScheduleDay(day.value)}
                            style={[
                              styles.dayPill,
                              {
                                backgroundColor: selected ? theme.accent : theme.surfaceStrong,
                                borderColor: selected ? theme.accent : theme.border,
                              },
                            ]}
                          >
                            <Text style={[styles.dayText, { color: selected ? theme.accentTextOn : theme.text }]}>
                              {day.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.timeRow}>
                      <View style={styles.timeField}>
                        <QuietInput
                          label="Start"
                          onChangeText={setScheduleStartTime}
                          placeholder="09:00"
                          theme={theme}
                          value={scheduleStartTime}
                        />
                      </View>
                      <View style={styles.timeField}>
                        <QuietInput
                          label="End"
                          onChangeText={setScheduleEndTime}
                          placeholder="17:00"
                          theme={theme}
                          value={scheduleEndTime}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </QuietCard>

              <QuietCard theme={theme} style={styles.editorCard}>
                <SettingRow
                  label="Notifications"
                  hint="Control push alerts for this zone."
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  theme={theme}
                  last={!notificationsEnabled}
                />
                
                {notificationsEnabled && (
                  <View style={styles.notificationRules}>
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <SettingRow
                      label="Notify on enter"
                      value={notifyOnEnter}
                      onValueChange={setNotifyOnEnter}
                      theme={theme}
                      compact
                    />
                    <SettingRow
                      label="Notify on exit"
                      value={notifyOnExit}
                      onValueChange={setNotifyOnExit}
                      theme={theme}
                      compact
                    />
                    <SettingRow
                      label="Failures only"
                      hint="Alert only if automation is blocked."
                      value={notifyOnlyOnFailure}
                      onValueChange={setNotifyOnlyOnFailure}
                      theme={theme}
                      compact
                      last
                    />
                  </View>
                )}
              </QuietCard>

              {isEdit && (
                <View style={styles.deleteSection}>
                  <QuietSecondaryButton
                    busy={deleting}
                    label="Delete this zone"
                    onPress={confirmDelete}
                    theme={theme}
                    style={styles.deleteBtn}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setMapFullScreenVisible(false)}
        presentationStyle="fullScreen"
        visible={mapFullScreenVisible}
      >
        <SafeAreaView style={[styles.fullScreenMapRoot, { backgroundColor: theme.page }]}>
          <View style={[styles.fullScreenMapHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fullScreenMapTitle, { color: theme.text }]}>Pick zone location</Text>
            <QuietSecondaryButton
              label="Close"
              onPress={() => setMapFullScreenVisible(false)}
              theme={theme}
            />
          </View>

          <View style={styles.fullScreenMapBody}>
            <ZoneMap
              coordinate={coordinate}
              height={520}
              onChangeCoordinate={setCoordinate}
              radiusMeters={radiusMeters}
              region={region}
              theme={theme}
            />
            <Text style={[styles.coordinateText, { color: theme.mutedStrong }]}>
              {coordinate.latitude.toFixed(5)}, {coordinate.longitude.toFixed(5)}
            </Text>
            <View style={styles.locationActions}>
              <QuietSecondaryButton
                disabled={saving || deleting}
                label="Use current location"
                onPress={() => void centerMapOnCurrentLocation()}
                theme={theme}
                style={{ flex: 1 }}
              />
              <QuietPrimaryButton
                label="Done"
                onPress={() => setMapFullScreenVisible(false)}
                theme={theme}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {!initialLoading ? (
        <View style={[styles.stickyFooter, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <View style={styles.footerActions}>
            <QuietSecondaryButton
              disabled={saving || deleting}
              label="Cancel"
              onPress={() => router.back()}
              theme={theme}
              style={styles.footerBtn}
            />
            <View style={styles.footerPrimary}>
              <QuietPrimaryButton
                busy={saving}
                disabled={name.trim().length < 2 || deleting}
                label={isEdit ? "Save changes" : "Create zone"}
                onPress={() => void saveZone()}
                theme={theme}
              />
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  body: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  editorCard: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  cardHeader: {
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardMeta: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  banner: {
    marginBottom: Spacing.sm,
  },
  bannerWrap: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  mapWrap: {
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
    height: 320,
  },
  locationActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginTop: 8,
  },
  halfBtn: {
    flex: 1,
    minWidth: 150,
  },
  addressBtn: {
    alignSelf: "flex-start",
    minWidth: 160,
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  choice: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modeChoiceWrap: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  modeChoice: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingVertical: 12,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    gap: 16,
  },
  settingRowCompact: {
    paddingVertical: Spacing.sm,
  },
  settingCopy: {
    flex: 1,
    gap: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  settingHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  scheduleDetail: {
    gap: Spacing.md,
    marginTop: 8,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  daysWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  timeField: {
    flex: 1,
  },
  notificationRules: {
    marginTop: 4,
  },
  deleteSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  deleteBtn: {
    borderColor: "transparent",
  },
  stickyFooter: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  footerActions: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "center",
  },
  footerPrimary: {
    flex: 1,
    maxHeight: 50,
  },
  footerBtn: {
    minWidth: 110,
  },
  fullScreenMapRoot: {
    flex: 1,
  },
  fullScreenMapHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fullScreenMapTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  fullScreenMapBody: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  coordinateText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
