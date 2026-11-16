import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  crossSiteWrite,
  hasCrmRole,
  refreshSession,
  tokenExpired,
  tokenValid,
  type RefreshedSession,
} from "@/lib/session";

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== "development",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

// Header carrying a just-refreshed access token to the API route for this one
// request (the browser only gets the new cookie with the response). The route
// verifies the token itself, so a client sending this header gains nothing.
const FRESH_TOKEN_HEADER = "x-cw-token";

async function checkAuth(request: NextRequest, isApiRoute: boolean): Promise<NextResponse> {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(FRESH_TOKEN_HEADER);

  const deny = () =>
    isApiRoute
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/crm/login", request.url));

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!accessToken && !refreshToken) return deny();

  let validToken: string | null = null;
  let newSession: RefreshedSession | null = null;

  if (accessToken && (await tokenValid(accessToken))) validToken = accessToken;

  // Otherwise try to refresh. Supabase issues the new token, so it is authentic
  // by construction; still confirm it is not already expired.
  if (!validToken && refreshToken) {
    newSession = await refreshSession(refreshToken);
    if (newSession && !tokenExpired(newSession.access_token)) validToken = newSession.access_token;
  }

  if (!validToken) return deny();

  if (!hasCrmRole(validToken)) {
    return isApiRoute
      ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      : NextResponse.redirect(new URL("/crm/login", request.url));
  }

  if (newSession) requestHeaders.set(FRESH_TOKEN_HEADER, newSession.access_token);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (newSession) {
    res.cookies.set(ACCESS_COOKIE, newSession.access_token, cookieOpts);
    res.cookies.set(REFRESH_COOKIE, newSession.refresh_token, cookieOpts);
  }
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/crm");

  // CRM writes (including sign-in and sign-out) only from this site's own pages.
  if (isApi && crossSiteWrite(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isPublic = pathname.startsWith("/crm/login") || pathname.startsWith("/api/crm/auth");
  if (isPublic) return NextResponse.next();

  return checkAuth(request, isApi);
}

export const config = {
  matcher: ["/crm/:path*", "/api/crm/:path*"],
};
