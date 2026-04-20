import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export type SilentAutomationStatus = {
  canControlRinger: boolean;
  reason?: string | null;
};

export type SilentAutomationAccessResult = {
  granted: boolean;
  reason?: string | null;
};

export type SilentAutomationApplyResult = {
  applied: boolean;
  blocked: boolean;
  reason?: string | null;
};

type SilentAutomationNativeModule = {
  getSilentAutomationStatus: () => Promise<SilentAutomationStatus>;
  requestSilentAutomationAccess: () => Promise<SilentAutomationAccessResult>;
  setRingerMode: (mode: "silent" | "vibrate" | "normal") => Promise<SilentAutomationApplyResult>;
};

const NativeModule = requireOptionalNativeModule<SilentAutomationNativeModule>("SilentAutomation");

function missingModuleReason() {
  return "Native module unavailable. Build and run with an Android dev build.";
}

export async function getSilentAutomationStatus() {
  if (Platform.OS !== "android") {
    return {
      canControlRinger: false,
      reason: "Android-only feature",
    };
  }

  if (!NativeModule) {
    return {
      canControlRinger: false,
      reason: missingModuleReason(),
    };
  }

  return NativeModule.getSilentAutomationStatus();
}

export async function requestSilentAutomationAccess() {
  if (Platform.OS !== "android") {
    return {
      granted: false,
      reason: "Android-only feature",
    };
  }

  if (!NativeModule) {
    return {
      granted: false,
      reason: missingModuleReason(),
    };
  }

  return NativeModule.requestSilentAutomationAccess();
}

export async function setRingerMode(mode: "silent" | "vibrate" | "normal") {
  if (Platform.OS !== "android") {
    return {
      applied: false,
      blocked: true,
      reason: "Android-only feature",
    };
  }

  if (!NativeModule) {
    return {
      applied: false,
      blocked: true,
      reason: missingModuleReason(),
    };
  }

  return NativeModule.setRingerMode(mode);
}
