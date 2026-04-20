const cors = require("cors");
const express = require("express");
const env = require("./config/env");
const routes = require("./routes");
const { requestLogger } = require("./middlewares/request-logger.middleware");
const { errorHandler, notFoundHandler } = require("./middlewares/error.middleware");

function createApp() {
  const app = express();
  app.use(
    cors({
      origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","),
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(requestLogger);

  app.use(routes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = {
  createApp,
};
