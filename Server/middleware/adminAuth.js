/**
 * middleware/adminAuth.js
 * JWT verification middleware — protects all admin data endpoints.
 */
import jwt from "jsonwebtoken";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "talkative_admin_secret_dev";

/**
 * Express middleware that validates the Bearer JWT on admin routes.
 * Attaches decoded payload to req.admin.
 */
export function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Sign a new admin JWT (24-hour expiry).
 * @param {string} username
 * @returns {string}
 */
export function signAdminToken(username) {
  return jwt.sign({ username, role: "admin" }, ADMIN_JWT_SECRET, { expiresIn: "24h" });
}

/**
 * Sign a short-lived OTP-verified token (10-minute expiry).
 * This proves the OTP step was completed before the login form is shown.
 * @param {string} email
 * @returns {string}
 */
export function signOTPToken(email) {
  return jwt.sign({ email, otpVerified: true }, ADMIN_JWT_SECRET, { expiresIn: "10m" });
}

/**
 * Verify the OTP-step token.
 * @param {string} token
 * @returns {{ email: string, otpVerified: boolean }|null}
 */
export function verifyOTPToken(token) {
  try {
    return jwt.verify(token, ADMIN_JWT_SECRET);
  } catch {
    return null;
  }
}
