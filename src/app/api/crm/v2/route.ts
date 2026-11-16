import { NextRequest, NextResponse } from "next/server";
import { supabase, fetchAllPages } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

/* ==========================================================================
   New CRM data API.
   GET  → every collection the CRM needs, as raw rows (the client adapts them).
   POST → a batch of writes: { ops: [{ coll, op: "upsert" | "delete", id, row? }] }
   Only whitelisted columns are written, so the client cannot touch anything else.
   ========================================================================== */

type Row = Record<string, unknown>;

const LEAD_COLS = new Set([
  "id", "name", "phone", "whatsapp", "source", "lead_date", "service_required", "baby_status",
  "hospital_name", "area", "city", "preferred_shift", "notes", "owner", "stage", "temperature",
  "last_activity_at", "created_at", "baby_age", "current_weight", "address", "shift_hours_count",
  "care_start_date", "service_days", "zone", "meta",
]);
const FOLLOWUP_COLS = new Set(["id", "lead_id", "type", "due_at", "note", "completed", "completed_at", "created_at", "meta"]);

const pick = (row: Row, cols: Set<string>) =>
  Object.fromEntries(Object.entries(row).filter(([k]) => cols.has(k)));

async function all(table: string, order = "id") {
  return fetchAllPages<Row>((from, to) =>
    supabase.from(table).select("*").order(order, { ascending: true }).range(from, to)
  );
}

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  try {
    const [leads, followups, closures, activity, consults, timelines, settings] = await Promise.all([
      all("leads"),
      all("followups"),
      all("closures"),
      all("activity_logs"),
      all("crm_consults"),
      all("crm_timelines", "lead_id"),
      all("crm_settings"),
    ]);
    return NextResponse.json({ leads, followups, closures, activity, consults, timelines, settings });
  } catch (err) {
    console.error("[crm v2 GET]", err);
    return NextResponse.json({ error: "Could not load CRM data" }, { status: 500 });
  }
}

const paymentStatus = (total: number | null, got: number) => (total && got >= total ? "Paid" : got > 0 ? "Partial" : "Pending");

// The Won dialog: package, total and amount received, exactly as entered. Creates or corrects the Won closure.
async function recordWin(leadId: string, r: Row) {
  const total = Number(r.total);
  if (!(total > 0)) return { message: "Won needs a total amount" };
  const paid = Math.min(Math.max(0, Number(r.paid) || 0), total);
  const method = typeof r.method === "string" && r.method ? r.method : null;
  const patch: Row = {
    final_package: typeof r.package === "string" && r.package.trim() ? r.package.trim() : null,
    final_amount: total,
    advance_received: paid,
    balance: total - paid,
    payment_status: paymentStatus(total, paid),
  };
  // A new Won is a new deal (customers renew and extend). Only an incomplete closure (no amount yet) is filled in.
  const { data: incomplete, error: selErr } = await supabase
    .from("closures").select("id, notes").eq("lead_id", leadId).eq("type", "Won").is("final_amount", null).limit(1);
  if (selErr) return selErr;
  if (incomplete && incomplete.length) {
    if (method && !incomplete[0].notes) patch.notes = `Paid by ${method}`;
    const { error } = await supabase.from("closures").update(patch).eq("id", incomplete[0].id);
    return error;
  }
  const { data: lead } = await supabase.from("leads").select("owner").eq("id", leadId).limit(1);
  // The client names the deal, so a retried request updates the same closure instead of adding a second one
  const dealId = typeof r.dealId === "string" && r.dealId.startsWith(`cl-${leadId}-`) ? r.dealId : `cl-${leadId}-${Date.now()}`;
  const { error } = await supabase.from("closures").upsert({
    id: dealId,
    lead_id: leadId,
    type: "Won",
    closure_date: new Date().toISOString(),
    sales_owner: lead?.[0]?.owner ?? null,
    notes: method ? `Paid by ${method}` : null,
    ...patch,
  }, { onConflict: "id" });
  return error;
}

