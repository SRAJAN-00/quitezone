const request = require("supertest");
const { createApp } = require("../src/app");
const User = require("../src/models/User");

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
    await createUser({
      email: "member@example.com",
      password: "password123",
      role: "user",
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
    expect(overviewRes.body.recentUsers).toHaveLength(2);

    const usersRes = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`);

    expect(usersRes.statusCode).toBe(200);
    const member = usersRes.body.users.find((user) => user.email === "member@example.com");
    expect(member).toBeTruthy();
    expect(member.role).toBe("user");

    const updateRes = await request(app)
      .patch(`/api/admin/users/${member.id}/role`)
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
