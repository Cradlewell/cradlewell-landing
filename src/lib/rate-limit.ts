import { NextRequest, NextResponse } from "next/server";

// Lightweight fixed-window rate limiter.
//
// State lives in a module-level Map, so it is per-instance: it throttles a burst
// against one warm serverless instance but is not a global counter across many.
// That is enough to blunt password brute-force and form spam; for a hard global
// limit, back this with Upstash/Redis. It is a mitigation, not a guarantee.

interface Window { count: number; resetAt: number; }
const buckets = new Map<string, Window>();

// Opportunistic sweep so the Map cannot grow without bound on a long-lived
// instance. Runs at most once a minute, on access.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  buckets.forEach((w, k) => { if (w.resetAt <= now) buckets.delete(k); });
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Returns a 429 response if the caller is over the limit, or null to proceed.
 * @param key   stable identity for the caller, e.g. `login:<ip>`
 * @param limit max requests allowed per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  sweep(now);
  const w = buckets.get(key);
  if (!w || w.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (w.count >= limit) {
    const retryAfter = Math.ceil((w.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  w.count++;
  return null;
}
