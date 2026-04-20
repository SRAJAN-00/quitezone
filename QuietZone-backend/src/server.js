const { createApp } = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/db");
const { validateProductionConfig } = require("./config/runtime");

async function bootstrap() {
  const configIssues = validateProductionConfig();
  if (configIssues.length > 0) {
    throw new Error(`Invalid production configuration:\n- ${configIssues.join("\n- ")}`);
  }

  await connectDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`QuietZone backend listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
