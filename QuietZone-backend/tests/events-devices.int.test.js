const request = require("supertest");
const { createApp } = require("../src/app");

async function registerAndLogin(app, email) {
  const response = await request(app).post("/api/auth/register").send({
    email,
    password: "password123",
  });
  return response.body.accessToken;
}

describe("Events & Devices API", () => {
  const app = createApp();

  it("creates transition events and lists them", async () => {
    const token = await registerAndLogin(app, "events@example.com");
    const zoneRes = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Main Library",
        lat: 12.91,
        lng: 74.85,
        radiusMeters: 100,
        targetMode: "silent",
      });

    const eventRes = await request(app)
      .post("/api/events/geofence-transition")
      .set("Authorization", `Bearer ${token}`)
      .send({
        transition: "enter",
        zoneId: zoneRes.body.zone.id,
        modeApplied: "silent",
        previousMode: "normal",
        metadata: { source: "test" },
      });

    expect(eventRes.statusCode).toBe(201);
    expect(eventRes.body.event.transition).toBe("enter");
    expect(eventRes.body.event.zoneName).toBe("Main Library");
    expect(eventRes.body.event.metadata.source).toBe("test");
    expect(eventRes.body.event.metadata.push).toBeDefined();
    expect(eventRes.body.event.metadata.push.reason).toBe("No device tokens");

    const listRes = await request(app)
      .get("/api/events?limit=1")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.events.length).toBe(1);
    expect(listRes.body.events[0].metadata.source).toBe("test");
    expect(listRes.body.events[0].metadata.push).toBeDefined();
    expect(listRes.body.events[0].metadata.push.reason).toBe("No device tokens");
  });

  it("filters events by zone id", async () => {
    const token = await registerAndLogin(app, "events-filter@example.com");
    const firstZoneRes = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Studio",
        lat: 12.91,
        lng: 74.85,
        radiusMeters: 100,
        targetMode: "silent",
      });
    const secondZoneRes = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Office",
        lat: 12.92,
        lng: 74.86,
        radiusMeters: 120,
        targetMode: "vibrate",
      });

    await request(app)
      .post("/api/events/geofence-transition")
      .set("Authorization", `Bearer ${token}`)
      .send({
        transition: "enter",
        zoneId: firstZoneRes.body.zone.id,
        modeApplied: "silent",
        previousMode: "normal",
        metadata: { source: "test-a" },
      });

    await request(app)
      .post("/api/events/geofence-transition")
      .set("Authorization", `Bearer ${token}`)
      .send({
        transition: "enter",
        zoneId: secondZoneRes.body.zone.id,
        modeApplied: "vibrate",
        previousMode: "normal",
        metadata: { source: "test-b" },
      });

    const filteredRes = await request(app)
      .get(`/api/events?limit=10&zoneId=${firstZoneRes.body.zone.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(filteredRes.statusCode).toBe(200);
    expect(filteredRes.body.events).toHaveLength(1);
    expect(filteredRes.body.events[0].zoneName).toBe("Studio");
  });

  it("rejects invalid event payload metadata", async () => {
    const token = await registerAndLogin(app, "events-invalid@example.com");
    const res = await request(app)
      .post("/api/events/geofence-transition")
      .set("Authorization", `Bearer ${token}`)
      .send({
        transition: "enter",
        metadata: "invalid",
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("upserts FCM token and validates token shape", async () => {
    const token = await registerAndLogin(app, "device@example.com");
    const upsertRes = await request(app)
      .post("/api/devices/fcm-token")
      .set("Authorization", `Bearer ${token}`)
      .send({
        token: "fcm-token-abcdefghijklmnopqrstuvwxyz-1234567890",
        platform: "android",
      });
    expect(upsertRes.statusCode).toBe(201);
    expect(upsertRes.body.device.platform).toBe("android");

    const invalidRes = await request(app)
      .post("/api/devices/fcm-token")
      .set("Authorization", `Bearer ${token}`)
      .send({
        token: "short",
        platform: "android",
      });
    expect(invalidRes.statusCode).toBe(400);
    expect(invalidRes.body.code).toBe("VALIDATION_ERROR");
  });

  it("skips push when zone is set to only notify on failures", async () => {
    const token = await registerAndLogin(app, "events-push-rules@example.com");
    const zoneRes = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Reading Room",
        lat: 12.91,
        lng: 74.85,
        radiusMeters: 100,
        targetMode: "silent",
        notifications: {
          enabled: true,
          notifyOnEnter: true,
          notifyOnExit: true,
          onlyOnFailure: true,
        },
      });

    const eventRes = await request(app)
      .post("/api/events/geofence-transition")
      .set("Authorization", `Bearer ${token}`)
      .send({
        transition: "enter",
        zoneId: zoneRes.body.zone.id,
        modeApplied: "silent",
        previousMode: "normal",
        metadata: { source: "test", blocked: false },
      });

    expect(eventRes.statusCode).toBe(201);
    expect(eventRes.body.push.reason).toBe("Configured to notify only on failures");
  });
});
