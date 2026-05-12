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

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatUtcDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function createRecentDayBuckets(days) {
  const today = startOfUtcDay(new Date());
  const firstDay = addUtcDays(today, -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const date = addUtcDays(firstDay, index);
    return {
      key: formatUtcDayKey(date),
      date,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    };
  });
}

function toCountMap(rows) {
  return rows.reduce((map, row) => {
    if (row && typeof row._id === "string") {
      map.set(row._id, row.count);
    }
    return map;
  }, new Map());
}

async function getRecentDailyCounts(Model, dateField, fromDate) {
  const rows = await Model.aggregate([
    {
      $match: {
        [dateField]: {
          $gte: fromDate,
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: `$${dateField}`,
          },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return toCountMap(rows);
}

async function getOverview(_req, res, next) {
  try {
    const dailyBuckets = createRecentDayBuckets(7);
    const firstBucketDate = dailyBuckets[0].date;

    const [
      userCount,
      zoneCount,
      eventCount,
      adminCount,
      activeZoneCount,
      enterEventCount,
      recentUsers,
      recentZones,
      recentEvents,
      userDailyCounts,
      zoneDailyCounts,
      eventDailyCounts,
    ] = await Promise.all([
      User.countDocuments(),
      Zone.countDocuments(),
      GeofenceEvent.countDocuments(),
      User.countDocuments({ role: "admin" }),
      Zone.countDocuments({ isActive: true }),
      GeofenceEvent.countDocuments({ transition: "enter" }),
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
      getRecentDailyCounts(User, "createdAt", firstBucketDate),
      getRecentDailyCounts(Zone, "createdAt", firstBucketDate),
      getRecentDailyCounts(GeofenceEvent, "triggeredAt", firstBucketDate),
    ]);

    const analytics = {
      roleBreakdown: {
        admin: adminCount,
        user: Math.max(userCount - adminCount, 0),
      },
      zoneStatus: {
        active: activeZoneCount,
        paused: Math.max(zoneCount - activeZoneCount, 0),
      },
      eventTransitions: {
        enter: enterEventCount,
        exit: Math.max(eventCount - enterEventCount, 0),
      },
      recentDailyActivity: dailyBuckets.map((bucket) => ({
        date: bucket.key,
        label: bucket.label,
        users: userDailyCounts.get(bucket.key) ?? 0,
        zones: zoneDailyCounts.get(bucket.key) ?? 0,
        events: eventDailyCounts.get(bucket.key) ?? 0,
      })),
    };

    res.json({
      counts: {
        users: userCount,
        zones: zoneCount,
        events: eventCount,
      },
      analytics,
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
