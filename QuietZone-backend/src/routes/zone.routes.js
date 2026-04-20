const { Router } = require("express");
const zoneController = require("../controllers/zone.controller");

const zoneRoutes = Router();

zoneRoutes.get("/", zoneController.listZones);
zoneRoutes.post("/", zoneController.createZone);
zoneRoutes.patch("/:id", zoneController.updateZone);
zoneRoutes.delete("/:id", zoneController.deleteZone);

module.exports = zoneRoutes;
