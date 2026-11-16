import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

// Fixed-window rate limiter.
//
// The count is kept in the database (migrations/rate-limits.sql), so it adds up
// across every server instance. Each instance also keeps its own count in
// memory: it answers a burst without a database call, and it is the fallback
// when the database can't be reached or the migration hasn't been run.

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
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<NextResponse | null> {
  const local = localLimit(key, limit, windowMs);
  if (local) return local;
  try {
    const { data, error } = await supabase.rpc("hit_rate_limit", { p_key: key, p_limit: limit, p_window_ms: windowMs });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return null; // shared count unavailable: the local limit above still applies
    return row.allowed ? null : tooMany(row.retry_after);
  } catch {
    return null;
  }
}

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}

function localLimit(key: string, limit: number, windowMs: number): NextResponse | null {
  const now = Date.now();
  sweep(now);
  const w = buckets.get(key);
  if (!w || w.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (w.count >= limit) return tooMany(Math.ceil((w.resetAt - now) / 1000));
  w.count++;
  return null;
}
