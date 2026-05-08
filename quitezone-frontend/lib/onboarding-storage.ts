import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ONBOARDING_PREFIX = "quietzone.onboarding.dismissed";

function getKey(userId: string) {
  return `${ONBOARDING_PREFIX}.${userId}`;
}

function isWebStorageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export async function loadOnboardingDismissed(userId: string) {
  const key = getKey(userId);

  if (Platform.OS === "web") {
    if (!isWebStorageAvailable()) {
      return false;
    }

    return window.localStorage.getItem(key) === "true";
  }

  return (await SecureStore.getItemAsync(key)) === "true";
}

export async function saveOnboardingDismissed(userId: string, dismissed: boolean) {
  const key = getKey(userId);
  const value = dismissed ? "true" : "false";

  if (Platform.OS === "web") {
    if (isWebStorageAvailable()) {
      window.localStorage.setItem(key, value);
    }
    return;
  }

  await SecureStore.setItemAsync(key, value);
}
