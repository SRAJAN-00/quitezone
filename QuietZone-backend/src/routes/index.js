const { Router } = require("express");
const authRoutes = require("./auth.routes");
const zoneRoutes = require("./zone.routes");
const deviceRoutes = require("./device.routes");
const eventRoutes = require("./event.routes");
const { requireAuth } = require("../middlewares/auth.middleware");
const { getFirebaseStatus } = require("../config/firebase");
const { isDatabaseReady } = require("../config/db");

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: {
      connected: isDatabaseReady(),
    },
    firebase: getFirebaseStatus(),
  });
});

router.get("/ready", (_req, res) => {
  const databaseReady = isDatabaseReady();
  const firebaseStatus = getFirebaseStatus();

  const ready = databaseReady;
  const statusCode = ready ? 200 : 503;
  res.status(statusCode).json({
    status: ready ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        ok: databaseReady,
      },
      firebase: {
        ok: firebaseStatus.enabled,
        reason: firebaseStatus.reason,
      },
    },
  });
});

router.use("/api/auth", authRoutes);
router.use("/api/zones", requireAuth, zoneRoutes);
router.use("/api/devices", requireAuth, deviceRoutes);
router.use("/api/events", requireAuth, eventRoutes);

module.exports = router;
