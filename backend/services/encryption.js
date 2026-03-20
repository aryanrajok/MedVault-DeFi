const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Encrypt data with AES-256-GCM
 * @param {Buffer} data - raw data to encrypt
 * @param {string} key - 32-byte hex key
 * @returns {{ encrypted: string, iv: string, tag: string }}
 */
function encrypt(data, key) {
  const keyBuffer = Buffer.from(key, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

/**
 * Decrypt AES-256-GCM encrypted data
 * @param {string} encryptedBase64 - base64 encrypted payload
 * @param {string} key - 32-byte hex key
 * @param {string} ivHex - initialization vector hex
 * @param {string} tagHex - auth tag hex
 * @returns {Buffer}
 */
function decrypt(encryptedBase64, key, ivHex, tagHex) {
  const keyBuffer = Buffer.from(key, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
}

/**
 * Generate a random encryption key
 * @returns {string} 32-byte hex key
 */
function generateKey() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hash data with SHA-256
 */
function hashData(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

module.exports = { encrypt, decrypt, generateKey, hashData };
