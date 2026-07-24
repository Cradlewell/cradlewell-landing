import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { nearestZone } from "@/lib/zones";

// ─── One-time (re-runnable) zone backfill ─────────────────────────────────────
// Assigns the nearest zone to every existing lead that already has stored GPS
// coordinates (home_lat/home_lng) but no zone yet — or recomputes all of them
// after the zone list changes. Safe to run repeatedly.

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  // Only leads with coordinates can be distance-zoned.
  const { data, error } = await supabase
    .from("leads")
    .select("id, home_lat, home_lng")
    .not("home_lat", "is", null)
    .not("home_lng", "is", null)
    .limit(10000);

  if (error) {
    console.error("[backfill-zones select]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Group lead ids by their computed zone so we do one UPDATE per zone.
  const byZone: Record<string, string[]> = {};
  let skipped = 0;
  for (const l of data ?? []) {
    const nz = nearestZone(l.home_lat as number, l.home_lng as number);
    if (!nz) { skipped++; continue; }
    (byZone[nz.name] ??= []).push(l.id);
  }

  let updated = 0;
  for (const [zone, ids] of Object.entries(byZone)) {
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const { error: uErr } = await supabase.from("leads").update({ zone }).in("id", chunk);
      if (uErr) { console.error("[backfill-zones update]", uErr); continue; }
      updated += chunk.length;
    }
  }

  return NextResponse.json({ total: data?.length ?? 0, updated, skipped });
}
