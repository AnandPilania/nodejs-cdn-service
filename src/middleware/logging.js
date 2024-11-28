const winston = require("winston");
const { createLogger, format, transports } = winston;
const path = require("path");
const metricsService = require("../utils/metrics");

// Custom log format
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.json(),
);

// Log transport configurations
const consoleTransport = new transports.Console({
  format: format.combine(format.colorize(), format.simple()),
});

const fileTransport = new transports.File({
  filename: path.join(__dirname, "../../logs/cdn-combined.log"),
  level: "info",
  format: logFormat,
});

const errorTransport = new transports.File({
  filename: path.join(__dirname, "../../logs/cdn-error.log"),
  level: "error",
  format: logFormat,
});

// Create logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  transports: [consoleTransport, fileTransport, errorTransport],
  exceptionHandlers: [
    new transports.File({
      filename: path.join(__dirname, "../../logs/exceptions.log"),
    }),
  ],
  rejectionHandlers: [
    new transports.File({
      filename: path.join(__dirname, "../../logs/rejections.log"),
    }),
  ],
});

// Enhance logger with metrics tracking
const enhancedLogger = {
  ...logger,
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  log: (level, message, meta = {}) => {
    // Ensure level is a valid winston logging method
    const validLevels = [
      "error",
      "warn",
      "info",
      "http",
      "verbose",
      "debug",
      "silly",
    ];
    const safeLevel = validLevels.includes(level) ? level : "info";

    // Track errors in metrics if applicable
    if (safeLevel === "error" && meta.assetType) {
      metricsService.trackError(meta.errorType || "unknown", meta.assetType);
    }

    // Log the message
    logger[safeLevel](message, meta);
  },
  error: (message, meta = {}) => {
    // Track errors in metrics
    if (meta.assetType) {
      metricsService.trackError(meta.errorType || "unknown", meta.assetType);
    }

    // Log the error
    logger.error(message, meta);
  },
};

module.exports = enhancedLogger;
