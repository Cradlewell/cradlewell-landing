import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== "development",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  const portalRole = data.user?.user_metadata?.portal_role;
  if (portalRole && portalRole !== "ops") {
    return NextResponse.json({ success: false, error: "Access denied for this portal" }, { status: 403 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("ops_auth", data.session.access_token, cookieOpts);
  res.cookies.set("ops_refresh", data.session.refresh_token, cookieOpts);
  return res;
}

export async function DELETE(req: NextRequest) {
  const accessToken = req.cookies.get("ops_auth")?.value;
  const refreshToken = req.cookies.get("ops_refresh")?.value;

  if (accessToken && refreshToken) {
    try {
      const userClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      );
      await userClient.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      await userClient.auth.signOut();
    } catch {
      // best-effort server-side revocation
    }
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete("ops_auth");
  res.cookies.delete("ops_refresh");
  return res;
}
