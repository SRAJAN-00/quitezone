const { Router } = require("express");
const deviceController = require("../controllers/device.controller");

const deviceRoutes = Router();

deviceRoutes.post("/fcm-token", deviceController.upsertFcmToken);

module.exports = deviceRoutes;
