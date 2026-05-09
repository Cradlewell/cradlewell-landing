import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/crm") && !pathname.startsWith("/crm/login")) {
    const session = request.cookies.get("crm_auth");
    if (session?.value !== process.env.CRM_SESSION_TOKEN) {
      const loginUrl = new URL("/crm/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/crm/:path*"],
};
