const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
const crypto = require("crypto");
const { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require("../config/storage");

const router = express.Router();

const UPLOAD_CONFIG = {
  BASE_UPLOAD_DIR: path.join(".", "assets"),
  MAX_FILE_SIZE: MAX_FILE_SIZE,
  ALLOWED_TYPES: ALLOWED_MIME_TYPES,
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const { fullPath } = req.body;
      const fullDestPath = fullPath
        ? path.join(UPLOAD_CONFIG.BASE_UPLOAD_DIR, path.dirname(fullPath))
        : UPLOAD_CONFIG.BASE_UPLOAD_DIR;

      fs.ensureDirSync(fullDestPath);
      cb(null, fullDestPath);
    },
    filename: (req, file, cb) => {
      const { fullPath, originalname } = req.body;

      if (fullPath) {
        cb(null, path.basename(fullPath));
      } else {
        const hash = crypto.randomBytes(16).toString("hex");
        const ext = path.extname(file.originalname);
        cb(null, `${hash}${ext}`);
      }
    },
  }),
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
  },
});

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const { originalname, filename, path: filePath, mimetype } = req.file;
    const { version, fullPath } = req.body;
    const relativePath =
      fullPath || path.relative(UPLOAD_CONFIG.BASE_UPLOAD_DIR, filePath);

    res.json({
      message: "File uploaded successfully",
      details: {
        originalName: originalname,
        filename,
        path: relativePath,
        mimeType: mimetype,
        version: version || "auto",
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
});

module.exports = router;
