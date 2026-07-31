import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToLead, dbToFollowup, dbToQuotation, dbToClosure, dbToActivity } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const [leadsRes, followupsRes, quotationsRes, closuresRes, activityRes] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(500),
    // Higher cap than the other tables: the Leads list derives each lead's
    // completed follow-up count from these rows, so a truncated result would
    // silently show older leads as having zero follow-ups.
    supabase.from("followups").select("*").order("created_at", { ascending: false }).limit(5000),
    // Same reasoning as follow-ups: the Leads list derives each lead's quoted
    // amount from these rows, so truncation would show older leads as unquoted.
    supabase.from("quotations").select("*").order("date", { ascending: false }).limit(5000),
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
    // Must not be cached. Mutations (stage moves, follow-ups) write through
    // separate endpoints that cannot invalidate this entry, so a cached copy
    // would be replayed over newer local state and visibly undo the change.
    { headers: { "Cache-Control": "no-store" } }
  );
}
