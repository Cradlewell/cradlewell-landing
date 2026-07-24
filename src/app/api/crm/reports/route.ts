import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

// ─── Sales reporting API ──────────────────────────────────────────────────────
// Computes Daily / Monthly / Quarterly metrics server-side with date-scoped
// Supabase queries, so totals stay correct past the 500-row client cap.
//
// All calendar boundaries are computed in IST (UTC+5:30) so "today", "this
// month", etc. match the business's local day. Timestamptz columns
// (created_at, completed_at, due_at) are filtered with UTC ISO instants;
// closure_date (a calendar date) is filtered with YYYY-MM-DD strings.

const IST_OFFSET = "+05:30";
const OPEN_STAGES_EXCLUDED = '("Closed Won","Closed Lost","Invalid Lead")';

type Period = "daily" | "monthly" | "quarterly";

interface Range {
  startIso: string;   // UTC instant of period start
  endIso: string;     // UTC instant of period end (exclusive)
  startDate: string;  // YYYY-MM-DD (IST) inclusive
  endDate: string;    // YYYY-MM-DD (IST) exclusive
  label: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Build a period range (current + previous) from query params.
function buildRanges(period: Period, sp: URLSearchParams): { cur: Range; prev: Range } {
  if (period === "daily") {
    const dateStr = sp.get("date") || new Date().toISOString().slice(0, 10);
    const d = new Date(`${dateStr}T00:00:00${IST_OFFSET}`);
    const next = new Date(d.getTime() + 24 * 3600 * 1000);
    const prevDay = new Date(d.getTime() - 24 * 3600 * 1000);
    return {
      cur: rangeFromInstants(d, next),
      prev: rangeFromInstants(prevDay, d),
    };
  }
  if (period === "monthly") {
    const monthStr = sp.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [y, m] = monthStr.split("-").map(Number);
    const start = new Date(`${ymd(y, m, 1)}T00:00:00${IST_OFFSET}`);
    const end = new Date(`${ymd(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1)}T00:00:00${IST_OFFSET}`);
    const pM = m === 1 ? 12 : m - 1;
    const pY = m === 1 ? y - 1 : y;
    const prevStart = new Date(`${ymd(pY, pM, 1)}T00:00:00${IST_OFFSET}`);
    return {
      cur: rangeFromInstants(start, end),
      prev: rangeFromInstants(prevStart, start),
    };
  }
  // quarterly
  const year = Number(sp.get("year")) || new Date().getFullYear();
  const q = Math.min(4, Math.max(1, Number((sp.get("quarter") || "1").replace(/\D/g, "")) || 1));
  const startMonth = (q - 1) * 3 + 1;
  const start = new Date(`${ymd(year, startMonth, 1)}T00:00:00${IST_OFFSET}`);
  const endMonth = startMonth + 3;
  const end = new Date(`${ymd(endMonth > 12 ? year + 1 : year, endMonth > 12 ? endMonth - 12 : endMonth, 1)}T00:00:00${IST_OFFSET}`);
  const pStartMonth = startMonth - 3;
  const prevStart = new Date(`${ymd(pStartMonth < 1 ? year - 1 : year, pStartMonth < 1 ? pStartMonth + 12 : pStartMonth, 1)}T00:00:00${IST_OFFSET}`);
  return {
    cur: rangeFromInstants(start, end),
    prev: rangeFromInstants(prevStart, start),
  };
}

// Convert a pair of UTC instants into a Range, deriving the IST calendar dates.
function rangeFromInstants(start: Date, end: Date): Range {
  const istDate = (dt: Date) =>
    new Date(dt.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: istDate(start),
    endDate: istDate(end),
    label: "",
  };
}

// Group an array by a key selector into [{ name, value }] sorted desc.
function groupCount<T>(rows: T[], key: (r: T) => string | undefined | null): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const k = (key(r) ?? "").toString().trim() || "Unknown";
    map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function pct(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null; // null = "new / no baseline"
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const sp = req.nextUrl.searchParams;
  const period = (sp.get("period") as Period) || "daily";
  const { cur, prev } = buildRanges(period, sp);

  // Optional filters (applied to the leads-received set)
  const fSource = sp.get("source") || "";
  const fHospital = sp.get("hospital") || "";
  const fShift = sp.get("shift") || "";

  const LEAD_COLS =
    "id,name,source,hospital_name,preferred_shift,baby_status,baby_birth_stage_status,baby_age,stage,temperature,service_required,created_at";

  // 1. Leads received in the period (with optional filters)
  let leadsQ = supabase
    .from("leads")
    .select(LEAD_COLS)
    .gte("created_at", cur.startIso)
    .lt("created_at", cur.endIso)
    .limit(5000);
  if (fSource) leadsQ = leadsQ.eq("source", fSource);
  if (fHospital) leadsQ = leadsQ.eq("hospital_name", fHospital);
  if (fShift) leadsQ = leadsQ.eq("preferred_shift", fShift);

  const [
    leadsRes,
    prevLeadsRes,
    activeRes,
    deferredRes,
    wonRes,
    prevWonRes,
    lostRes,
    fuDoneRes,
    fuPendingRes,
  ] = await Promise.all([
    leadsQ,
    // previous-period lead count (for comparison)
    supabase.from("leads").select("id", { count: "exact", head: true })
      .gte("created_at", prev.startIso).lt("created_at", prev.endIso),
    // active/running leads (global snapshot)
    supabase.from("leads").select("id", { count: "exact", head: true })
      .not("stage", "in", OPEN_STAGES_EXCLUDED),
    // deferred / hold leads (global snapshot)
    supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("stage", "Deferred Hot Lead"),
    // Won closures in period
    supabase.from("closures").select("id,lead_id,final_amount,closure_date,final_package,sales_owner")
      .eq("type", "Won").gte("closure_date", cur.startDate).lt("closure_date", cur.endDate).limit(5000),
    // previous-period Won closures (for comparison)
    supabase.from("closures").select("final_amount")
      .eq("type", "Won").gte("closure_date", prev.startDate).lt("closure_date", prev.endDate).limit(5000),
    // Lost closures in period
    supabase.from("closures").select("id,lost_reason")
      .eq("type", "Lost").gte("closure_date", cur.startDate).lt("closure_date", cur.endDate).limit(5000),
    // Follow-ups completed in period
    supabase.from("followups").select("id,lead_id,completed_at")
      .eq("completed", true).gte("completed_at", cur.startIso).lt("completed_at", cur.endIso).limit(5000),
    // Follow-ups pending as of period end
    supabase.from("followups").select("id", { count: "exact", head: true })
      .eq("completed", false).lt("due_at", cur.endIso),
  ]);

  const leads: Row[] = leadsRes.data ?? [];
  const won: Row[] = wonRes.data ?? [];
  const lost: Row[] = lostRes.data ?? [];
  const fuDone: Row[] = fuDoneRes.data ?? [];

  const leadsReceived = leads.length;
  const conversions = won.length;
  const revenue = won.reduce((s, c) => s + (Number(c.final_amount) || 0), 0);
  const followupsCompleted = fuDone.length;
  const uniqueFollowupsCompleted = new Set(fuDone.map((f) => f.lead_id)).size;
  const followupsPending = fuPendingRes.count ?? 0;
  const totalFu = followupsCompleted + followupsPending;

  // ── #15 & #16 & #22 — converted-lead analysis ──────────────────────────────
  const wonLeadIds = won.map((c) => c.lead_id).filter(Boolean);
  let convLeads: Row[] = [];
  let convFollowups: Row[] = [];
  if (wonLeadIds.length) {
    const [cl, cf] = await Promise.all([
      supabase.from("leads").select("id,name,source,baby_status,temperature,created_at")
        .in("id", wonLeadIds).limit(5000),
      supabase.from("followups").select("lead_id,completed,completed_at")
        .in("lead_id", wonLeadIds).eq("completed", true).limit(20000),
    ]);
    convLeads = cl.data ?? [];
    convFollowups = cf.data ?? [];
  }
  const leadById = new Map(convLeads.map((l) => [l.id, l]));

  const DAY = 24 * 3600 * 1000;
  const captureToConversion: Row[] = [];
  const perConvertedFollowups: Row[] = [];
  const bornDays: number[] = [];

  for (const c of won) {
    const lead = leadById.get(c.lead_id);
    if (!lead) continue;
    const created = new Date(lead.created_at).getTime();
    const closed = new Date(`${c.closure_date}T00:00:00${IST_OFFSET}`).getTime();
    const days = Number.isFinite(created) && Number.isFinite(closed)
      ? Math.max(0, Math.round((closed - created) / DAY))
      : null;

    // #15 — follow-ups completed before conversion
    const fuBefore = convFollowups.filter(
      (f) => f.lead_id === c.lead_id && f.completed_at && new Date(f.completed_at).getTime() <= closed
    ).length;
    perConvertedFollowups.push({ name: lead.name, followups: fuBefore });

    // #22 — capture → conversion detail row
    captureToConversion.push({
      name: lead.name,
      source: lead.source,
      babyStatus: lead.baby_status,
      createdAt: lead.created_at,
      closureDate: c.closure_date,
      days,
      amount: Number(c.final_amount) || 0,
      package: c.final_package ?? "",
      owner: c.sales_owner ?? "",
    });

    // #16 — avg days Born → paid, excluding hot leads that took >30 days
    if (lead.baby_status === "Born" && days != null) {
      const excluded = days > 30 && lead.temperature === "Hot";
      if (!excluded) bornDays.push(days);
    }
  }

  const avgDaysBornToPaid = bornDays.length
    ? Math.round((bornDays.reduce((s, d) => s + d, 0) / bornDays.length) * 10) / 10
    : null;

  // ── Comparison (MoM / QoQ) ─────────────────────────────────────────────────
  const prevLeads = prevLeadsRes.count ?? 0;
  const prevWon = (prevWonRes.data ?? []).length;
  const prevRevenue = (prevWonRes.data ?? []).reduce((s, c) => s + (Number(c.final_amount) || 0), 0);

  return NextResponse.json(
    {
      period,
      range: { startDate: cur.startDate, endDate: cur.endDate },
      kpis: {
        leadsReceived,
        conversions,
        conversionRate: leadsReceived ? Math.round((conversions / leadsReceived) * 100) : 0,
        followupsCompleted,
        followupsPending,
        uniqueFollowupsCompleted,
        followupCompletionRatio: totalFu ? Math.round((followupsCompleted / totalFu) * 100) : 0,
        activeLeads: activeRes.count ?? 0,
        expectingLeads: leads.filter((l) => l.baby_status === "Expecting").length,
        deferredLeads: deferredRes.count ?? 0,
        revenue,
        totalLostLeads: lost.length,
        avgDaysBornToPaid,
      },
      breakdowns: {
        byHospital: groupCount(leads, (l) => l.hospital_name),
        byShift: groupCount(leads, (l) => l.preferred_shift),
        byDayNight: groupCount(
          leads.filter((l) => l.preferred_shift === "Day" || l.preferred_shift === "Night"),
          (l) => l.preferred_shift
        ),
        bySource: groupCount(leads, (l) => l.source),
        byBirthStage: groupCount(leads, (l) => l.baby_birth_stage_status),
        byBabyAge: groupCount(leads, (l) => l.baby_age),
        byService: groupCount(leads, (l) => l.service_required),
        lostReasons: groupCount(lost, (l) => l.lost_reason),
      },
      converted: {
        perConvertedFollowups,
        captureToConversion,
      },
      comparison: {
        current: { leads: leadsReceived, conversions, revenue },
        previous: { leads: prevLeads, conversions: prevWon, revenue: prevRevenue },
        growth: {
          leads: pct(leadsReceived, prevLeads),
          conversions: pct(conversions, prevWon),
          revenue: pct(revenue, prevRevenue),
        },
      },
      // Metrics awaiting new data capture (Phase 2) — UI renders these as
      // "Not tracked yet" placeholders.
      gaps: [
        "byZone",
        "followupBySource",
        "followupOutcome",
        "callsMade",
        "revenueLost",
        "staffShortage",
        "forecast",
      ],
    },
    { headers: { "Cache-Control": "private, max-age=30" } }
  );
}
