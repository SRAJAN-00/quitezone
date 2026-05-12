const request = require("supertest");
const { createApp } = require("../src/app");
const User = require("../src/models/User");

async function registerAndLogin(app, email) {
  const response = await request(app).post("/api/auth/register").send({
    email,
    password: "password123",
  });
  return response.body.accessToken;
}

describe("Feedback API", () => {
  const app = createApp();

  it("submits feedback and lists it for the same user", async () => {
    const token = await registerAndLogin(app, "feedback-user@example.com");

    const submitRes = await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rating: 5,
        comment: "Very useful for class-time silent automation.",
      });

    expect(submitRes.statusCode).toBe(201);
    expect(submitRes.body.feedback.rating).toBe(5);

    const listRes = await request(app)
      .get("/api/feedback")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.feedback).toHaveLength(1);
    expect(listRes.body.feedback[0].comment).toContain("silent automation");
  });

  it("lets admin list all feedback entries", async () => {
    const userToken = await registerAndLogin(app, "feedback-normal@example.com");
    await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        rating: 4,
        comment: "Good app but map UX can improve.",
      });

    const adminToken = await registerAndLogin(app, "feedback-admin@example.com");
    const admin = await User.findOne({ email: "feedback-admin@example.com" });
    admin.role = "admin";
    await admin.save();

    const adminList = await request(app)
      .get("/api/feedback")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(adminList.statusCode).toBe(200);
    expect(adminList.body.feedback.length).toBeGreaterThanOrEqual(1);
  });
});
