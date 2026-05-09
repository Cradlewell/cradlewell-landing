import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToLead, dbToFollowup, dbToQuotation, dbToClosure, dbToActivity, isAuthed } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  if (!isAuthed(req.cookies.get("crm_auth")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [leadsRes, followupsRes, quotationsRes, closuresRes, activityRes] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("followups").select("*").order("created_at", { ascending: false }),
    supabase.from("quotations").select("*").order("date", { ascending: false }),
    supabase.from("closures").select("*").order("closure_date", { ascending: false }),
    supabase.from("activity_logs").select("*").order("at", { ascending: false }).limit(500),
  ]);

  return NextResponse.json({
    leads: (leadsRes.data ?? []).map(dbToLead),
    followups: (followupsRes.data ?? []).map(dbToFollowup),
    quotations: (quotationsRes.data ?? []).map(dbToQuotation),
    closures: (closuresRes.data ?? []).map(dbToClosure),
    activity: (activityRes.data ?? []).map(dbToActivity),
  });
}
