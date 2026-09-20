import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { uploadBuffer, hasCloudinaryConfig } from "../config/cloudinary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function saveLocally(file, req) {
  const ext = path.extname(file.originalname || "") || "";
  const filename = `${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
  // Absolute URL so it works from the client regardless of API_URL - served
  // by the express.static mount on /uploads in index.js.
  const origin = `${req.protocol}://${req.get("host")}`;
  return { url: `${origin}/uploads/${filename}`, public_id: filename };
}

// Cloudinary when it's actually configured (real deployments), otherwise
// this falls back to the server's own local disk - no external API key
// required to get uploads working out of the box.
async function uploadOne(file, req) {
  if (hasCloudinaryConfig) {
    const result = await uploadBuffer(file.buffer, "civilbridge");
    return { url: result.secure_url, public_id: result.public_id };
  }
  return saveLocally(file, req);
}

// POST /api/uploads/image  (multipart/form-data, field name "file")
// Requires sign-in so anonymous users can't use the app as free file
// hosting. Returns the hosted URL to save on whatever record needs it
// (property image_url, expert avatar_url, estimate attachment_url, etc.)
export async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const data = await uploadOne(req.file, req);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
}

// POST /api/uploads/images  (multipart/form-data, field name "files", up to 10)
// Same as uploadImage but for selecting a whole gallery at once.
export async function uploadImages(req, res) {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }
    const data = await Promise.all(req.files.map((file) => uploadOne(file, req)));
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
}
