const metricsService = require("../utils/metrics");
const { performance } = require("perf_hooks");

function monitoringMiddleware(req, res, next) {
  const startTime = performance.now();
  const filename = req.params.filename || "unknown";

  // Wrap response end to track metrics
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = (performance.now() - startTime) / 1000; // Convert to seconds
    const status = res.statusCode;

    // Track request metrics
    metricsService.trackRequest(
      filename,
      status < 400 ? "success" : "error",
      duration,
    );

    // Track error if applicable
    if (status >= 400) {
      metricsService.trackError(`http_${status}`, filename);
    }

    return originalEnd.apply(this, args);
  };

  next();
}

module.exports = monitoringMiddleware;
