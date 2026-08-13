import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

type Envelope = { v: 1; iv: string; tag: string; data: string };

function encryptionKey() {
  const configured = String(process.env.TEAM_PORTAL_TOKEN_ENCRYPTION_KEY || "").trim();
  if (configured.length < 32) throw new Error("TEAM_PORTAL_ENCRYPTION_CONFIGURATION_MISSING");

  if (/^[a-f0-9]{64}$/i.test(configured)) return Buffer.from(configured, "hex");
  try {
    const decoded = Buffer.from(configured, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    // A long passphrase is supported and deterministically reduced below.
  }
  return createHash("sha256").update(configured, "utf8").digest();
}

export function encryptSecret(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const envelope: Envelope = {
    v: 1,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    data: encrypted.toString("base64url"),
  };
  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
}

export function decryptSecret<T>(value: string): T {
  const envelope = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Envelope;
  if (envelope.v !== 1) throw new Error("Unsupported encrypted credential version.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(envelope.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
