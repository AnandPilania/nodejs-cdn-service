const path = require("path");
const mime = require("mime-types");

module.exports = {
    ASSET_TYPES: {
        images: path.join(__dirname, "../../assets/images"),
        videos: path.join(__dirname, "../../assets/videos"),
        documents: path.join(__dirname, "../../assets/documents"),
        scripts: path.join(__dirname, "../../assets/scripts"),
        styles: path.join(__dirname, "../../assets/styles"),
        public: path.join(__dirname, "../../assets/public"),
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
        "text/css",
        "application/octet-stream",
    ],
    getMimeType: (filename) => {
        return mime.lookup(filename) || "application/octet-stream";
    },
};
