const path = require("path");
const {
  getMimeType,
  ALLOWED_MIME_TYPES,
} = require("../config/storage");

function validateFileRequest(req, res, next) {
  const { filename } = req.params;

  const mimeType = getMimeType(filename);

  // Validate asset type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: "Invalid asset mimeType type" });
  }

  // Prevent directory traversal
  const normalizedFilename = path
    .normalize(filename)
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join('.', 'assets', normalizedFilename);

  req.mimeType = mimeType;
  req.filePath = filePath;
  next();
}

module.exports = validateFileRequest;
