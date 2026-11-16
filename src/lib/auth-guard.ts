import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, hasCrmRole, tokenValid } from "@/lib/session";

// Every CRM API route checks the login token itself instead of trusting the
// middleware to have run: the token must be correctly signed, unexpired and
// carry the CRM role. When the middleware has just refreshed the session, the
// new token arrives in a request header (the cookie only updates on the
// response); it is verified exactly the same way.
export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const token = req.headers.get("x-cw-token") || req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token || !(await tokenValid(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasCrmRole(token)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
