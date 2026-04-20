const mongoose = require("mongoose");
const Zone = require("../models/Zone");
const HttpError = require("../utils/httpError");
const { requireNumber, requireString, requireEnum } = require("../utils/validation");

function normalizeZonePayload(payload) {
  const name = requireString(payload.name, "name", { min: 2, max: 120 });
  const lat = requireNumber(payload.lat, "lat", { min: -90, max: 90 });
  const lng = requireNumber(payload.lng, "lng", { min: -180, max: 180 });
  const radiusMeters = requireNumber(payload.radiusMeters, "radiusMeters", { min: 50, max: 3000 });
  const targetMode = requireEnum(payload.targetMode, "targetMode", ["silent", "vibrate"]);
  const isActive = payload.isActive === undefined ? true : Boolean(payload.isActive);

  return {
    name,
    center: {
      type: "Point",
      coordinates: [lng, lat],
    },
    radiusMeters,
    targetMode,
    isActive,
  };
}

function mapZone(zone) {
  return {
    id: zone._id.toString(),
    name: zone.name,
    lat: zone.center.coordinates[1],
    lng: zone.center.coordinates[0],
    radiusMeters: zone.radiusMeters,
    targetMode: zone.targetMode,
    isActive: zone.isActive,
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
      lat: req.body.lat ?? current.center.coordinates[1],
      lng: req.body.lng ?? current.center.coordinates[0],
      radiusMeters: req.body.radiusMeters ?? current.radiusMeters,
      targetMode: req.body.targetMode ?? current.targetMode,
      isActive: req.body.isActive ?? current.isActive,
    };
    const normalized = normalizeZonePayload(mergedPayload);

    current.name = normalized.name;
    current.center = normalized.center;
    current.radiusMeters = normalized.radiusMeters;
    current.targetMode = normalized.targetMode;
    current.isActive = normalized.isActive;
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
