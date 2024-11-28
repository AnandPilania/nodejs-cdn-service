const prometheus = require("prom-client");

class MetricsService {
  constructor() {
    // Configure Prometheus
    prometheus.collectDefaultMetrics();

    // Custom CDN-specific metrics
    this.initializeMetrics();
  }

  initializeMetrics() {
    // Request Metrics
    this.requestCounter = new prometheus.Counter({
      name: "cdn_total_requests",
      help: "Total number of CDN requests",
      labelNames: ["filename", "status"],
    });

    this.requestDuration = new prometheus.Histogram({
      name: "cdn_request_duration_seconds",
      help: "CDN request processing duration in seconds",
      labelNames: ["filename", "status"],
      buckets: [0.1, 0.3, 0.5, 1, 3, 5, 10],
    });

    // Cache Metrics
    this.cacheHitCounter = new prometheus.Counter({
      name: "cdn_cache_hits_total",
      help: "Total number of cache hits",
      labelNames: ["filename"],
    });

    this.cacheMissCounter = new prometheus.Counter({
      name: "cdn_cache_misses_total",
      help: "Total number of cache misses",
      labelNames: ["filename"],
    });

    this.cacheHitRatio = new prometheus.Gauge({
      name: "cdn_cache_hit_ratio",
      help: "Ratio of cache hits to total requests",
      labelNames: ["filename"],
    });

    // Error Metrics
    this.errorCounter = new prometheus.Counter({
      name: "cdn_errors_total",
      help: "Total number of errors in CDN service",
      labelNames: ["error_type", "filename"],
    });

    // File Size Metrics
    this.fileSizeHistogram = new prometheus.Histogram({
      name: "cdn_file_size_bytes",
      help: "Distribution of file sizes served",
      labelNames: ["filename"],
      buckets: [
        1024, // 1 KB
        10 * 1024, // 10 KB
        100 * 1024, // 100 KB
        1024 * 1024, // 1 MB
        10 * 1024 * 1024, // 10 MB
        50 * 1024 * 1024, // 50 MB
      ],
    });
  }

  // Request Tracking
  trackRequest(filename, status, duration) {
    this.requestCounter.inc({
      filename: filename,
      status,
    });

    this.requestDuration.observe(
      {
        filename: filename,
        status,
      },
      duration,
    );
  }

  // Cache Tracking
  trackCache(filename, isHit) {
    if (isHit) {
      this.cacheHitCounter.inc({ filename: filename });
    } else {
      this.cacheMissCounter.inc({ filename: filename });
    }

    // Calculate and update cache hit ratio
    const hits = this.cacheHitCounter.labels(filename).get().values[0];
    const misses = this.cacheMissCounter.labels(filename).get().values[0];
    const ratio = hits / (hits + misses);

    this.cacheHitRatio.set({ filename: filename }, ratio || 0);
  }

  // Error Tracking
  trackError(errorType, filename) {
    this.errorCounter.inc({
      error_type: errorType,
      filename: filename,
    });
  }

  // File Size Tracking
  trackFileSize(filename, sizeInBytes) {
    this.fileSizeHistogram.observe({ filename: filename }, sizeInBytes);
  }

  // Expose Prometheus metrics endpoint
  createMetricsRoute() {
    return async (req, res) => {
      res.set("Content-Type", prometheus.register.contentType);
      res.end(await prometheus.register.metrics());
    };
  }
}

// Singleton export
module.exports = new MetricsService();
