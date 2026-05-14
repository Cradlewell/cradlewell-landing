import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/crm") && !pathname.startsWith("/crm/login")) {
    const token = request.cookies.get("crm_auth")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/crm/login", request.url));
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.getUser(token);
    if (error) {
      return NextResponse.redirect(new URL("/crm/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/crm/:path*"],
};
