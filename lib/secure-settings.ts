import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

function secretKey() {
  const secret =
    process.env.ARAY_SETTINGS_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    "aray-local-development-secret";
  return createHash("sha256").update(secret).digest();
}

export function encryptSettingValue(value: string) {
  if (!value) return value;
  if (value.startsWith(PREFIX)) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

export function decryptSettingValue(value: string | undefined) {
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value;

  try {
    const packed = Buffer.from(value.slice(PREFIX.length), "base64url");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const encrypted = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
