const DeviceToken = require("../models/DeviceToken");
const { requireString, requireEnum } = require("../utils/validation");

async function upsertFcmToken(req, res, next) {
  try {
    const token = requireString(req.body.token, "token", { min: 20, max: 4096 });
    const platform = requireEnum(req.body.platform || "android", "platform", [
      "android",
      "ios",
      "web",
    ]);

    const device = await DeviceToken.findOneAndUpdate(
      {
        userId: req.auth.userId,
        token,
      },
      {
        $set: {
          platform,
          isActive: true,
          lastSeenAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.status(201).json({
      device: {
        id: device._id.toString(),
        token: device.token,
        platform: device.platform,
        isActive: device.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  upsertFcmToken,
};
