const DeviceToken = require("../models/DeviceToken");
const { getFirebaseMessaging, getFirebaseStatus } = require("../config/firebase");

function shouldSendPush(transition, notifications, blocked) {
  const settings = notifications || {
    enabled: true,
    notifyOnEnter: true,
    notifyOnExit: true,
    onlyOnFailure: false,
  };

  if (!settings.enabled) {
    return { allowed: false, reason: "Notifications disabled for this zone" };
  }

  if (transition === "enter" && !settings.notifyOnEnter) {
    return { allowed: false, reason: "Enter notifications disabled for this zone" };
  }

  if (transition === "exit" && !settings.notifyOnExit) {
    return { allowed: false, reason: "Exit notifications disabled for this zone" };
  }

  if (settings.onlyOnFailure && !blocked) {
    return { allowed: false, reason: "Configured to notify only on failures" };
  }

  return { allowed: true };
}

async function sendTransitionPush({ userId, transition, zoneName, modeApplied, blocked, notifications }) {
  const policy = shouldSendPush(transition, notifications, blocked);
  if (!policy.allowed) {
    return { sent: 0, failed: 0, reason: policy.reason };
  }

  const devices = await DeviceToken.find({ userId, isActive: true }).lean();
  if (devices.length === 0) {
    return { sent: 0, failed: 0, reason: "No device tokens" };
  }

  const firebaseStatus = getFirebaseStatus();
  if (!firebaseStatus.enabled) {
    return { sent: 0, failed: 0, reason: firebaseStatus.reason };
  }

  const messaging = getFirebaseMessaging();
  const tokens = devices.map((item) => item.token);
  const title = transition === "enter" ? "Quiet mode activated" : "Sound restored";
  const body =
    transition === "enter"
      ? `${zoneName || "A zone"} entered. Mode: ${modeApplied || "silent"}.`
      : `${zoneName || "A zone"} exited. Previous sound profile restored.`;

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: {
      transition,
      zoneName: zoneName || "",
      modeApplied: modeApplied || "unknown",
      blocked: blocked ? "true" : "false",
      sentAt: new Date().toISOString(),
    },
    android: {
      priority: "high",
    },
  });

  const invalidTokens = [];
  response.responses.forEach((item, index) => {
    if (!item.success) {
      const code = item.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token")
      ) {
        invalidTokens.push(tokens[index]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    await DeviceToken.updateMany(
      { userId, token: { $in: invalidTokens } },
      { $set: { isActive: false } }
    );
  }

  return {
    sent: response.successCount,
    failed: response.failureCount,
  };
}

module.exports = {
  sendTransitionPush,
};
