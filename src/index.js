const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const bodyParser = require("body-parser");
const corsConfig = require("./config/cors");
const { unless, rateLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./utils/errorHandler");
const monitoringMiddleware = require("./middleware/monitoring");
const metricsService = require("./utils/metrics");
const logger = require("./middleware/logging");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(helmet());
app.use(compression());
app.use(unless("/upload", rateLimiter));
app.use(monitoringMiddleware);

app.get("/metrics", metricsService.createMetricsRoute());

app.use("/cdn", corsConfig.cdn, require("./routes/cdn"));
app.use("/upload", corsConfig.upload, require("./routes/upload"));

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`CDN Service running on port ${PORT}`, {
    env: process.env.NODE_ENV,
  });
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

module.exports = app;
