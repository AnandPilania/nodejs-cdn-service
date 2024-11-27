const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const zlib = require("zlib");
const crypto = require("crypto");

const fileValidator = require("../middleware/fileValidator");
const { SECURITY_HEADERS } = require("../config/security");
const { log } = require("../middleware/logging");
const {
    compressAsset,
    selectCompression,
} = require("../middleware/compression");
const { setCache, getCache, deleteCache } = require("../config/caching");
const { getMimeType } = require("../config/storage");

router.get("/:assetType/:filename(*)", fileValidator, async (req, res) => {
    const { filePath } = req;
    const mimeType = getMimeType(req.params.filename);

    try {
        // Generate a cache key
        const fileHash = crypto
            .createHash("md5")
            .update(await fs.readFile(filePath))
            .digest("hex");
        const cacheKey = `cdn:${req.params.assetType}:${req.params.filename}:${fileHash}`;

        if(req.query.noCache !== undefined && req.query.noCache !== null) {
            await deleteCache(cacheKey);
        }

        // Check cache first
        const cachedContent = await getCache(cacheKey);
        if (cachedContent) {
            res.set("X-Cache", "HIT");
            res.set("Content-Type", mimeType);
            res.set("ETag", etag);
            return res.send(cachedContent);
        }

        // Read file
        let fileBuffer = await fs.readFile(filePath);

        // Compress asset
        const compressedBuffer = await compressAsset(fileBuffer, mimeType);

        // Set security and caching headers
        Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
            res.set(header, value);
        });
        res.set("Content-Type", mimeType);
        res.set(
            "Cache-Control",
            "public, max-age=86400, stale-while-revalidate=3600",
        );
        res.set("ETag", fileHash);
        res.set("X-Cache", "MISS");

        // Optional compression based on client support
        const compressionStream = selectCompression(req);

        if (compressionStream) {
            res.set(
                "Content-Encoding",
                compressionStream instanceof zlib.Gzip ? "gzip" : "deflate",
            );
            compressionStream.pipe(res);
            compressionStream.end(compressedBuffer);
        } else {
            res.send(compressedBuffer);
        }

        // Cache the compressed content
        await setCache(cacheKey, compressedBuffer, {
            ttl: 60 * 60 * 24, // 24-hour cache
        });
    } catch (error) {
        log("error", "Asset serving error", {
            filePath,
            error: error.message,
        });

        res.status(500).json({
            error: "Failed to serve asset",
            details:
                process.env.NODE_ENV !== "production"
                    ? error.message
                    : undefined,
        });
    }
});

module.exports = router;
