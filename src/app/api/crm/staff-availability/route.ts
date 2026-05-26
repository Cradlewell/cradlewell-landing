import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

function datesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end && dates.length <= 31) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = searchParams.get("from") ?? today;
  const rawTo = searchParams.get("to") ?? from;
  const to = rawTo < from ? from : rawTo;

  const dates = datesInRange(from, to);

  const [staffRes, statesRes] = await Promise.all([
    supabase.from("ops_staff").select("*").order("created_at", { ascending: true }),
    supabase.from("ops_customer_state").select("lead_id, rota"),
  ]);

  if (staffRes.error) {
    console.error("[crm/staff-availability staff]", staffRes.error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  if (statesRes.error) {
    console.error("[crm/staff-availability states]", statesRes.error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const staff = staffRes.data ?? [];
  const states = statesRes.data ?? [];

  const leadIds = states.map((s) => s.lead_id).filter(Boolean);
  const customerMap: Record<string, string> = {};
  if (leadIds.length > 0) {
    const { data: leads } = await supabase
      .from("leads")
      .select("id, name")
      .in("id", leadIds)
      .eq("stage", "Closed Won");
    for (const l of leads ?? []) customerMap[l.id] = l.name;
  }

  type AssignmentInfo = { customerId: string; customerName: string };
  const assignments: Record<string, Record<string, AssignmentInfo | null>> = {};

  for (const s of staff) {
    assignments[s.id] = {};
    for (const d of dates) assignments[s.id][d] = null;
  }

  for (const state of states) {
    const rota: Record<string, string> = state.rota ?? {};
    for (const date of dates) {
      const staffId = rota[date];
      if (staffId && assignments[staffId] !== undefined) {
        assignments[staffId][date] = {
          customerId: state.lead_id,
          customerName: customerMap[state.lead_id] ?? "Active Customer",
        };
      }
    }
  }

  return NextResponse.json({ staff, assignments, dates });
}
