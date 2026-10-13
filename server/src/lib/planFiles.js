import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const UPLOADS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");

/**
 * True only for a URL that points at a file this server actually stored
 * (/uploads/<uuid>.<ext>, and the file is really on disk). This is what makes
 * the Estimator's upload gate real: a request can't just claim it attached
 * something by sending an arbitrary string.
 */
export function isStoredUpload(url) {
  if (typeof url !== "string") return false;
  let pathname;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }
  const match = pathname.match(/^\/uploads\/([0-9a-f-]{36}\.[a-z0-9]{2,5})$/i);
  return Boolean(match) && fs.existsSync(path.join(UPLOADS_DIR, match[1]));
}

/** Rewrites an upload URL onto the server's configured public origin. */
export function toPublicUploadUrl(url, serverUrl) {
  try {
    const { pathname } = new URL(url);
    return `${serverUrl}${pathname}`;
  } catch {
    return url;
  }
}

// A renamed file shouldn't be able to open the Estimator, so beyond the
// extension we look at the file's actual leading bytes. Only formats with a
// reliable signature are checked; ArchiCAD's .pln is proprietary with no
// public signature, so it's accepted on extension alone.
const CHECKS = {
  ".pdf": (head) => head.startsWith("%PDF"),
  ".zip": (head) => head.startsWith("PK\u0003\u0004"),
  // AutoCAD versions write "AC1015", "AC1027", ... (older: "AC1.50", "AC2.x")
  ".dwg": (head) => /^AC(1\.|2\.|10)/.test(head),
  ".ifc": (head) => head.includes("ISO-10303-21"),
  ".dxf": (head) => head.startsWith("AutoCAD Binary DXF") || /^\s*0\s+SECTION/.test(head),
};

/** Returns null if the file looks right, or a message explaining why not. */
export function checkPlanFile(originalName, buffer) {
  const ext = path.extname(originalName || "").toLowerCase();
  if (!buffer?.length) return "That file is empty.";
  const check = CHECKS[ext];
  if (!check) return null;
  // latin1 keeps every byte as one character so binary signatures compare cleanly.
  const head = buffer.subarray(0, 256).toString("latin1");
  return check(head) ? null : `That doesn't look like a valid ${ext.slice(1).toUpperCase()} file - it may be corrupted or renamed.`;
}
