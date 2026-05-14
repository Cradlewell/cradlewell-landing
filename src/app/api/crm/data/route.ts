import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToLead, dbToFollowup, dbToQuotation, dbToClosure, dbToActivity, isAuthed } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("crm_auth")?.value;
  if (!await isAuthed(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [leadsRes, followupsRes, quotationsRes, closuresRes, activityRes] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }).range(0, 9999),
    supabase.from("followups").select("*").order("created_at", { ascending: false }).range(0, 9999),
    supabase.from("quotations").select("*").order("date", { ascending: false }).range(0, 4999),
    supabase.from("closures").select("*").order("closure_date", { ascending: false }).range(0, 4999),
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
