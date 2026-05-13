import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { apiRequest } from "@/lib/api";
import { Zone, ZoneSchedule } from "@/lib/quietzone-types";
import { loadStoredSession } from "@/lib/session-storage";
import { normalizeZoneSchedule } from "@/lib/zone-schedule";

import { getSilentAutomationStatus, setRingerMode } from "./native";

const TASK_NAME = "quietzone-android-geofence-task";
const ZONES_KEY = "quietzone.automation.zones";
const LAST_RESULT_KEY = "quietzone.automation.lastResult";
const ACTIVE_ZONE_STATES_KEY = "quietzone.automation.active-zones";
const COOLDOWN_MS = 20000;

const recentTransitionByZone = new Map<string, number>();

type StoredAutomationZone = Pick<
  Zone,
  "id" | "name" | "targetMode" | "lat" | "lng" | "radiusMeters"
> & {
  schedule: ZoneSchedule;
};

type AutomationLastResult = {
  timestamp: string;
  transition: "enter" | "exit";
  zoneName: string;
  modeRequested: "silent" | "vibrate" | "normal";
  applied: boolean;
  blocked: boolean;
  reason?: string | null;
};

async function saveAutomationZones(zones: StoredAutomationZone[]) {
  await SecureStore.setItemAsync(ZONES_KEY, JSON.stringify(zones));
}

async function loadAutomationZones() {
  const raw = await SecureStore.getItemAsync(ZONES_KEY);
  if (!raw) {
    return [] as StoredAutomationZone[];
  }
  return JSON.parse(raw) as StoredAutomationZone[];
}

async function saveLastResult(result: AutomationLastResult) {
  await SecureStore.setItemAsync(LAST_RESULT_KEY, JSON.stringify(result));
}

async function saveActiveZoneStates(states: Record<string, boolean>) {
  await SecureStore.setItemAsync(ACTIVE_ZONE_STATES_KEY, JSON.stringify(states));
}

async function loadActiveZoneStates() {
  const raw = await SecureStore.getItemAsync(ACTIVE_ZONE_STATES_KEY);
  if (!raw) {
    return {} as Record<string, boolean>;
  }

  return JSON.parse(raw) as Record<string, boolean>;
}

export async function getLastAutomationResult() {
  const raw = await SecureStore.getItemAsync(LAST_RESULT_KEY);
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as AutomationLastResult;
}

function shouldSkipByCooldown(zoneId: string) {
  const now = Date.now();
  const previous = recentTransitionByZone.get(zoneId) ?? 0;
  if (now - previous < COOLDOWN_MS) {
    return true;
  }

  recentTransitionByZone.set(zoneId, now);
  return false;
}

function getMinutesFromTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isScheduleActive(schedule: ZoneSchedule, now = new Date()) {
  if (!schedule.enabled) {
    return true;
  }

  if (!schedule.daysOfWeek.includes(now.getDay())) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = getMinutesFromTime(schedule.startTime);
  const endMinutes = getMinutesFromTime(schedule.endTime);

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isPointInZone(
  point: { latitude: number; longitude: number },
  zone: StoredAutomationZone
): boolean {
  const distance = calculateDistanceMeters(
    point.latitude,
    point.longitude,
    zone.lat,
    zone.lng
  );
  return distance <= zone.radiusMeters;
}

async function postTransitionEvent(options: {
  zone: StoredAutomationZone;
  transition: "enter" | "exit";
  modeApplied: "silent" | "vibrate" | "normal" | "unknown";
  previousMode: "silent" | "vibrate" | "normal" | "unknown";
  applied: boolean;
  blocked: boolean;
  reason?: string | null;
}) {
  const session = await loadStoredSession();
  if (!session?.accessToken) {
    return;
  }

  await apiRequest("/api/events/geofence-transition", {
    method: "POST",
    token: session.accessToken,
    body: {
      transition: options.transition,
      zoneId: options.zone.id,
      zoneName: options.zone.name,
      previousMode: options.previousMode,
      modeApplied: options.modeApplied,
      metadata: {
        source: "background-geofence-android",
        ringerApplied: options.applied,
        blocked: options.blocked,
        reason: options.reason ?? null,
      },
      triggeredAt: new Date().toISOString(),
    },
  });
}

if (Platform.OS === "android" && !TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
    if (error || !data) {
      return;
    }

    const { eventType, region } = data as {
      eventType: Location.GeofencingEventType;
      region: Location.LocationRegion;
    };

    const zones = await loadAutomationZones();
    const zone = zones.find((item) => item.id === region.identifier);
    if (!zone) {
      return;
    }

    if (shouldSkipByCooldown(zone.id)) {
      return;
    }

    const activeStates = await loadActiveZoneStates();
    const transition =
      eventType === Location.GeofencingEventType.Enter ? "enter" : "exit";
    const scheduleActive = isScheduleActive(zone.schedule);

    if (transition === "enter" && !scheduleActive) {
      activeStates[zone.id] = false;
      await saveActiveZoneStates(activeStates);
      await saveLastResult({
        timestamp: new Date().toISOString(),
        transition,
        zoneName: zone.name,
        modeRequested: zone.targetMode,
        applied: false,
        blocked: true,
        reason: "Zone schedule is inactive right now",
      });
      await postTransitionEvent({
        zone,
        transition,
        modeApplied: "unknown",
        previousMode: "normal",
        applied: false,
        blocked: true,
        reason: "Zone schedule is inactive right now",
      });
      return;
    }

    if (transition === "exit" && !activeStates[zone.id]) {
      return;
    }

    const modeRequested: "silent" | "vibrate" | "normal" =
      transition === "enter" ? zone.targetMode : "normal";

    const result = await setRingerMode(modeRequested);
    activeStates[zone.id] = transition === "enter" ? result.applied : false;
    await saveActiveZoneStates(activeStates);

    await saveLastResult({
      timestamp: new Date().toISOString(),
      transition,
      zoneName: zone.name,
      modeRequested,
      applied: result.applied,
      blocked: result.blocked,
      reason: result.reason,
    });

    await postTransitionEvent({
      zone,
      transition,
      modeApplied: result.applied ? modeRequested : "unknown",
      previousMode: transition === "enter" ? "normal" : zone.targetMode,
      applied: result.applied,
      blocked: result.blocked,
      reason: result.reason,
    });
  });
}

