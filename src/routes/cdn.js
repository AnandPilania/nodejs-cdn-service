const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const zlib = require("zlib");
const fileValidator = require("../middleware/fileValidator");
const { SECURITY_HEADERS } = require("../config/security");
const { log } = require("../middleware/logging");
const {
  compressAsset,
  selectCompression,
} = require("../middleware/compression");
const { setCache, getCache, deleteCache } = require("../config/caching");
const {
  ASSET_ZONES,
  detectAssetZone,
  generateFileHash,
  createAssetIdentifier,
} = require("../config/storage");

const setResponseHeaders = (res, mimeType, ETag, zone, zoneConfig) =>
  res.set({
    ...Object.fromEntries(Object.entries(SECURITY_HEADERS)),
    "Content-Type": mimeType,
    "X-Asset-Zone": zone,
    ETag: ETag,
    "Cache-Control": zoneConfig.cacheControl,
    Vary: zoneConfig.varyHeaders.join(", "),
  });

const sendCompressedContent = (res, content, req) => {
  const compressionStream = selectCompression(req);
  if (compressionStream) {
    res.set(
      "Content-Encoding",
      compressionStream instanceof zlib.Gzip ? "gzip" : "deflate",
    );
    compressionStream.pipe(res);
    compressionStream.end(content);
  } else {
    res.send(content);
  }
};

const handleCache = async (
  req,
  res,
  cacheKey,
  content,
  noCache,
  alwaysLatest,
  setCacheFunc,
) => {
  if (noCache) {
    await deleteCache(cacheKey);
  }
  return getCache(cacheKey).then((cachedContent) => {
    if (cachedContent && !alwaysLatest) {
      res.set("X-Cache", "HIT");
      res.send(cachedContent);
    } else {
      res.set("X-Cache", "MISS");
      sendCompressedContent(res, content, req);
      if (!alwaysLatest) {
        setCacheFunc(cacheKey, content, { ttl: 60 * 60 * 24 });
      }
    }
  });
};

const getZoneAndConfig = async (files) => {
  if (files.length === 1) {
    const file = files[0];
    const assetInfo = await createAssetIdentifier(file.filePath, file.filePath);

    return {
      assetInfo,
      zone: assetInfo.zone,
      zoneConfig: ASSET_ZONES[assetInfo.zone] || ASSET_ZONES["dynamic"],
    };
  } else {
    const zone = detectAssetZone(files[0].filePath);
    return {
      zone: zone,
      zoneConfig: ASSET_ZONES[zone] || ASSET_ZONES["dynamic"],
    };
  }
};

router.get("/:assetSrc/:filename(*)", fileValidator, async (req, res) => {
  const files = req.files;
  const mimeType = files[0].mimeType;
  const noCache = req.query.noCache !== undefined && req.query.noCache !== null;
  const alwaysLatest =
    req.query.latest !== undefined && req.query.latest !== null;

  try {
    const { assetInfo, zone, zoneConfig } = await getZoneAndConfig(files);

    let content, cacheKey, ETag;

    if (files.length === 1) {
      const file = files[0];
      cacheKey = assetInfo.cacheKey;
      ETag = assetInfo.etag;
      const fileBuffer = await fs.readFile(file.filePath);
      content = await compressAsset(fileBuffer, mimeType);
    } else {
      const fileContents = await Promise.all(
        files.map((file) => fs.readFile(file.filePath)),
      );
      const concatenatedContent = Buffer.concat(fileContents);
      content = await compressAsset(concatenatedContent, mimeType);
      const hashes = await Promise.all(
        files.map((file) => generateFileHash(file.filePath)),
      );
      cacheKey = `concat-${hashes.join("-")}`;
      ETag = cacheKey;
    }

    setResponseHeaders(res, mimeType, ETag, zone, zoneConfig);
    await handleCache(
      req,
      res,
      cacheKey,
      content,
      noCache,
      alwaysLatest,
      await setCache,
    );
  } catch (error) {
    log("error", "Asset serving error", {
      files,
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
