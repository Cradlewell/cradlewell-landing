import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToLead, dbToFollowup, dbToQuotation, dbToClosure, dbToActivity } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const [leadsRes, followupsRes, quotationsRes, closuresRes, activityRes] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("followups").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("quotations").select("*").order("date", { ascending: false }).limit(200),
    supabase.from("closures").select("*").order("closure_date", { ascending: false }).limit(200),
    supabase.from("activity_logs").select("*").order("at", { ascending: false }).limit(200),
  ]);

  return NextResponse.json(
    {
      leads: (leadsRes.data ?? []).map(dbToLead),
      followups: (followupsRes.data ?? []).map(dbToFollowup),
      quotations: (quotationsRes.data ?? []).map(dbToQuotation),
      closures: (closuresRes.data ?? []).map(dbToClosure),
      activity: (activityRes.data ?? []).map(dbToActivity),
    },
    { headers: { "Cache-Control": "private, max-age=30" } }
  );
}
