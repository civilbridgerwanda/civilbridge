import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG, WEBP, GIF, or PDF files are allowed"));
  },
});
