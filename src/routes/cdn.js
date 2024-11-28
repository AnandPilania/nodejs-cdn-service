const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const zlib = require("zlib");
const fileValidator = require("../middleware/fileValidator");
const { SECURITY_HEADERS } = require("../config/security");
const { log } = require("../middleware/logging");
const {
  compressAsset,
  selectCompression,
} = require("../middleware/compression");
const { setCache, getCache, deleteCache } = require("../config/caching");
const { ASSET_ZONES, createAssetIdentifier } = require("../config/storage");

router.get("/:filename(*)", fileValidator, async (req, res) => {
  const { filePath } = req;

  try {
    // Generate a cache key
    const mimeType = req.mimeType;
    const fullFilename = `${filePath}`;
    const assetInfo = await createAssetIdentifier(filePath, fullFilename);
    const zoneConfig = ASSET_ZONES[assetInfo.zone] || ASSET_ZONES["dynamic"];

    if (req.query.noCache !== undefined && req.query.noCache !== null) {
      await deleteCache(assetInfo.cacheKey);
    }

    // Check cache first
    const cachedContent = await getCache(assetInfo.cacheKey);
    if (cachedContent) {
      res.set({
        "X-Cache": "HIT",
        "Content-Type": mimeType,
        "X-Asset-Zone": assetInfo.zone,
        ETag: assetInfo.etag,
        "Cache-Control": zoneConfig.cacheControl,
        Vary: zoneConfig.varyHeaders.join(", "),
      });
      return res.send(cachedContent);
    }

    // Read file
    let fileBuffer = await fs.readFile(filePath);

    // Compress asset
    const compressedBuffer = await compressAsset(fileBuffer, mimeType);

    // Set comprehensive headers
    res.set({
      ...Object.fromEntries(Object.entries(SECURITY_HEADERS)),
      "Content-Type": mimeType,
      "X-Cache": "MISS",
      "X-Asset-Zone": assetInfo.zone,
      ETag: assetInfo.etag,
      "Cache-Control": zoneConfig.cacheControl,
      Vary: zoneConfig.varyHeaders.join(", "),
    });

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

    if (req.query.latest === undefined || req.query.latest === null) {
      // Cache the compressed content
      await setCache(assetInfo.cacheKey, compressedBuffer, {
        ttl: 60 * 60 * 24, // 24-hour cache
      });
    }
  } catch (error) {
    log("error", "Asset serving error", {
      filePath,
      error: error.message,
    });

    res.status(500).json({
      error: "Failed to serve asset",
      details:
        process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
});

module.exports = router;