export async function syncGeofencesFromApi(accessToken: string) {
  if (Platform.OS !== "android") {
    return;
  }

  const previousStoredZones = await loadAutomationZones();
  const response = await apiRequest<{ zones: Zone[] }>("/api/zones", {
    token: accessToken,
  });

  const activeZones = response.zones.filter((zone) => zone.isActive);
  const storedZones: StoredAutomationZone[] = activeZones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    targetMode: zone.targetMode,
    lat: zone.lat,
    lng: zone.lng,
    radiusMeters: zone.radiusMeters,
    schedule: normalizeZoneSchedule(zone.schedule),
  }));

  await saveAutomationZones(storedZones);
  const previousActiveStates = await loadActiveZoneStates();
  const hadActiveZone = Object.values(previousActiveStates).some(Boolean);
  const previousZoneById = new Map(previousStoredZones.map((zone) => [zone.id, zone]));

  if (storedZones.length === 0) {
    const alreadyRunning = await Location.hasStartedGeofencingAsync(TASK_NAME);
    if (alreadyRunning) {
      await Location.stopGeofencingAsync(TASK_NAME);
    }

    await saveActiveZoneStates({});

    if (hadActiveZone) {
      const lastActiveZoneId = Object.entries(previousActiveStates).find(([, isActive]) => isActive)?.[0];
      const lastActiveZone = lastActiveZoneId ? previousZoneById.get(lastActiveZoneId) : null;
      const result = await setRingerMode("normal");

      await saveLastResult({
        timestamp: new Date().toISOString(),
        transition: "exit",
        zoneName: lastActiveZone?.name ?? "Deleted zone",
        modeRequested: "normal",
        applied: result.applied,
        blocked: result.blocked,
        reason: result.reason,
      });
    }
    return;
  }

  const regions: Location.LocationRegion[] = storedZones.map((zone) => ({
    identifier: zone.id,
    latitude: zone.lat,
    longitude: zone.lng,
    radius: zone.radiusMeters,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));

  await Location.startGeofencingAsync(TASK_NAME, regions);

  // Immediately check current location to activate/deactivate zones without waiting for OS geofence detection
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const currentPoint = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    const desiredActiveZones = storedZones.filter(
      (zone) => isPointInZone(currentPoint, zone) && isScheduleActive(zone.schedule)
    );
    const nextActiveStates = Object.fromEntries(
      storedZones.map((zone) => [zone.id, desiredActiveZones.some((activeZone) => activeZone.id === zone.id)])
    ) as Record<string, boolean>;
    const nextPrimaryZone = desiredActiveZones[0] ?? null;
    const previousActiveZoneId = Object.entries(previousActiveStates).find(([, isActive]) => isActive)?.[0] ?? null;
    const previousActiveZone = previousActiveZoneId ? previousZoneById.get(previousActiveZoneId) ?? null : null;

    if (nextPrimaryZone) {
      const result = await setRingerMode(nextPrimaryZone.targetMode);

      await saveLastResult({
        timestamp: new Date().toISOString(),
        transition: "enter",
        zoneName: nextPrimaryZone.name,
        modeRequested: nextPrimaryZone.targetMode,
        applied: result.applied,
        blocked: result.blocked,
        reason: result.reason,
      });

      if (previousActiveZoneId !== nextPrimaryZone.id || !previousActiveStates[nextPrimaryZone.id]) {
        await postTransitionEvent({
          zone: nextPrimaryZone,
          transition: "enter",
          modeApplied: result.applied ? nextPrimaryZone.targetMode : "unknown",
          previousMode: "normal",
          applied: result.applied,
          blocked: result.blocked,
          reason: result.reason,
        });
      }
    } else if (hadActiveZone) {
      const result = await setRingerMode("normal");

      await saveLastResult({
        timestamp: new Date().toISOString(),
        transition: "exit",
        zoneName: previousActiveZone?.name ?? "Zone sync",
        modeRequested: "normal",
        applied: result.applied,
        blocked: result.blocked,
        reason: result.reason,
      });

      if (previousActiveZone) {
        await postTransitionEvent({
          zone: previousActiveZone,
          transition: "exit",
          modeApplied: result.applied ? "normal" : "unknown",
          previousMode: previousActiveZone.targetMode,
          applied: result.applied,
          blocked: result.blocked,
          reason: result.reason,
        });
      }
    }

    await saveActiveZoneStates(nextActiveStates);
  } catch {
    // Silently fail location check - geofence monitoring will still work
  }
}

export async function startSilentAutomationMonitoring(accessToken: string) {
  if (Platform.OS !== "android") {
    return;
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    await saveLastResult({
      timestamp: new Date().toISOString(),
      transition: "enter",
      zoneName: "Permission",
      modeRequested: "silent",
      applied: false,
      blocked: true,
      reason: "Foreground location permission denied",
    });
    return;
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    await saveLastResult({
      timestamp: new Date().toISOString(),
      transition: "enter",
      zoneName: "Permission",
      modeRequested: "silent",
      applied: false,
      blocked: true,
      reason: "Background location permission denied",
    });
    return;
  }

  await syncGeofencesFromApi(accessToken);
}

export async function stopSilentAutomationMonitoring() {
  if (Platform.OS !== "android") {
    return;
  }
  const started = await Location.hasStartedGeofencingAsync(TASK_NAME);
  if (started) {
    await Location.stopGeofencingAsync(TASK_NAME);
  }
}

export async function getSilentAutomationOverview() {
  if (Platform.OS !== "android") {
    return {
      platform: Platform.OS,
      canControlRinger: false,
      monitoringActive: false,
      zoneCount: 0,
      reason: "Android-only feature",
      lastResult: null as AutomationLastResult | null,
    };
  }

  const status = await getSilentAutomationStatus();
  const zones = await loadAutomationZones();
  const monitoringActive = await Location.hasStartedGeofencingAsync(TASK_NAME);
  const lastResult = await getLastAutomationResult();

  return {
    platform: Platform.OS,
    canControlRinger: status.canControlRinger,
    reason: status.reason,
    monitoringActive,
    zoneCount: zones.length,
    lastResult,
  };
}
