/**
 * Encrypt / decrypt Google OAuth refresh tokens at rest.
 * Uses AES-256-GCM with a key derived from ADMIN_SESSION_SECRET.
 * Never log plaintext tokens or ciphertext payloads.
 */

function requireEncryptionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET is required to store Google credentials.",
    );
  }
  return secret;
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  // Keep the existing key material label so any previously stored ciphertext
  // (from the Gmail-only reconnect path) remains decryptable.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`autodv8ions-gmail-v1:${secret}`),
  );
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const buf = Buffer.from(padded, "base64");
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  return copy;
}

/** Returns `v1.<iv>.<ciphertext>` — safe to store; never log. */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await deriveAesKey(requireEncryptionSecret());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(cipher))}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  const [version, ivPart, dataPart] = payload.split(".");
  if (version !== "v1" || !ivPart || !dataPart) {
    throw new Error("Invalid encrypted credential payload.");
  }

  const key = await deriveAesKey(requireEncryptionSecret());
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(ivPart) },
    key,
    fromBase64Url(dataPart),
  );
  return new TextDecoder().decode(plain);
}
