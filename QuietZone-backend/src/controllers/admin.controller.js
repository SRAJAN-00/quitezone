const mongoose = require("mongoose");
const GeofenceEvent = require("../models/GeofenceEvent");
const User = require("../models/User");
const Zone = require("../models/Zone");
const HttpError = require("../utils/httpError");
const { requireEnum } = require("../utils/validation");

function toUserResponse(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toZoneResponse(zone) {
  return {
    id: zone._id.toString(),
    name: zone.name,
    ownerId: zone.ownerId?._id ? zone.ownerId._id.toString() : zone.ownerId.toString(),
    ownerEmail: zone.ownerId?.email || null,
    radiusMeters: zone.radiusMeters,
    targetMode: zone.targetMode,
    isActive: zone.isActive,
    lat: zone.center.coordinates[1],
    lng: zone.center.coordinates[0],
    createdAt: zone.createdAt,
    updatedAt: zone.updatedAt,
  };
}

function toEventResponse(event) {
  return {
    id: event._id.toString(),
    transition: event.transition,
    zoneId: event.zoneId ? event.zoneId.toString() : null,
    zoneName: event.zoneName,
    modeApplied: event.modeApplied,
    previousMode: event.previousMode,
    triggeredAt: event.triggeredAt,
    createdAt: event.createdAt,
    userId: event.userId?._id ? event.userId._id.toString() : event.userId?.toString?.() ?? null,
    userEmail: event.userId?.email || null,
  };
}

async function getOverview(_req, res, next) {
  try {
    const [userCount, zoneCount, eventCount, recentUsers, recentZones, recentEvents] = await Promise.all([
      User.countDocuments(),
      Zone.countDocuments(),
      GeofenceEvent.countDocuments(),
      User.find().sort({ createdAt: -1 }).limit(5).lean(),
      Zone.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("ownerId", "email")
        .lean(),
      GeofenceEvent.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("userId", "email")
        .lean(),
    ]);

    res.json({
      counts: {
        users: userCount,
        zones: zoneCount,
        events: eventCount,
      },
      recentUsers: recentUsers.map(toUserResponse),
      recentZones: recentZones.map(toZoneResponse),
      recentEvents: recentEvents.map(toEventResponse),
    });
  } catch (error) {
    next(error);
  }
}

async function listUsers(_req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.json({
      users: users.map(toUserResponse),
    });
  } catch (error) {
    next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      throw new HttpError(400, "Invalid userId", "VALIDATION_ERROR");
    }

    const role = requireEnum(req.body.role, "role", ["user", "admin"]);
    if (req.auth.userId === req.params.userId && role !== "admin") {
      throw new HttpError(400, "You cannot remove your own admin role", "ADMIN_SELF_ROLE_CHANGE_BLOCKED");
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      throw new HttpError(404, "User not found", "AUTH_USER_NOT_FOUND");
    }

    user.role = role;
    await user.save();

    res.json({
      user: toUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  listUsers,
  updateUserRole,
};
