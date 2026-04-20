import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { apiRequest } from "@/lib/api";
import { Zone } from "@/lib/quietzone-types";
import { loadStoredSession } from "@/lib/session-storage";

import { getSilentAutomationStatus, setRingerMode } from "./native";

const TASK_NAME = "quietzone-android-geofence-task";
const ZONES_KEY = "quietzone.automation.zones";
const LAST_RESULT_KEY = "quietzone.automation.lastResult";
const COOLDOWN_MS = 20000;

const recentTransitionByZone = new Map<string, number>();

type StoredAutomationZone = Pick<
  Zone,
  "id" | "name" | "targetMode" | "lat" | "lng" | "radiusMeters"
>;

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

    const transition =
      eventType === Location.GeofencingEventType.Enter ? "enter" : "exit";
    const modeRequested: "silent" | "vibrate" | "normal" =
      transition === "enter" ? zone.targetMode : "normal";

    const result = await setRingerMode(modeRequested);

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
  }));

  await saveAutomationZones(storedZones);

  if (storedZones.length === 0) {
    const alreadyRunning = await Location.hasStartedGeofencingAsync(TASK_NAME);
    if (alreadyRunning) {
      await Location.stopGeofencingAsync(TASK_NAME);
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
