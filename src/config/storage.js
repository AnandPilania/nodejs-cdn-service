const path = require("path");
const mime = require("mime-types");
const fs = require("fs").promises;
const crypto = require("crypto");

const getMimeType = (filename) => {
    return mime.lookup(filename) || "application/octet-stream";
};

const generateFileHash = async (filePath) =>
    crypto
        .createHash("md5")
        .update(await fs.readFile(filePath))
        .digest("hex")
        .slice(0, 12);

const detectAssetZone = (filename) => {
    if (/\.(js|css|png|jpg|svg|woff2)$/.test(filename)) {
        return "static";
    }
    return "dynamic";
};

const createAssetIdentifier = async (filePath, filename) => {
    const fileStats = path.parse(filename);
    const contentHash = await generateFileHash(filePath);

    // Determine asset zone
    const zone = detectAssetZone(filename);

    // Create comprehensive identifier
    return {
        contentHash,
        zone,
        cacheKey: `cdn:${zone}:${fileStats.base}:${contentHash}`,
        etag: `${contentHash}`,
    };
};

module.exports = {
    createAssetIdentifier,
    detectAssetZone,
    generateFileHash,
    getMimeType,
    ASSET_ZONES: {
        static: {
            cacheControl: "public, max-age=31536000, immutable",
            varyHeaders: ["Accept-Encoding"],
        },
        dynamic: {
            cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
            varyHeaders: ["Accept-Encoding", "X-Version"],
        },
    },
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_MIME_TYPES: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "application/pdf",
        "text/javascript",
        "application/javascript",
        "text/css",
        "image/x-icon",
        "image/svg+xml",
        "font/woff",
        "font/woff2",
        "application/json",
        "font/ttf",
        "application/vnd.ms-fontobject",
        "application/octet-stream",
        "application/x-pdf"
    ],
};
