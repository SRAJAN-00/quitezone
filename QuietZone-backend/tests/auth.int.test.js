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
    expect(registerRes.body.user.notificationDefaults).toEqual({
      enabled: true,
      notifyOnEnter: true,
      notifyOnExit: true,
      onlyOnFailure: false,
    });
    expect(registerRes.body.accessToken).toBeTruthy();
    expect(registerRes.body.refreshToken).toBeTruthy();

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "user1@example.com",
      password: "password123",
    });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.user.email).toBe("user1@example.com");
    expect(loginRes.body.user.notificationDefaults).toEqual({
      enabled: true,
      notifyOnEnter: true,
      notifyOnExit: true,
      onlyOnFailure: false,
    });
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

  it("gets and updates notification preferences", async () => {
    const registerRes = await request(app).post("/api/auth/register").send({
      email: "prefs@example.com",
      password: "password123",
    });
    const token = registerRes.body.accessToken;

    const getRes = await request(app)
      .get("/api/auth/preferences")
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.notificationDefaults).toEqual({
      enabled: true,
      notifyOnEnter: true,
      notifyOnExit: true,
      onlyOnFailure: false,
    });

    const patchRes = await request(app)
      .patch("/api/auth/preferences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        notificationDefaults: {
          notifyOnEnter: false,
          onlyOnFailure: true,
        },
      });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.notificationDefaults).toEqual({
      enabled: true,
      notifyOnEnter: false,
      notifyOnExit: true,
      onlyOnFailure: true,
    });

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.user.notificationDefaults).toEqual({
      enabled: true,
      notifyOnEnter: false,
      notifyOnExit: true,
      onlyOnFailure: true,
    });
  });

  it("rejects unauthenticated and invalid preferences updates", async () => {
    const unauthRes = await request(app).get("/api/auth/preferences");
    expect(unauthRes.statusCode).toBe(401);
    expect(unauthRes.body.code).toBe("AUTH_TOKEN_MISSING");

    const registerRes = await request(app).post("/api/auth/register").send({
      email: "prefs-invalid@example.com",
      password: "password123",
    });
    const token = registerRes.body.accessToken;

    const invalidRes = await request(app)
      .patch("/api/auth/preferences")
      .set("Authorization", `Bearer ${token}`)
      .send({
        notificationDefaults: "invalid",
      });
    expect(invalidRes.statusCode).toBe(400);
    expect(invalidRes.body.code).toBe("VALIDATION_ERROR");
  });
});
