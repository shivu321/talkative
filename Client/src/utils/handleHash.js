/**
 * utils/handleHash.js
 *
 * Derives the 12-character hex "handle" from a sessionId using the
 * Web Crypto API (SHA-256). This must match the server-side logic in
 * socket/store.js → getHandle().
 *
 * @param {string} sessionId
 * @returns {Promise<string>}  12-char lowercase hex string
 */
export async function computeHandle(sessionId) {
  if (!sessionId) return "";
  const msgBuffer = new TextEncoder().encode(sessionId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 12);
}
