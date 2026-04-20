const fs = require("fs");
const admin = require("firebase-admin");
const env = require("./env");

let initialized = false;
let unavailableReason = "Firebase is not configured";

function buildCredentialFromEnv() {
  if (env.firebaseServiceAccountJson) {
    try {
      const raw = env.firebaseServiceAccountJson.trim();
      const parsed = raw.startsWith("{")
        ? JSON.parse(raw)
        : JSON.parse(fs.readFileSync(raw, "utf8"));
      return admin.credential.cert(parsed);
    } catch (error) {
      unavailableReason = `Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${error.message}`;
      return null;
    }
  }

  if (env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey) {
    return admin.credential.cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: env.firebasePrivateKey.replace(/\\n/g, "\n"),
    });
  }

  unavailableReason =
    "Missing Firebase credentials (set FIREBASE_SERVICE_ACCOUNT_JSON or project/email/key env vars)";
  return null;
}

function initFirebase() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }

  const credential = buildCredentialFromEnv();
  if (!credential) {
    return;
  }

  admin.initializeApp({ credential });
  initialized = true;
  unavailableReason = "";
}

function getFirebaseMessaging() {
  initFirebase();
  if (!initialized || admin.apps.length === 0) {
    return null;
  }
  return admin.messaging();
}

function getFirebaseStatus() {
  initFirebase();
  return {
    enabled: initialized && admin.apps.length > 0,
    reason: unavailableReason,
  };
}

module.exports = {
  getFirebaseMessaging,
  getFirebaseStatus,
};
