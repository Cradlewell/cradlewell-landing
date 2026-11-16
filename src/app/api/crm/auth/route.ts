import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV !== "development",
  sameSite: "strict" as const,
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
};

// Auth must use the anon key (the service role key cannot sign users in). A
// fresh client per request: these clients hold the signed-in session, and a
// shared one would mix up concurrent logins and logouts on the same instance.
const authClient = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export async function POST(req: NextRequest) {
  // Cap password attempts per IP to blunt credential brute-force.
  const limited = await rateLimit(`crm-login:${clientIp(req)}`, 10, 15 * 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  // app_metadata only: user_metadata is user-editable, so it cannot grant access.
  const portalRole = data.user?.app_metadata?.portal_role;
  if (portalRole !== "crm" && portalRole !== "admin") {
    return NextResponse.json({ success: false, error: "Access denied for this portal" }, { status: 403 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("crm_auth", data.session.access_token, cookieOpts);
  res.cookies.set("crm_refresh", data.session.refresh_token, cookieOpts);
  return res;
}

export async function DELETE(req: NextRequest) {
  const accessToken = req.cookies.get("crm_auth")?.value;
  const refreshToken = req.cookies.get("crm_refresh")?.value;

  if (accessToken && refreshToken) {
    try {
      const client = authClient();
      await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      await client.auth.signOut({ scope: "local" });
    } catch {
      // best-effort server-side revocation
    }
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete("crm_auth");
  res.cookies.delete("crm_refresh");
  return res;
}
