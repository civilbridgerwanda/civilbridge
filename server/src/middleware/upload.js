import path from "path";
import multer from "multer";

const storage = multer.memoryStorage();

// The Estimator's gate: a real plan/drawing/document. Matched on the file
// extension because browsers report CAD files inconsistently (a .dwg often
// arrives as application/octet-stream, or with no type at all), so a MIME
// allow-list would reject exactly the files this exists to accept. The
// controller then checks the file's actual first bytes (see planFiles.js).
export const PLAN_FILE_LABELS = {
  ".pdf": "PDF",
  ".dwg": "AutoCAD drawing (DWG)",
  ".dxf": "CAD exchange file (DXF)",
  ".pln": "ArchiCAD project (PLN)",
  ".ifc": "BIM model (IFC)",
  ".zip": "ZIP bundle of plan sheets",
};

export const planUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (PLAN_FILE_LABELS[ext]) return cb(null, true);
    cb(new Error(`Unsupported file type. Please upload one of: ${Object.keys(PLAN_FILE_LABELS).join(", ")}`));
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB - raised from 10MB to fit a short plan walkthrough video
  fileFilter(req, file, cb) {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "application/zip",
      "application/x-zip-compressed",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG, WEBP, GIF, PDF, MP4, WEBM, MOV, or ZIP files are allowed"));
  },
});
