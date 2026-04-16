const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOADS_DIR = path.join(__dirname, "../../public/uploads");
const MAX_FILE_SIZE = 60 * 1024 * 1024; // 60MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function validateImage(file) {
  if (!file) {
    return "请选择要上传的图片";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "图片大小不能超过 60MB";
  }

  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return "仅支持 JPG、PNG、WebP 格式";
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return "文件扩展名不支持";
  }

  return null;
}

function generateFilename(originalName) {
  const ext = path.extname(originalName || ".jpg").toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");

  return `${timestamp}-${random}${ext}`;
}

function createLocalUploader() {
  ensureUploadsDir();

  return function uploadToLocal(file) {
    const filename = generateFilename(file.originalname);
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, file.buffer);

    return `/uploads/${filename}`;
  };
}

function createCosUploader(prefix) {
  const COS = require("cos-nodejs-sdk-v5");
  const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY
  });
  const bucket = process.env.COS_BUCKET;
  const region = process.env.COS_REGION;
  const keyPrefix = prefix || "uploads";

  return function uploadToCos(file) {
    const filename = `${keyPrefix}/${generateFilename(file.originalname)}`;

    return new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: bucket,
        Region: region,
        Key: filename,
        Body: file.buffer,
        ContentLength: file.size,
        ACL: "public-read"
      }, (err, _data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(`https://${bucket}.cos.${region}.myqcloud.com/${filename}`);
      });
    });
  };
}

function createUploader(prefix) {
  if (process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY) {
    console.log("[upload] COS credentials found, creating COS uploader for prefix:", prefix);
    try {
      return createCosUploader(prefix);
    } catch (err) {
      console.error("[upload] COS uploader init failed:", err.message);
    }
  } else {
    console.log("[upload] No COS credentials, using local uploader");
  }

  return createLocalUploader();
}

module.exports = {
  createUploader,
  validateImage,
  ALLOWED_TYPES,
  MAX_FILE_SIZE
};
