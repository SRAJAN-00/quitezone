const request = require("supertest");
const { createApp } = require("../src/app");

describe("Auth API", () => {
  const app = createApp();

  it("registers and logs in a user", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "user1@example.com",
      password: "password123",
    });

    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.body.user.email).toBe("user1@example.com");
    expect(registerRes.body.user.role).toBe("user");
    expect(registerRes.body.accessToken).toBeTruthy();
    expect(registerRes.body.refreshToken).toBeTruthy();

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "user1@example.com",
      password: "password123",
    });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.user.email).toBe("user1@example.com");
  });

  it("refreshes and logs out", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "refresh@example.com",
      password: "password123",
    });

    const refreshRes = await request(app).post("/api/auth/refresh").send({
      refreshToken: registerRes.body.refreshToken,
    });

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body.accessToken).toBeTruthy();
    expect(refreshRes.body.refreshToken).toBeTruthy();

    const logoutRes = await request(app).post("/api/auth/logout").send({
      refreshToken: refreshRes.body.refreshToken,
    });

    expect(logoutRes.statusCode).toBe(204);
  });

  it("returns structured errors for duplicate registration and invalid login", async () => {
    await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      password: "password123",
    });

    const duplicateRes = await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      password: "password123",
    });
    expect(duplicateRes.statusCode).toBe(409);
    expect(duplicateRes.body.code).toBe("AUTH_EMAIL_EXISTS");

    const invalidLoginRes = await request(app).post("/api/auth/login").send({
      email: "dup@example.com",
      password: "wrong-pass",
    });
    expect(invalidLoginRes.statusCode).toBe(401);
    expect(invalidLoginRes.body.code).toBe("AUTH_INVALID_CREDENTIALS");
  });
});
