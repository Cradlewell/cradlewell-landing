import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  };
  const res = NextResponse.json({ success: true });
  res.cookies.set("crm_auth", data.session.access_token, cookieOpts);
  res.cookies.set("crm_refresh", data.session.refresh_token, cookieOpts);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("crm_auth");
  res.cookies.delete("crm_refresh");
  return res;
}
