import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== "development",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

const supabaseAuthOpts = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    supabaseAuthOpts
  );
}

async function refreshSession(refreshToken: string) {
  const { data, error } = await getSupabaseClient().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return null;
  return data.session;
}

async function verifyToken(token: string): Promise<boolean> {
  const { error } = await getSupabaseClient().auth.getUser(token);
  return !error;
}

async function checkAuth(
  request: NextRequest,
  accessKey: string,
  refreshKey: string,
  loginPath: string,
  isApiRoute: boolean
): Promise<NextResponse> {
  // Always strip the auth header to prevent client forgery
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-cw-auth");

  const accessToken = request.cookies.get(accessKey)?.value;
  const refreshToken = request.cookies.get(refreshKey)?.value;

  if (!accessToken && !refreshToken) {
    if (isApiRoute) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  let validToken: string | null = null;
  let newSession: Awaited<ReturnType<typeof refreshSession>> = null;

  if (accessToken && !tokenExpired(accessToken)) {
    const ok = await verifyToken(accessToken);
    if (ok) validToken = accessToken;
  }

  if (!validToken && refreshToken) {
    newSession = await refreshSession(refreshToken);
    if (newSession) {
      const ok = await verifyToken(newSession.access_token);
      if (ok) validToken = newSession.access_token;
    }
  }

  if (!validToken) {
    if (isApiRoute) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL(loginPath, request.url));
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
    return checkAuth(request, "crm_auth", "crm_refresh", "/crm/login", isCrmApi);
  }

  const isOpsPage = pathname.startsWith("/operations") && !pathname.startsWith("/operations/login");
  const isOpsApi = pathname.startsWith("/api/ops") && !pathname.startsWith("/api/ops/auth");
  if (isOpsPage || isOpsApi) {
    return checkAuth(request, "ops_auth", "ops_refresh", "/operations/login", isOpsApi);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/crm/:path*", "/api/crm/:path*", "/operations/:path*", "/api/ops/:path*"],
};
