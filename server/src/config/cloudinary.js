import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// The .env template ships with literal placeholder values
// (CLOUDINARY_API_KEY=your_api_key, etc.) so the app runs out of the box
// without anyone needing a Cloudinary account - treat those placeholders
// the same as "unset", not as real config, or every upload would fail
// trying to authenticate with them (see uploads.controller.js's local-disk
// fallback for what handles uploads instead).
function isRealValue(value) {
  return Boolean(value) && !value.startsWith("your_");
}

const hasCloudinaryConfig =
  isRealValue(process.env.CLOUDINARY_CLOUD_NAME) &&
  isRealValue(process.env.CLOUDINARY_API_KEY) &&
  isRealValue(process.env.CLOUDINARY_API_SECRET);

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export { cloudinary, hasCloudinaryConfig };

/**
 * Uploads a buffer (e.g. from multer memory storage) to Cloudinary.
 * `resource_type: "auto"` lets the same endpoint accept images, PDFs (plan
 * documents), and video - Cloudinary's "image" resource type only reliably
 * handles actual images.
 */
export function uploadBuffer(buffer, folder = "civilbridge") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder, resource_type: "auto" }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    uploadStream.end(buffer);
  });
}
