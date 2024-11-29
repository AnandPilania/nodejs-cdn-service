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
) => {
  if (noCache) {
    await deleteCache(cacheKey);
  }
  return getCache(cacheKey).then(async (cachedContent) => {
    if (cachedContent && !alwaysLatest) {
      res.set("X-Cache", "HIT");
      res.send(cachedContent);
    } else {
      res.set("X-Cache", "MISS");
      sendCompressedContent(res, content, req);
      if (!alwaysLatest) {
        await setCache(cacheKey, content);
      }
    }
  });
};

const getZoneAndConfig = async (files) => {
  const zone = detectAssetZone(files[0].filePath);
  return {
    zone,
    zoneConfig: ASSET_ZONES[zone] || ASSET_ZONES["dynamic"],
  };
};

const hasVal = (key) => key !== undefined && key !== null;

const resolveFilePath = async (file, identifier, isCssOrJs = false) => {
  const fallbackPaths = [
    file.filePath,
    file.filePath.replace(file.src, "org1"),
    file.filePath.replace(`\\${file.src}`, ""),
  ];

  for (const path of fallbackPaths) {
      console.log(path);
    try {
      const content = await fs.readFile(path);
      if (path !== file.filePath && isCssOrJs) {
        identifier += `\n/*--- PATH UPDATED: ${path} ---*/\n`;
      }
      file.filePath = path;
      return { content, identifier };
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  if (!isCssOrJs) {
    throw new Error("File not found");
  }

  return { content: Buffer.from(`/* 404 */`), identifier };
};

router.get("/:assetSrc/:filename(*)", fileValidator, async (req, res) => {
  const files = req.files;
  const mimeType = files[0].mimeType;
  const noCache = hasVal(req.query.noCache);
  const alwaysLatest = hasVal(req.query.latest);
  let cacheKey = "cdn";

  try {
    const { zone, zoneConfig } = await getZoneAndConfig(files);
    const fileContents = await Promise.all(
      files.map(async (file) => {
        const isCssOrJs = [".css", ".js"].includes(file.ext);
        const { content, identifier } = await resolveFilePath(
          file,
          `\n/*--- File: ${file.filePath} ---*/\n`,
          isCssOrJs,
        );

        if (!isCssOrJs) {
          return content;
        }

        const identifierBuffer = Buffer.from(identifier);

        const cKey = ":" + (await generateFileHash(file.filePath));
        cacheKey += cKey;

        return Buffer.concat([identifierBuffer, content, identifierBuffer]);
      }),
    );
    const concatenatedContent = Buffer.concat(fileContents);
    const content = await compressAsset(concatenatedContent, mimeType);

    setResponseHeaders(res, mimeType, cacheKey, zone, zoneConfig);
    await handleCache(req, res, cacheKey, content, noCache, alwaysLatest);
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
