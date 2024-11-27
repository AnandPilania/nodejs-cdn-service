const cors = require("cors");

const corsOptions = {
    origin: (origin, callback) => {
        const whitelist = [
            "https://yourmain.domain",
            "http://localhost:3000",
            "https://staging.yourdomain.com",
        ];

        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed"), false);
        }
    },
    methods: ["GET", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 3600,
};

module.exports = cors(corsOptions);
