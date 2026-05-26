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

function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Mirrors the buildRota logic in OpsBoard.jsx to compute who is assigned on a given date.
// rota stores only manual overrides; the default schedule cycles through staffIds.
function resolveStaffOnDate(
  staffIds: string[],
  startDate: string,
  packageDays: number,
  rotaOverrides: Record<string, string>,
  pausedDates: string[],
  leaveDates: string[],
  targetDate: string
): string | null {
  if (staffIds.length === 0 || !startDate || !packageDays) return null;

  const pausedSet = new Set(pausedDates);
  const leaveSet = new Set(leaveDates);

  let workIdx = 0, consumed = 0, offset = 0;
  const cap = packageDays + 120;

  while (consumed < packageDays && offset < cap) {
    const date = addDaysISO(startDate, offset);
    const isSunday = new Date(date + "T00:00:00").getDay() === 0;
    const overrideId = rotaOverrides[date] ?? null;

    if (date === targetDate) {
      if (leaveSet.has(date) || pausedSet.has(date)) return null;
      if (isSunday && !overrideId) return null;
      return overrideId ?? staffIds[workIdx % staffIds.length];
    }

    if (leaveSet.has(date) || pausedSet.has(date)) {
      // no progress — paused/leave days don't advance the rotation
    } else if (isSunday && !overrideId) {
      consumed++;
    } else {
      workIdx++;
      consumed++;
    }

    offset++;
  }

  return null; // targetDate falls outside this customer's package
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
    supabase
      .from("ops_customer_state")
      .select("lead_id, staff_ids, start_date, package_days, rota, paused_dates, leave_dates"),
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
    const staffIds: string[] = state.staff_ids ?? [];
    const startDate: string | null = state.start_date ?? null;
    const packageDays: number | null = state.package_days ?? null;
    const rotaOverrides: Record<string, string> = state.rota ?? {};
    const pausedDates: string[] = state.paused_dates ?? [];
    const leaveDates: string[] = state.leave_dates ?? [];

    if (!startDate || !packageDays || staffIds.length === 0) continue;

    for (const date of dates) {
      const assignedId = resolveStaffOnDate(
        staffIds, startDate, packageDays,
        rotaOverrides, pausedDates, leaveDates,
        date
      );
      if (assignedId && assignments[assignedId] !== undefined) {
        assignments[assignedId][date] = {
          customerId: state.lead_id,
          customerName: customerMap[state.lead_id] ?? "Active Customer",
        };
      }
    }
  }

  return NextResponse.json({ staff, assignments, dates });
}
