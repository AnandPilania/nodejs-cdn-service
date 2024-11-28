const rateLimit = require("express-rate-limit");
const { RATE_LIMIT } = require("../config/security");

const rateLimiter = rateLimit({
    windowMs: RATE_LIMIT.windowMs,
    max: RATE_LIMIT.max,
    message: "Too many requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: "Rate limit exceeded",
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000 / 60),
        });
    },
});

const unless = (path, middleware) => (req, res, next) => (path === req.path ? next() : middleware(req, res, next));

module.exports = {
    unless, rateLimiter
};