// When a lead becomes Won, make sure Operations (which reads `closures`) sees it.
async function ensureWonClosure(lead: Row) {
  const meta = (lead.meta ?? {}) as Row;
  const { data: existing } = await supabase
    .from("closures").select("id, final_amount, final_package, advance_received").eq("lead_id", lead.id as string).eq("type", "Won").limit(2);
  // Several deals for this customer: the CRM shows their sum, so it can't safely patch any single one.
  if (existing && existing.length > 1) return;
  const amount = Number(meta.dealValue ?? 0) || null;
  const paid = Number(meta.amountPaid ?? 0) || 0;
  const status = paymentStatus;
  if (existing && existing.length) {
    // Never overwrite a recorded deal amount or package; only fill gaps and keep payments current.
    const cur = existing[0];
    const total = cur.final_amount != null ? Number(cur.final_amount) : amount;
    const got = Math.max(paid, Number(cur.advance_received ?? 0));
    const patch: Row = { advance_received: got, payment_status: status(total, got) };
    if (total) patch.balance = Math.max(0, total - got);
    if (cur.final_amount == null && amount) patch.final_amount = amount;
    if (!cur.final_package && meta.package) patch.final_package = meta.package;
    await supabase.from("closures").update(patch).eq("id", cur.id);
  } else {
    const patch: Row = {
      final_package: (meta.package as string) ?? null,
      final_amount: amount,
      advance_received: paid,
      payment_status: status(amount, paid),
    };
    await supabase.from("closures").insert({
      id: `cl-${lead.id}-${Date.now()}`,
      lead_id: lead.id,
      type: "Won",
      closure_date: new Date().toISOString(),
      sales_owner: lead.owner ?? null,
      ...patch,
    });
  }
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  let body: { ops?: { coll: string; op: string; id: string; row?: Row }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ops = Array.isArray(body.ops) ? body.ops.slice(0, 500) : [];
  const failed: string[] = [];
  const assigned: Record<string, number> = {};

  for (const o of ops) {
    if (!o || typeof o.id !== "string" || !o.id) continue;
    try {
      let error: unknown = null;
      if (o.coll === "leads") {
        if (o.op === "delete") ({ error } = await supabase.from("leads").delete().eq("id", o.id));
        else {
          const row: Row = { ...pick(o.row ?? {}, LEAD_COLS), id: o.id };
          // Update first, insert only if new: an upsert would burn a customer_no from the sequence on every save
          const upd = await supabase.from("leads").update(row).eq("id", o.id).select("id");
          error = upd.error;
          if (!error && !upd.data?.length) {
            const ins = await supabase.from("leads").insert(row).select("customer_no").single();
            error = ins.error;
            if (!error && ins.data?.customer_no != null) assigned[o.id] = ins.data.customer_no as number;
          }
          if (!error && row.stage === "Won") await ensureWonClosure(row);
        }
      } else if (o.coll === "followups") {
        if (o.op === "delete") ({ error } = await supabase.from("followups").delete().eq("id", o.id));
        else ({ error } = await supabase.from("followups").upsert({ ...pick(o.row ?? {}, FOLLOWUP_COLS), id: o.id }, { onConflict: "id" }));
      } else if (o.coll === "consults") {
        if (o.op === "delete") ({ error } = await supabase.from("crm_consults").delete().eq("id", o.id));
        else ({ error } = await supabase.from("crm_consults").upsert(
          { id: o.id, lead_id: (o.row?.lead_id as string) ?? null, data: o.row?.data ?? {}, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        ));
      } else if (o.coll === "timelines") {
        if (o.op === "delete") ({ error } = await supabase.from("crm_timelines").delete().eq("lead_id", o.id));
        else ({ error } = await supabase.from("crm_timelines").upsert(
          { lead_id: o.id, events: o.row?.events ?? [], updated_at: new Date().toISOString() },
          { onConflict: "lead_id" }
        ));
      } else if (o.coll === "won") {
        error = await recordWin(o.id, o.row ?? {});
      } else if (o.coll === "settings") {
        ({ error } = await supabase.from("crm_settings").upsert(
          { id: o.id, data: o.row?.data ?? {}, updated_at: new Date().toISOString() },
          { onConflict: "id" }
        ));
      } else continue;
      if (error) {
        console.error(`[crm v2 POST] ${o.coll} ${o.op} ${o.id}`, error);
        failed.push(`${o.coll}:${o.id}`);
      }
    } catch (err) {
      console.error(`[crm v2 POST] ${o.coll} ${o.op} ${o.id}`, err);
      failed.push(`${o.coll}:${o.id}`);
    }
  }

  return NextResponse.json({ ok: failed.length === 0, failed, assigned }, { status: failed.length ? 207 : 200 });
}
