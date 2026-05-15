import { Platform } from "react-native";

import { apiRequest } from "@/lib/api";
import { isDoNotDisturbActive } from "@/lib/silent-automation/native";

type DevicePlatform = "android" | "ios" | "web";

type RegisterPushResult = {
  registered: boolean;
  reason?: string;
};

type NotificationsModule = {
  AndroidImportance?: {
    MAX?: number;
  };
  addPushTokenListener: (
    listener: (token: { data?: unknown; type?: unknown }) => void
  ) => { remove: () => void };
  getDevicePushTokenAsync: () => Promise<{ data?: unknown; type?: unknown }>;
  getPermissionsAsync: () => Promise<{ granted?: boolean; status?: string }>;
  requestPermissionsAsync: () => Promise<{ granted?: boolean; status?: string }>;
  setNotificationChannelAsync?: (
    channelId: string,
    channel: { name: string; importance?: number; vibrationPattern?: number[]; lightColor?: string }
  ) => Promise<void>;
  setNotificationHandler?: (handler: {
    handleNotification: () => Promise<{
      shouldPlaySound?: boolean;
      shouldSetBadge?: boolean;
      shouldShowAlert?: boolean;
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
    }>;
  }) => void;
};

let tokenListenerAttached = false;
let notificationHandlerConfigured = false;
let latestToken = "";

function loadNotificationsModule(): NotificationsModule | null {
  try {
    return require("expo-notifications") as NotificationsModule;
  } catch {
    return null;
  }
}

function normalizePlatform(value: unknown): DevicePlatform {
  if (value === "android" || value === "ios" || value === "web") {
    return value;
  }
  return Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
}

function extractToken(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value && typeof value === "object" && "data" in value) {
    const nested = (value as { data?: unknown }).data;
    if (typeof nested === "string") {
      return nested.trim();
    }
  }

  return "";
}

async function upsertToken(accessToken: string, token: string, platform: DevicePlatform) {
  await apiRequest("/api/devices/fcm-token", {
    method: "POST",
    token: accessToken,
    body: {
      token,
      platform,
    },
  });
}

async function ensurePermissions(notifications: NotificationsModule) {
  const existing = await notifications.getPermissionsAsync();
  if (existing.granted || existing.status === "granted") {
    return true;
  }

  const requested = await notifications.requestPermissionsAsync();
  return Boolean(requested.granted || requested.status === "granted");
}

async function ensureAndroidChannel(notifications: NotificationsModule) {
  if (Platform.OS !== "android" || !notifications.setNotificationChannelAsync) {
    return;
  }

  const importance = notifications.AndroidImportance?.MAX;
  await notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#1D4ED8",
  });
}

function configureForegroundHandler(notifications: NotificationsModule) {
  if (notificationHandlerConfigured || !notifications.setNotificationHandler) {
    return;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => {
      let suppressAlert = false;
      if (Platform.OS === "android") {
        try {
          const dnd = await isDoNotDisturbActive();
          suppressAlert = Boolean(dnd.active);
        } catch {
          suppressAlert = false;
        }
      }

      return {
        shouldPlaySound: !suppressAlert,
        shouldSetBadge: false,
        shouldShowAlert: !suppressAlert,
        shouldShowBanner: !suppressAlert,
        shouldShowList: !suppressAlert,
      };
    },
  });

  notificationHandlerConfigured = true;
}

function attachTokenListener(notifications: NotificationsModule, accessToken: string) {
  if (tokenListenerAttached) {
    return;
  }

  notifications.addPushTokenListener((nextToken) => {
    const token = extractToken(nextToken);
    if (!token || token === latestToken) {
      return;
    }

    latestToken = token;
    const platform = normalizePlatform(nextToken?.type);
    void upsertToken(accessToken, token, platform).catch(() => {
      // Non-blocking listener path.
    });
  });

  tokenListenerAttached = true;
}

export async function registerDevicePushToken(accessToken: string): Promise<RegisterPushResult> {
  if (!accessToken) {
    return { registered: false, reason: "No access token" };
  }

  if (Platform.OS === "web") {
    return { registered: false, reason: "Web push registration not configured" };
  }

  const notifications = loadNotificationsModule();
  if (!notifications) {
    return { registered: false, reason: "expo-notifications is not installed" };
  }

  configureForegroundHandler(notifications);
  await ensureAndroidChannel(notifications);

  const permissionGranted = await ensurePermissions(notifications);
  if (!permissionGranted) {
    return { registered: false, reason: "Notification permission denied" };
  }

  const rawToken = await notifications.getDevicePushTokenAsync();
  const token = extractToken(rawToken);
  if (!token) {
    return { registered: false, reason: "Device push token unavailable" };
  }

  const platform = normalizePlatform(rawToken?.type);
  await upsertToken(accessToken, token, platform);
  latestToken = token;
  attachTokenListener(notifications, accessToken);

  return { registered: true };
}
