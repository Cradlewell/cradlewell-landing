import { NextRequest, NextResponse } from "next/server";

// Receives Content-Security-Policy violation reports from browsers (the policy
// is in Report-Only mode, see next.config.mjs) and writes a short line to the
// server log, so the policy can be checked before it is enforced.
export async function POST(req: NextRequest) {
  try {
    const text = (await req.text()).slice(0, 4000);
    const body = JSON.parse(text);
    const r = body?.["csp-report"] ?? body?.[0]?.body ?? body;
    const directive = r?.["violated-directive"] ?? r?.effectiveDirective ?? "?";
    const blocked = r?.["blocked-uri"] ?? r?.blockedURL ?? "?";
    const page = r?.["document-uri"] ?? r?.documentURL ?? "?";
    console.warn(`[csp] ${directive} blocked ${String(blocked).slice(0, 200)} on ${String(page).slice(0, 200)}`);
  } catch {
    // malformed report: ignore
  }
  return new NextResponse(null, { status: 204 });
}
