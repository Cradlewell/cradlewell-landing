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
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

async function refreshSession(refreshToken: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return null;
  return data.session;
}

async function checkAuth(
  request: NextRequest,
  accessKey: string,
  refreshKey: string,
  loginPath: string,
  isApiRoute: boolean
): Promise<NextResponse> {
  const accessToken = request.cookies.get(accessKey)?.value;
  const refreshToken = request.cookies.get(refreshKey)?.value;

  if (!accessToken && !refreshToken) {
    if (isApiRoute) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (accessToken && !tokenExpired(accessToken)) {
    return NextResponse.next();
  }

  if (refreshToken) {
    const session = await refreshSession(refreshToken);
    if (session) {
      const res = NextResponse.next();
      res.cookies.set(accessKey, session.access_token, cookieOpts);
      res.cookies.set(refreshKey, session.refresh_token, cookieOpts);
      return res;
    }
  }

  if (isApiRoute) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL(loginPath, request.url));
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
