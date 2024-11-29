const path = require("path");
const {
  getMimeType,
  SUPPORTED_MULTI_MIMES,
  ALLOWED_MIME_TYPES,
} = require("../config/storage");

function validateFileRequest(req, res, next) {
  const { assetSrc, filename: files } = req.params;
  const filePaths = files.split(",").map((f) => f.trim());

  const validatedFiles = [];
  const mimeTypes = new Set();

  for (const filename of filePaths) {
    const mimeType = getMimeType(filename);

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: "Invalid asset mimeType type" });
    }

    mimeTypes.add(mimeType);

    const normalizedFilename = path
      .normalize(filename)
      .replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(".", "assets", assetSrc, normalizedFilename);

    validatedFiles.push({ filePath, mimeType, src: assetSrc, ext: path.extname(filename).toLowerCase() });
  }

  if (filePaths.length > 1) {
    const allowedTypes = new Set(SUPPORTED_MULTI_MIMES);
    if (!allowedTypes.has(mimeTypes.values().next().value)) {
      return res.status(400).json({
        error:
          "Multiple files must be of the same type and either JavaScript or CSS",
      });
    }
    if (new Set(mimeTypes).size > 1) {
      return res
        .status(400)
        .json({ error: "All files must have the same MIME type" });
    }
  }

  req.files = validatedFiles;

  next();
}

module.exports = validateFileRequest;
