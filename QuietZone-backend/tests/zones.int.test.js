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

  it("requires auth token for protected routes", async () => {
    const res = await request(app).get("/api/zones");
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe("AUTH_TOKEN_MISSING");
  });
});
