import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "quietzone.session";

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
};

function isWebStorageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export async function loadStoredSession() {
  if (Platform.OS === "web") {
    if (!isWebStorageAvailable()) {
      return null;
    }

    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }

  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return raw ? (JSON.parse(raw) as StoredSession) : null;
}

export async function saveStoredSession(session: StoredSession) {
  const raw = JSON.stringify(session);

  if (Platform.OS === "web") {
    if (isWebStorageAvailable()) {
      window.localStorage.setItem(SESSION_KEY, raw);
    }
    return;
  }

  await SecureStore.setItemAsync(SESSION_KEY, raw);
}

export async function clearStoredSession() {
  if (Platform.OS === "web") {
    if (isWebStorageAvailable()) {
      window.localStorage.removeItem(SESSION_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}
