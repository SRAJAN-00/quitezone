const { Router } = require("express");
const eventController = require("../controllers/event.controller");

const eventRoutes = Router();

eventRoutes.get("/", eventController.listEvents);
eventRoutes.post("/geofence-transition", eventController.createTransitionEvent);

module.exports = eventRoutes;
