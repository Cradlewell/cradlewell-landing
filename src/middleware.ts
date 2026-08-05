import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!;
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;
// Optional: when set, the JWT signature is verified locally (HS256) with no
// network round-trip. When absent, verification falls back to a Supabase call,
// so auth is correct out of the box — just slower. It is NEVER skipped.
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

// base64url → bytes. atob only handles standard base64, and JWT segments are
// base64url, so the two alphabets must be reconciled before decoding.
function b64urlToBytes(seg: string): Uint8Array {
  const b64 = seg.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(seg.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const seg = token.split(".")[1];
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(seg)));
  } catch {
    return null;
  }
}

function tokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 < Date.now();
}

// Verify an HS256 JWT locally against the Supabase JWT secret. Returns false for
// any other algorithm so asymmetric tokens fall back to the network check rather
// than being wrongly rejected — or wrongly trusted.
async function verifyHs256(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  let header: { alg?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  } catch {
    return false;
  }
  if (header.alg !== "HS256") return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
  } catch {
    return false;
  }
}

// A token is valid only if it is unexpired AND its signature verifies. The old
// code checked expiry alone, so any self-made string with a future `exp` was
// accepted — a full authentication bypass. Signature is now mandatory.
async function tokenValid(token: string): Promise<boolean> {
  if (tokenExpired(token)) return false;
  if (SUPABASE_JWT_SECRET && (await verifyHs256(token, SUPABASE_JWT_SECRET))) return true;
  // No local secret, or a non-HS256 (asymmetric) token: verify with Supabase.
  return verifyToken(token);
}

// portal_role rides in the access token's user_metadata / app_metadata. Reading
// it here lets the middleware keep a CRM token off Ops routes and vice versa,
// which login-time checks alone cannot enforce on every request.
function portalRoleOf(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const um = payload.user_metadata as { portal_role?: string } | undefined;
  const am = payload.app_metadata as { portal_role?: string } | undefined;
  return um?.portal_role ?? am?.portal_role ?? null;
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== "development",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

async function verifyToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface RefreshedSession {
  access_token: string;
  refresh_token: string;
}

async function refreshSession(refreshToken: string): Promise<RefreshedSession | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
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

async function checkAuth(
  request: NextRequest,
  accessKey: string,
  refreshKey: string,
  loginPath: string,
  isApiRoute: boolean,
  expectedPortal: "crm" | "ops"
): Promise<NextResponse> {
  const requestHeaders = new Headers(request.headers);
  // Strip any client-supplied auth header so it can only ever be set by us below.
  requestHeaders.delete("x-cw-auth");

  const deny = () =>
    isApiRoute
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL(loginPath, request.url));

  const accessToken = request.cookies.get(accessKey)?.value;
  const refreshToken = request.cookies.get(refreshKey)?.value;

  if (!accessToken && !refreshToken) return deny();

  let validToken: string | null = null;
  let newSession: RefreshedSession | null = null;

  // Signature-verified, unexpired access token is trusted directly.
  if (accessToken && (await tokenValid(accessToken))) {
    validToken = accessToken;
  }

  // Otherwise try to refresh. Supabase issues the new access token, so it is
  // authentic by construction; still confirm it is not already expired.
  if (!validToken && refreshToken) {
    newSession = await refreshSession(refreshToken);
    if (newSession && !tokenExpired(newSession.access_token)) {
      validToken = newSession.access_token;
    }
  }

  if (!validToken) return deny();

  // Keep a token minted for one portal out of the other. A token with no role
  // is allowed through for backward compatibility with users provisioned before
  // portal_role existed; assign portal_role to every user to make this strict.
  const role = portalRoleOf(validToken);
  if (role && role !== expectedPortal) {
    return isApiRoute
      ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      : NextResponse.redirect(new URL(loginPath, request.url));
  }

  requestHeaders.set("x-cw-auth", "1");
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  if (newSession) {
    res.cookies.set(accessKey, newSession.access_token, cookieOpts);
    res.cookies.set(refreshKey, newSession.refresh_token, cookieOpts);
  }

  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isCrmPage = pathname.startsWith("/crm") && !pathname.startsWith("/crm/login");
  const isCrmApi = pathname.startsWith("/api/crm") && !pathname.startsWith("/api/crm/auth");
  if (isCrmPage || isCrmApi) {
    return checkAuth(request, "crm_auth", "crm_refresh", "/crm/login", isCrmApi, "crm");
  }

  const isOpsPage = pathname.startsWith("/operations") && !pathname.startsWith("/operations/login");
  const isOpsApi = pathname.startsWith("/api/ops") && !pathname.startsWith("/api/ops/auth");
  if (isOpsPage || isOpsApi) {
    return checkAuth(request, "ops_auth", "ops_refresh", "/operations/login", isOpsApi, "ops");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/crm/:path*", "/api/crm/:path*", "/operations/:path*", "/api/ops/:path*"],
};
