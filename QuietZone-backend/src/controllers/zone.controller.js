const mongoose = require("mongoose");
const Zone = require("../models/Zone");
const HttpError = require("../utils/httpError");
const {
  requireNumber,
  requireString,
  requireEnum,
} = require("../utils/validation");

function requireTimeString(value, fieldName) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    throw new HttpError(400, `${fieldName} must be in HH:mm format`, "VALIDATION_ERROR");
  }

  return value;
}

function normalizeZoneSchedule(schedule) {
  if (!schedule || typeof schedule !== "object") {
    return {
      enabled: false,
      daysOfWeek: [],
      startTime: "09:00",
      endTime: "17:00",
    };
  }

  const enabled = Boolean(schedule.enabled);
  const daysOfWeek = Array.isArray(schedule.daysOfWeek)
    ? schedule.daysOfWeek.map((day) => requireNumber(day, "schedule.daysOfWeek", { min: 0, max: 6 }))
    : [];
  const uniqueDays = [...new Set(daysOfWeek)].sort((a, b) => a - b);
  const startTime = requireTimeString(schedule.startTime ?? "09:00", "schedule.startTime");
  const endTime = requireTimeString(schedule.endTime ?? "17:00", "schedule.endTime");

  if (enabled && uniqueDays.length === 0) {
    throw new HttpError(400, "schedule.daysOfWeek must include at least one day", "VALIDATION_ERROR");
  }

  if (enabled && startTime === endTime) {
    throw new HttpError(400, "schedule start and end must be different", "VALIDATION_ERROR");
  }

  return {
    enabled,
    daysOfWeek: uniqueDays,
    startTime,
    endTime,
  };
}

function normalizeZoneNotifications(notifications) {
  if (!notifications || typeof notifications !== "object") {
    return {
      enabled: true,
      notifyOnEnter: true,
      notifyOnExit: true,
      onlyOnFailure: false,
    };
  }

  return {
    enabled: notifications.enabled === undefined ? true : Boolean(notifications.enabled),
    notifyOnEnter:
      notifications.notifyOnEnter === undefined
        ? true
        : Boolean(notifications.notifyOnEnter),
    notifyOnExit:
      notifications.notifyOnExit === undefined
        ? true
        : Boolean(notifications.notifyOnExit),
    onlyOnFailure:
      notifications.onlyOnFailure === undefined
        ? false
        : Boolean(notifications.onlyOnFailure),
  };
}

function normalizeZonePayload(payload) {
  const name = requireString(payload.name, "name", { min: 2, max: 120 });
  const address = typeof payload.address === "string" ? payload.address.trim() : "";
  const lat = requireNumber(payload.lat, "lat", { min: -90, max: 90 });
  const lng = requireNumber(payload.lng, "lng", { min: -180, max: 180 });
  const radiusMeters = requireNumber(payload.radiusMeters, "radiusMeters", { min: 50, max: 3000 });
  const targetMode = requireEnum(payload.targetMode, "targetMode", ["silent", "vibrate"]);
  const isActive = payload.isActive === undefined ? true : Boolean(payload.isActive);
  const schedule = normalizeZoneSchedule(payload.schedule);
  const notifications = normalizeZoneNotifications(payload.notifications);
  const normalizedAddress = address ? requireString(address, "address", { min: 2, max: 255 }) : undefined;

  return {
    name,
    address: normalizedAddress,
    center: {
      type: "Point",
      coordinates: [lng, lat],
    },
    radiusMeters,
    targetMode,
    isActive,
    schedule,
    notifications,
  };
}

function mapZone(zone) {
  return {
    id: zone._id.toString(),
    name: zone.name,
    address: zone.address ?? undefined,
    lat: zone.center.coordinates[1],
    lng: zone.center.coordinates[0],
    radiusMeters: zone.radiusMeters,
    targetMode: zone.targetMode,
    isActive: zone.isActive,
    schedule: zone.schedule ?? {
      enabled: false,
      daysOfWeek: [],
      startTime: "09:00",
      endTime: "17:00",
    },
    notifications: zone.notifications ?? {
      enabled: true,
      notifyOnEnter: true,
      notifyOnExit: true,
      onlyOnFailure: false,
    },
    ownerId: zone.ownerId.toString(),
    createdAt: zone.createdAt,
    updatedAt: zone.updatedAt,
  };
}

async function listZones(req, res, next) {
  try {
    const zones = await Zone.find({ ownerId: req.auth.userId }).sort({ createdAt: -1 });
    res.json({ zones: zones.map(mapZone) });
  } catch (error) {
    next(error);
  }
}

async function createZone(req, res, next) {
  try {
    const normalized = normalizeZonePayload(req.body);
    const zone = await Zone.create({
      ...normalized,
      ownerId: req.auth.userId,
    });
    res.status(201).json({ zone: mapZone(zone) });
  } catch (error) {
    next(error);
  }
}

async function updateZone(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError(400, "Invalid zone id", "VALIDATION_ERROR");
    }

    const current = await Zone.findOne({ _id: id, ownerId: req.auth.userId });
    if (!current) {
      throw new HttpError(404, "Zone not found", "ZONE_NOT_FOUND");
    }

    const mergedPayload = {
      name: req.body.name ?? current.name,
      address: req.body.address ?? current.address,
      lat: req.body.lat ?? current.center.coordinates[1],
      lng: req.body.lng ?? current.center.coordinates[0],
      radiusMeters: req.body.radiusMeters ?? current.radiusMeters,
      targetMode: req.body.targetMode ?? current.targetMode,
      isActive: req.body.isActive ?? current.isActive,
      schedule: req.body.schedule ?? current.schedule,
      notifications: req.body.notifications ?? current.notifications,
    };
    const normalized = normalizeZonePayload(mergedPayload);

    current.name = normalized.name;
    current.address = normalized.address;
    current.center = normalized.center;
    current.radiusMeters = normalized.radiusMeters;
    current.targetMode = normalized.targetMode;
    current.isActive = normalized.isActive;
    current.schedule = normalized.schedule;
    current.notifications = normalized.notifications;
    await current.save();

    res.json({ zone: mapZone(current) });
  } catch (error) {
    next(error);
  }
}

async function deleteZone(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError(400, "Invalid zone id", "VALIDATION_ERROR");
    }

    const deleted = await Zone.findOneAndDelete({ _id: id, ownerId: req.auth.userId });
    if (!deleted) {
      throw new HttpError(404, "Zone not found", "ZONE_NOT_FOUND");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listZones,
  createZone,
  updateZone,
  deleteZone,
};
