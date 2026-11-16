// Checks a CRM login token: unexpired, signed by Supabase, and carrying the CRM
// role. Used by the middleware (to guard pages and APIs) and again by every
// CRM API route (so a route never relies on the middleware having run).
// Uses only Web APIs, so it works in both the middleware and Node routes.

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
// Optional: when set, HS256 tokens are verified locally.
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

export const ACCESS_COOKIE = "crm_auth";
export const REFRESH_COOKIE = "crm_refresh";

// base64url → bytes (atob only understands standard base64).
function b64urlToBytes(seg: string): Uint8Array<ArrayBuffer> {
  const b64 = seg.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(seg.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeSegment(seg: string | undefined): Record<string, unknown> | null {
  if (!seg) return null;
  try {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(seg)));
  } catch {
    return null;
  }
}

export function tokenExpired(token: string): boolean {
  const payload = decodeSegment(token.split(".")[1]);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 < Date.now();
}

async function verifyHs256(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3 || decodeSegment(parts[0])?.alg !== "HS256") return false;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return await crypto.subtle.verify("HMAC", key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch {
    return false;
  }
}

// This project signs tokens with ES256 and publishes the public keys, so they
// are checked locally. Keys are cached for 10 minutes per server instance; an
// unknown key id triggers a refetch, at most once a minute.
const JWKS_TTL = 10 * 60_000;
let jwks: { at: number; keys: Map<string, CryptoKey> } | null = null;

async function loadJwks(): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
    if (!res.ok) return;
    const body = (await res.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
    const keys = new Map<string, CryptoKey>();
    for (const k of body.keys ?? []) {
      if (k.kty !== "EC" || k.crv !== "P-256" || !k.kid) continue;
      const jwk: JsonWebKey = { kty: k.kty, crv: k.crv, x: k.x, y: k.y };
      keys.set(k.kid, await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]));
    }
    jwks = { at: Date.now(), keys };
  } catch {
    // keep any keys already cached; the caller falls back to the network check
  }
}

// true / false when the token could be checked locally; null to fall back.
async function verifyEs256(token: string): Promise<boolean | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const header = decodeSegment(parts[0]) as { alg?: string; kid?: string } | null;
  if (!header) return false;
  if (header.alg !== "ES256" || !header.kid) return null;
  const stale = !jwks || Date.now() - jwks.at > JWKS_TTL;
  const unknown = !jwks?.keys.has(header.kid) && (!jwks || Date.now() - jwks.at > 60_000);
  if (stale || unknown) await loadJwks();
  const key = jwks?.keys.get(header.kid);
  if (!key) return null;
  try {
    // JWS ES256 signatures are raw r||s, the format WebCrypto expects
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch {
    return null;
  }
}

// Last resort when the token can't be checked locally: ask Supabase.
async function verifyWithSupabase(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Unexpired AND correctly signed. The signature check is never skipped.
export async function tokenValid(token: string): Promise<boolean> {
  if (tokenExpired(token)) return false;
  if (SUPABASE_JWT_SECRET && (await verifyHs256(token, SUPABASE_JWT_SECRET))) return true;
  const local = await verifyEs256(token);
  if (local !== null) return local;
  return verifyWithSupabase(token);
}

// portal_role is read from app_metadata only: user_metadata is writable by the
// user, so trusting it would let anyone grant themselves access. The WhatsApp
// CRM shares this Supabase project's users, so a valid token alone isn't enough.
export function hasCrmRole(token: string): boolean {
  const am = decodeSegment(token.split(".")[1])?.app_metadata as { portal_role?: string } | undefined;
  return am?.portal_role === "crm" || am?.portal_role === "admin";
}

export interface RefreshedSession {
  access_token: string;
  refresh_token: string;
}

export async function refreshSession(refreshToken: string): Promise<RefreshedSession | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token || !data.refresh_token) return null;
    return { access_token: data.access_token, refresh_token: data.refresh_token };
  } catch {
    return null;
  }
}

// Writes from another site are refused: the request must come from this
// site's own pages (Origin matches the host) and carry JSON. SameSite cookies
// alone don't cover sibling subdomains such as the blog.
export function crossSiteWrite(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return false;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return true;
    } catch {
      return true;
    }
  }
  const hasBody = req.method === "POST" || req.method === "PUT" || req.method === "PATCH";
  return hasBody && !(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}
