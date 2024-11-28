const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const bodyParser = require('body-parser');
const corsConfig = require("./config/cors");
const { unless, rateLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./utils/errorHandler");
const monitoringMiddleware = require("./middleware/monitoring");
const metricsService = require("./utils/metrics");
const logger = require("./middleware/logging");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(helmet());
app.use(compression());
app.use(corsConfig);
app.use(unless('/upload', rateLimiter));
app.use(monitoringMiddleware);

// Prometheus metrics endpoint
app.get("/metrics", metricsService.createMetricsRoute());

// Routes
app.use("/cdn", require("./routes/cdn"));
app.use("/upload", require("./routes/upload"));

// Error handling
app.use(errorHandler);

// Startup
const server = app.listen(PORT, () => {
    logger.info(`CDN Service running on port ${PORT}`, {
        env: process.env.NODE_ENV,
    });
});

// Graceful shutdown
process.on("SIGTERM", () => {
    logger.info("SIGTERM received. Shutting down gracefully");
    server.close(() => {
        logger.info("Process terminated");
        process.exit(0);
    });
});

module.exports = app;
