const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function hmac(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(5));
  return "AS-" + [...b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}
/** Verifies a Stripe webhook signature header ("t=...,v1=..."). */
export async function verifyStripe(body: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), tolerance = 300): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const t = Number(parts.t);
  if (!t || !parts.v1 || Math.abs(nowSec - t) > tolerance) return false;
  return safeEqual(await hmac(secret, `${t}.${body}`), parts.v1);
}
