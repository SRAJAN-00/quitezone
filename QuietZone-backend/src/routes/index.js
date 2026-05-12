const { Router } = require("express");
const authRoutes = require("./auth.routes");
const zoneRoutes = require("./zone.routes");
const deviceRoutes = require("./device.routes");
const eventRoutes = require("./event.routes");
const adminRoutes = require("./admin.routes");
const feedbackRoutes = require("./feedback.routes");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
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
router.use("/api/feedback", requireAuth, feedbackRoutes);
router.use("/api/admin", requireAuth, requireRole(["admin"]), adminRoutes);

module.exports = router;
