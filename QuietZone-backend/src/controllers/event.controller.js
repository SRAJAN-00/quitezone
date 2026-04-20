const mongoose = require("mongoose");
const GeofenceEvent = require("../models/GeofenceEvent");
const Zone = require("../models/Zone");
const HttpError = require("../utils/httpError");
const { requireEnum, requireString } = require("../utils/validation");
const { sendTransitionPush } = require("../services/push.service");

function parseTriggeredAt(rawValue) {
  if (!rawValue) {
    return new Date();
  }
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.valueOf())) {
    throw new HttpError(400, "triggeredAt must be a valid date", "VALIDATION_ERROR");
  }
  return parsed;
}

function parseMetadata(rawValue) {
  if (rawValue === undefined) {
    return {};
  }
  if (!rawValue || Array.isArray(rawValue) || typeof rawValue !== "object") {
    throw new HttpError(400, "metadata must be an object", "VALIDATION_ERROR");
  }
  return rawValue;
}

async function createTransitionEvent(req, res, next) {
  try {
    const transition = requireEnum(req.body.transition, "transition", ["enter", "exit"]);
    const modeApplied = req.body.modeApplied
      ? requireString(req.body.modeApplied, "modeApplied", { min: 2, max: 50 })
      : "unknown";
    const previousMode = req.body.previousMode
      ? requireString(req.body.previousMode, "previousMode", { min: 2, max: 50 })
      : "unknown";
    const metadata = parseMetadata(req.body.metadata);
    const triggeredAt = parseTriggeredAt(req.body.triggeredAt);

    let zoneId = null;
    let zoneName = "";

    if (req.body.zoneId) {
      if (!mongoose.Types.ObjectId.isValid(req.body.zoneId)) {
        throw new HttpError(400, "Invalid zoneId", "VALIDATION_ERROR");
      }
      const zone = await Zone.findOne({ _id: req.body.zoneId, ownerId: req.auth.userId });
      if (!zone) {
        throw new HttpError(404, "Zone not found", "ZONE_NOT_FOUND");
      }
      zoneId = zone._id;
      zoneName = zone.name;
    } else if (req.body.zoneName) {
      zoneName = requireString(req.body.zoneName, "zoneName", { min: 2, max: 120 });
    }

    const event = await GeofenceEvent.create({
      userId: req.auth.userId,
      zoneId,
      zoneName,
      transition,
      modeApplied,
      previousMode,
      metadata,
      triggeredAt,
    });

    const pushResult = await sendTransitionPush({
      userId: req.auth.userId,
      transition,
      zoneName,
      modeApplied,
    });

    res.status(201).json({
      event: {
        id: event._id.toString(),
        transition: event.transition,
        zoneId: event.zoneId ? event.zoneId.toString() : null,
        zoneName: event.zoneName,
        modeApplied: event.modeApplied,
        previousMode: event.previousMode,
        triggeredAt: event.triggeredAt,
        createdAt: event.createdAt,
      },
      push: pushResult,
    });
  } catch (error) {
    next(error);
  }
}

async function listEvents(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
    const events = await GeofenceEvent.find({ userId: req.auth.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      events: events.map((event) => ({
        id: event._id.toString(),
        transition: event.transition,
        zoneId: event.zoneId ? event.zoneId.toString() : null,
        zoneName: event.zoneName,
        modeApplied: event.modeApplied,
        previousMode: event.previousMode,
        triggeredAt: event.triggeredAt,
        createdAt: event.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTransitionEvent,
  listEvents,
};
