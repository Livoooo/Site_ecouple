export const SESSION_COOKIE_NAME = "wp_session";

const SESSION_PAYLOAD = "ok";

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function sign(value: string) {
  const secret = process.env.SITE_PASSWORD;
  if (!secret) throw new Error("SITE_PASSWORD env var is not set");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return bufferToHex(signature);
}

export async function createSessionToken() {
  return `${SESSION_PAYLOAD}.${await sign(SESSION_PAYLOAD)}`;
}

export async function isValidSessionToken(token: string | undefined) {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await sign(payload);
  return payload === SESSION_PAYLOAD && timingSafeEqual(signature, expected);
}

export function isCorrectPassword(candidate: string) {
  const secret = process.env.SITE_PASSWORD;
  if (!secret) throw new Error("SITE_PASSWORD env var is not set");
  return timingSafeEqual(candidate, secret);
}
