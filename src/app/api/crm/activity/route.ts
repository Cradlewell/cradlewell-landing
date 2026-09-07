import { NextRequest, NextResponse } from "next/server";
import { supabase, fetchAllPages, dbToActivity, activityToDb } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// `?leadId=` returns that lead's complete history, oldest first — what the lead
// drawer's timeline shows. This is the mode the CRM uses. Without it the drawer
// read a global "most recent N events" list, so any lead not touched inside that
// window rendered an empty timeline even though its history was all still there.
//
// With no leadId the route keeps its old shape (a recent global slice) for any
// ad-hoc caller; that is a feed, not a source of truth, so a cap is correct here.
export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const leadId = req.nextUrl.searchParams.get("leadId");
  if (leadId) {
    try {
      const rows = await fetchAllPages<Row>((from, to) =>
        supabase.from("activity_logs").select("*")
          .eq("lead_id", leadId)
          .order("at", { ascending: true }).order("id", { ascending: true })
          .range(from, to)
      );
      return NextResponse.json(rows.map(dbToActivity), { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      console.error("[activity GET]", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  const { data, error } = await supabase.from("activity_logs").select("*").order("at", { ascending: false }).limit(500);
  if (error) { console.error("[activity GET]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json((data ?? []).map(dbToActivity));
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json();
  const { data, error } = await supabase.from("activity_logs").insert(activityToDb(body)).select().single();
  if (error) { console.error("[activity POST]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(dbToActivity(data));
}
