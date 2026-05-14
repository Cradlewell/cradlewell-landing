import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isCrmPage = pathname.startsWith("/crm") && !pathname.startsWith("/crm/login");
  const isCrmApi = pathname.startsWith("/api/crm") && !pathname.startsWith("/api/crm/auth");

  if (isCrmPage || isCrmApi) {
    const token = request.cookies.get("crm_auth")?.value;
    if (!token) {
      if (isCrmApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/crm/login", request.url));
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.getUser(token);
    if (error) {
      if (isCrmApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return NextResponse.redirect(new URL("/crm/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/crm/:path*", "/api/crm/:path*"],
};
