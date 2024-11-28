const winston = require("winston");
const { createLogger, format, transports } = winston;
const path = require("path");
const metricsService = require("../utils/metrics");

const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.json(),
);

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

const enhancedLogger = {
  ...logger,
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  log: (level, message, meta = {}) => {
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

    if (safeLevel === "error" && meta.assetType) {
      metricsService.trackError(meta.errorType || "unknown", meta.assetType);
    }

    logger[safeLevel](message, meta);
  },
  error: (message, meta = {}) => {
    if (meta.assetType) {
      metricsService.trackError(meta.errorType || "unknown", meta.assetType);
    }

    logger.error(message, meta);
  },
};

module.exports = enhancedLogger;
