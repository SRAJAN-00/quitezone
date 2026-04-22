const mongoose = require("mongoose");
const env = require("./env");

async function dropLegacyUserUsernameIndex() {
  const usersCollection = mongoose.connection.collection("users");

  const indexes = await usersCollection.indexes();
  const hasLegacyUsernameIndex = indexes.some((index) => index.name === "username_1");

  if (!hasLegacyUsernameIndex) {
    return;
  }

  await usersCollection.dropIndex("username_1");
}

async function connectDatabase(uri = env.mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);

  try {
    await dropLegacyUserUsernameIndex();
  } catch (error) {
    const isNamespaceMissing = error && (error.codeName === "NamespaceNotFound" || error.code === 26);
    const isIndexMissing = error && (error.codeName === "IndexNotFound" || error.code === 27);

    if (!isNamespaceMissing && !isIndexMissing) {
      throw error;
    }
  }
}

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectDatabase,
  isDatabaseReady,
};
