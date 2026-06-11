const SESSION_COOKIE = "dv8_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function toBase64Url(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(email: string) {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");

  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = JSON.stringify({ email, exp });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payload));
  const signature = await signPayload(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null) {
  if (!token) return null;

  const secret = getSecret();
  if (!secret) return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = await signPayload(payloadB64, secret);
  if (signature !== expected) return null;

  try {
    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(payloadJson) as { email: string; exp: number };
    if (!payload.email || payload.exp < Date.now()) return null;
    return payload.email;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function validateAdminCredentials(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;
  return email === adminEmail && password === adminPassword;
}
