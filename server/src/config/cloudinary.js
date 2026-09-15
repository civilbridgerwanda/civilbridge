import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const hasCloudinaryConfig =
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export { cloudinary, hasCloudinaryConfig };

/** Uploads a buffer (e.g. from multer memory storage) to Cloudinary. */
export function uploadBuffer(buffer, folder = "civilbridge") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    uploadStream.end(buffer);
  });
}
