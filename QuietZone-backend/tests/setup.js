const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

jest.setTimeout(30000);

function getTestMongoUri() {
  return process.env.TEST_MONGODB_URI || "mongodb://127.0.0.1:27017/quietzone_test";
}

async function canConnect(uri) {
  try {
    const connection = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 1500,
    }).asPromise();
    await connection.close();
    return true;
  } catch (_error) {
    return false;
  }
}

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  process.env.JWT_ACCESS_TTL = "1h";
  process.env.JWT_REFRESH_TTL_DAYS = "7";

  const testMongoUri = getTestMongoUri();

  if (await canConnect(testMongoUri)) {
    await mongoose.connect(testMongoUri);
    return;
  }

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return;
  }

  await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});
