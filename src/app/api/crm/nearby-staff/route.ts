import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { haversineKm } from "@/lib/geo-utils";

// Pipeline stages we surface on the Nearby Staff board.
const TARGET_STAGES = [
  "Nurse Required",
  "Due date soon",
  "Deferred Hot Lead",
  "Follow-up",
  "Negotiation",
];
const MAX_NURSES = 5;

interface LeadRow { id: string; name: string; address: string | null; stage: string; home_lat: number | null; home_lng: number | null; }
// crm_staff, not ops_staff — this board ranks the CRM's own roster, which is
// maintained by sales and kept independent of the operations staff list.
interface StaffRow { id: string; name: string; home_lat: number | null; home_lng: number | null; }

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const [leadsRes, staffRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name, address, stage, home_lat, home_lng")
      .in("stage", TARGET_STAGES)
      .order("last_activity_at", { ascending: false }),
    supabase.from("crm_staff").select("id, name, home_lat, home_lng"),
  ]);

  // Leads are the board; without them there is nothing to render.
  if (leadsRes.error) {
    console.error("[crm/nearby-staff leads]", leadsRes.error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Staff are an enrichment — they add a distance ranking to each lead. A failure
  // here (most often crm_staff not yet created) must not blank the lead list, so
  // degrade to "no staff" and report it instead of failing the whole request.
  const staffUnavailable = !!staffRes.error;
  if (staffRes.error) console.error("[crm/nearby-staff staff]", staffRes.error);

  // Only staff with coordinates can be distance-ranked.
  const staff = ((staffRes.data ?? []) as StaffRow[]).filter(
    (s) => s.home_lat != null && s.home_lng != null
  );

  const rows = ((leadsRes.data ?? []) as LeadRow[]).map((l) => {
    const hasLocation = l.home_lat != null && l.home_lng != null;
    const nurses = hasLocation
      ? staff
          .map((s) => ({
            id: s.id,
            name: s.name,
            km: haversineKm(l.home_lat as number, l.home_lng as number, s.home_lat as number, s.home_lng as number),
          }))
          .sort((a, b) => a.km - b.km)
          .slice(0, MAX_NURSES)
      : [];
    return {
      id: l.id,
      name: l.name,
      address: l.address ?? null,
      stage: l.stage,
      hasLocation,
      nurses,
    };
  });

  return NextResponse.json(
    { rows, staffWithLocation: staff.length, staffUnavailable },
    { headers: { "Cache-Control": "no-store" } }
  );
}
