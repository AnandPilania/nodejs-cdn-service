const path = require("path");
const {
    ASSET_TYPES,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
} = require("../config/storage");

function validateFileRequest(req, res, next) {
    const { assetType, filename } = req.params;

    // Validate asset type
    if (!ASSET_TYPES[assetType]) {
        return res.status(400).json({ error: "Invalid asset type" });
    }

    // Prevent directory traversal
    const normalizedFilename = path
        .normalize(filename)
        .replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(ASSET_TYPES[assetType], normalizedFilename);

    // Additional security checks
    if (!filePath.startsWith(ASSET_TYPES[assetType])) {
        return res.status(403).json({ error: "Access denied" });
    }

    // Optional: Add mime type validation if needed
    // You'd need to implement mime type detection here

    req.filePath = filePath;
    next();
}

module.exports = validateFileRequest;
