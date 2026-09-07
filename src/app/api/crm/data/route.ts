import { NextRequest, NextResponse } from "next/server";
import {
  supabase,
  fetchAllPages,
  dbToLead,
  dbToFollowup,
  dbToQuotation,
  dbToClosure,
} from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

// Every table here is read in full, via fetchAllPages. The previous `.limit(n)`
// calls did not do that: `.limit(500)` on leads dropped the oldest leads
// outright, and the `.limit(5000)` on the other tables was silently clamped to
// PostgREST's 1000-row ceiling, so those were fixed caps dressed up as generous
// ones. Both failure modes are invisible — the rows simply never arrive, and
// the CRM renders a truncated table as if it were the whole one.
//
// Each query carries `id` as a secondary sort. Rows sharing a primary sort value
// have no guaranteed order between two separate range requests, so without a
// tiebreaker a row can land in two pages while another lands in none.
export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  try {
    const [leads, followups, quotations, closures] = await Promise.all([
      fetchAllPages<Row>((from, to) =>
        supabase.from("leads").select("*")
          .order("created_at", { ascending: false }).order("id", { ascending: true })
          .range(from, to)
      ),
      // The Leads list derives each lead's completed follow-up count from these
      // rows, so a truncated result silently shows older leads as having zero.
      fetchAllPages<Row>((from, to) =>
        supabase.from("followups").select("*")
          .order("created_at", { ascending: false }).order("id", { ascending: true })
          .range(from, to)
      ),
      // Same reasoning: the Leads list's quoted amount comes from these rows.
      fetchAllPages<Row>((from, to) =>
        supabase.from("quotations").select("*")
          .order("date", { ascending: false }).order("id", { ascending: true })
          .range(from, to)
      ),
      // Feeds the Leads list's Lost Reason column and the dashboard totals.
      fetchAllPages<Row>((from, to) =>
        supabase.from("closures").select("*")
          .order("closure_date", { ascending: false }).order("id", { ascending: true })
          .range(from, to)
      ),
    ]);

    return NextResponse.json(
      {
        leads: leads.map(dbToLead),
        followups: followups.map(dbToFollowup),
        quotations: quotations.map(dbToQuotation),
        closures: closures.map(dbToClosure),
        // Activity is deliberately absent. Its only reader is the lead drawer,
        // which needs one lead's history, and the table grows faster than every
        // other one here — shipping it whole would put an ever-larger payload on
        // every CRM page load to serve a panel most visits never open. The
        // drawer fetches /api/crm/activity?leadId=… on demand instead.
        activity: [],
      },
      // Must not be cached. Mutations (stage moves, follow-ups) write through
      // separate endpoints that cannot invalidate this entry, so a cached copy
      // would be replayed over newer local state and visibly undo the change.
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[crm data GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
