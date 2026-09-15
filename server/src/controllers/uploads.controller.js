import { uploadBuffer, hasCloudinaryConfig } from "../config/cloudinary.js";

// POST /api/uploads/image  (multipart/form-data, field name "file")
// Requires sign-in so anonymous users can't use the app as free file
// hosting. Returns the hosted URL to save on whatever record needs it
// (property image_url, expert avatar_url, estimate attachment_url, etc.)
export async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    if (!hasCloudinaryConfig) {
      return res.status(503).json({
        success: false,
        message:
          "Image uploads aren't configured yet - add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to the server .env.",
      });
    }

    const result = await uploadBuffer(req.file.buffer, "civilbridge");
    res.json({
      success: true,
      data: { url: result.secure_url, public_id: result.public_id },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
}
