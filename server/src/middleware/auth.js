import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_only_insecure_secret";

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

// Attaches req.user if a valid Bearer token is present; does not reject
// the request if one is missing (use requireAuth for that).
export function attachUser(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
}
