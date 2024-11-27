function errorHandler(err, req, res, next) {
    const { log } = require("../middleware/logging");

    log("error", "Unhandled error", {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
    });

    const statusCode = err.status || 500;
    res.status(statusCode).json({
        status: "error",
        statusCode: statusCode,
        message:
            process.env.NODE_ENV === "production"
                ? "An unexpected error occurred"
                : err.message,
    });
}

module.exports = errorHandler;
