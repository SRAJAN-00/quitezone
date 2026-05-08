const request = require("supertest");
const { createApp } = require("../src/app");

async function registerAndLogin(app, email) {
  const response = await request(app).post("/api/auth/register").send({
    email,
    password: "password123",
  });
  return response.body.accessToken;
}

describe("Zone API", () => {
  const app = createApp();

  it("rejects radius below 50m", async () => {
    const token = await registerAndLogin(app, "zone1@example.com");

    const res = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Classroom A",
        lat: 12.91,
        lng: 74.85,
        radiusMeters: 40,
        targetMode: "silent",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch("radiusMeters");
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("enforces zone ownership on update/delete", async () => {
    const ownerToken = await registerAndLogin(app, "owner@example.com");
    const attackerToken = await registerAndLogin(app, "attacker@example.com");

    const createRes = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "Library",
        lat: 12.91,
        lng: 74.85,
        radiusMeters: 100,
        targetMode: "vibrate",
      });

    expect(createRes.statusCode).toBe(201);
    const zoneId = createRes.body.zone.id;

    const updateRes = await request(app)
      .patch(`/api/zones/${zoneId}`)
      .set("Authorization", `Bearer ${attackerToken}`)
      .send({ name: "Hacked" });
    expect(updateRes.statusCode).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/zones/${zoneId}`)
      .set("Authorization", `Bearer ${attackerToken}`);
    expect(deleteRes.statusCode).toBe(404);
    expect(deleteRes.body.code).toBe("ZONE_NOT_FOUND");
  });

  it("creates and updates a scheduled zone", async () => {
    const token = await registerAndLogin(app, "schedule@example.com");

    const createRes = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Campus Library",
        lat: 12.91,
        lng: 74.85,
        radiusMeters: 150,
        targetMode: "silent",
        schedule: {
          enabled: true,
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: "09:00",
          endTime: "17:00",
        },
      });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.zone.schedule).toEqual({
      enabled: true,
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "17:00",
    });

    const updateRes = await request(app)
      .patch(`/api/zones/${createRes.body.zone.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        schedule: {
          enabled: true,
          daysOfWeek: [0, 6],
          startTime: "10:30",
          endTime: "14:00",
        },
      });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.zone.schedule).toEqual({
      enabled: true,
      daysOfWeek: [0, 6],
      startTime: "10:30",
      endTime: "14:00",
    });
  });

  it("rejects enabled schedules without any days", async () => {
    const token = await registerAndLogin(app, "invalidschedule@example.com");

    const res = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Lecture Hall",
        lat: 12.91,
        lng: 74.85,
        radiusMeters: 100,
        targetMode: "silent",
        schedule: {
          enabled: true,
          daysOfWeek: [],
          startTime: "09:00",
          endTime: "17:00",
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch("schedule.daysOfWeek");
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("requires auth token for protected routes", async () => {
    const res = await request(app).get("/api/zones");
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("AUTH_TOKEN_MISSING");
  });
});
