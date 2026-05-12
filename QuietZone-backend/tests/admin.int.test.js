const request = require("supertest");
const { createApp } = require("../src/app");
const GeofenceEvent = require("../src/models/GeofenceEvent");
const User = require("../src/models/User");
const Zone = require("../src/models/Zone");

describe("Admin API", () => {
  const app = createApp();

  async function createUser({ email, password, role = "user" }) {
    const user = new User({ email, role });
    await user.setPassword(password);
    await user.save();
    return user;
  }

  it("blocks non-admin users from admin routes", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "plain-user@example.com",
      password: "password123",
    });

    const overviewRes = await request(app)
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${registerRes.body.accessToken}`);

    expect(overviewRes.statusCode).toBe(403);
    expect(overviewRes.body.code).toBe("AUTH_FORBIDDEN");
  });

  it("returns overview and allows role updates for admin users", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });
    const member = await createUser({
      email: "member@example.com",
      password: "password123",
      role: "user",
    });
    const zone = await Zone.create({
      ownerId: admin._id,
      name: "Library",
      center: {
        type: "Point",
        coordinates: [77.5946, 12.9716],
      },
      radiusMeters: 120,
      targetMode: "silent",
      isActive: true,
    });
    await GeofenceEvent.create({
      userId: member._id,
      zoneId: zone._id,
      zoneName: zone.name,
      transition: "enter",
      modeApplied: "silent",
      previousMode: "normal",
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: admin.email,
      password: "password123",
    });

    const overviewRes = await request(app)
      .get("/api/admin/overview")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`);

    expect(overviewRes.statusCode).toBe(200);
    expect(overviewRes.body.counts.users).toBe(2);
    expect(overviewRes.body.counts.zones).toBe(1);
    expect(overviewRes.body.counts.events).toBe(1);
    expect(overviewRes.body.recentUsers).toHaveLength(2);
    expect(overviewRes.body.analytics.roleBreakdown).toEqual({
      admin: 1,
      user: 1,
    });
    expect(overviewRes.body.analytics.zoneStatus).toEqual({
      active: 1,
      paused: 0,
    });
    expect(overviewRes.body.analytics.eventTransitions).toEqual({
      enter: 1,
      exit: 0,
    });
    expect(overviewRes.body.analytics.recentDailyActivity).toHaveLength(7);
    expect(
      overviewRes.body.analytics.recentDailyActivity.some(
        (day) => day.users > 0 || day.zones > 0 || day.events > 0
      )
    ).toBe(true);

    const usersRes = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`);

    expect(usersRes.statusCode).toBe(200);
    const listedMember = usersRes.body.users.find((user) => user.email === "member@example.com");
    expect(listedMember).toBeTruthy();
    expect(listedMember.role).toBe("user");

    const updateRes = await request(app)
      .patch(`/api/admin/users/${listedMember.id}/role`)
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
      .send({ role: "admin" });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.user.role).toBe("admin");
  });

  it("prevents an admin from removing their own admin role", async () => {
    const admin = await createUser({
      email: "self-admin@example.com",
      password: "password123",
      role: "admin",
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: admin.email,
      password: "password123",
    });

    const updateRes = await request(app)
      .patch(`/api/admin/users/${admin._id.toString()}/role`)
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`)
      .send({ role: "user" });

    expect(updateRes.statusCode).toBe(400);
    expect(updateRes.body.code).toBe("ADMIN_SELF_ROLE_CHANGE_BLOCKED");
  });
});
