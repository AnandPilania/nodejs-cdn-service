const sharp = require("sharp");
const zlib = require("zlib");

const compressionStrategies = {
    image: async (buffer, quality = 80) => {
        return sharp(buffer).webp({ quality }).toBuffer();
    },
    script: (buffer) => {
        // Minification would ideally happen during build
        return buffer;
    },
    default: (buffer) => buffer,
};

async function compressAsset(buffer, mimeType) {
    const type = mimeType.split("/")[0];
    const compressor =
        compressionStrategies[type] || compressionStrategies.default;

    return compressor(buffer);
}

function selectCompression(req) {
    const acceptEncoding = req.headers["accept-encoding"] || "";

    if (acceptEncoding.includes("gzip")) return zlib.createGzip();
    if (acceptEncoding.includes("deflate")) return zlib.createDeflate();

    return null;
}

module.exports = {
    compressAsset,
    selectCompression,
};
