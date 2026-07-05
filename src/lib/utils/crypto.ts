import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer | null {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return null;
  return crypto.scryptSync(key, "judgment-trainer-salt", 32);
}

export function encrypt(text: string): string {
  const key = getKey();
  if (!key) return text; // Fallback: plaintext if no encryption key set
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encoded: string): string {
  // If not in encrypted format, return as-is (backward compat with plaintext keys)
  if (!encoded.startsWith("enc:")) return encoded;
  const key = getKey();
  if (!key) return encoded;
  const parts = encoded.split(":");
  if (parts.length < 4) return encoded;
  const [, ivHex, authTagHex, ...rest] = parts;
  const encrypted = rest.join(":");
  if (!ivHex || !authTagHex || !encrypted) return encoded;
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
