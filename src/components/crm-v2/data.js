/* ==========================================================================
   Data bridge between the CRM UI and Supabase (via /api/crm/v2).

   The UI works on rich in-memory objects (Dates, arrays, nested fields). Each
   lead keeps its real columns (name, phone, stage…) in the `leads` table and
   every UI-only field in `leads.meta` (jsonb). Same idea for follow-ups.
   Consultations, timelines and settings live in their own jsonb tables.
   ========================================================================== */

const DAY = 86400000;

// Fresh start for follow-ups: only leads that arrive from this date (16 Nov 2026, IST) get their
// follow-ups shown. Follow-ups someone creates from now on (for any lead) are shown too.
// Older follow-ups stay in the database untouched — they are just not loaded.
export const FOLLOWUP_CUTOFF = new Date("2026-11-16T00:00:00+05:30");

/* ---------- Serialising (Dates survive the round trip) ---------- */

export function pack(value) {
  return JSON.parse(
    JSON.stringify(value, function (key, v) {
      const raw = this[key];
      if (raw instanceof Date) return isNaN(raw) ? null : { $d: raw.toISOString() };
      if (typeof raw === "function") return undefined;
      return v;
    }) ?? "null"
  );
}

export function unpack(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value), (k, v) =>
    v && typeof v === "object" && !Array.isArray(v) && typeof v.$d === "string" && Object.keys(v).length === 1 ? new Date(v.$d) : v
  );
}

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d;
};
const ymd = (d) => {
  if (!d || isNaN(d)) return null;
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/* ---------- Old → new vocabularies ---------- */

export const STAGE_IDS = ["New", "Qualified", "Consult booked", "Consult done", "Payment pending", "Won", "Deferred", "Lost"];

// The 12 stages the old CRM used, mapped onto the new 8.
export const LEGACY_STAGE = {
  "New Lead": "New",
  Contacted: "Qualified",
  "Nurse Required": "Qualified",
  "Moba Required": "Qualified",
  "Due date soon": "Qualified",
  "Follow-up": "Qualified",
  "Not Responding": "Qualified",
  Negotiation: "Consult done",
  "Deferred Hot Lead": "Deferred",
  "Closed Won": "Won",
  "Closed Lost": "Lost",
  "Invalid Lead": "Lost",
};
export const normStage = (s) => (STAGE_IDS.includes(s) ? s : LEGACY_STAGE[s] || "New");

export function mapServices(raw) {
  const s = String(raw || "").toLowerCase();
  const out = [];
  if (/nurse/.test(s)) out.push("Nurse care");
  if (/moba|japa|caregiver/.test(s)) out.push("Moba / Japa care");
  return out;
}

export function mapShift(raw) {
  const s = String(raw || "").toLowerCase();
  if (!s) return null;
  if (/24|day.*night|night.*day/.test(s)) return "24 hrs";
  if (/night/.test(s)) return "Night";
  if (/day/.test(s)) return "Day";
  return null;
}

const FU_TYPE = {
  "First call": "Call",
  "Call back": "Call",
  "Callback + WhatsApp": "Call",
  "Quotation reminder": "WhatsApp",
  "Payment reminder": "Payment",
  "Trial decision": "Call",
  "Closure follow-up": "Call",
};

// "Cold" is the column default (every lead has it), so it means "not rated", not low interest
const scoreFromTemp = (t) => ({ Hot: 85, Warm: 65 }[t] ?? 50);

/* ---------- Leads ---------- */

// Fields the UI derives or that live in real columns; not duplicated into meta.
const LEAD_COLUMN_FIELDS = ["id", "name", "phone", "stage", "source", "hospital", "zone", "address", "owner", "createdAt"];

export function dbLeadToUi(row, ctx) {
  const m = unpack(row.meta || {}) || {};
  const rawStage = row.stage;
  const stage = normStage(rawStage);
  const closure = ctx.wonClosure.get(row.id) || null;
  const lostClosure = ctx.lostClosure.get(row.id) || null;
  const bs = String(row.baby_status || "").toLowerCase();
  const careKind = m.careKind || (/born/.test(bs) ? "B" : /expect|due/.test(bs) ? "P" : row.baby_age ? "B" : "P");
  const createdAt = toDate(row.created_at) || toDate(row.lead_date) || new Date();
  const careStart = m.careStart !== undefined ? m.careStart : toDate(row.care_start_date);
  const careEnd =
    m.careEnd !== undefined ? m.careEnd : careStart && row.service_days ? new Date(careStart.getTime() + (row.service_days - 1) * DAY) : null;
  const lastAt = toDate(row.last_activity_at);
  const nextOpen = ctx.nextFollowUp.get(row.id) || null;
  const paidAmount = closure ? Number(closure.advance_received || 0) : 0;
  const finalAmount = closure ? Number(closure.final_amount || 0) : 0;

  const derived = {
    careKind,
    dueDate: null,
    babyDob: null,
    babies: 1,
    birthWeights: [],
    currentWeights: row.current_weight && !isNaN(parseFloat(row.current_weight)) ? [parseFloat(row.current_weight)] : [],
    services: mapServices(row.service_required),
    shiftType: mapShift(row.preferred_shift),
    shiftHours: row.shift_hours_count || null,
    package: closure?.final_package || null,
    deals: closure?.deals || 0, // number of Won closures (trial, month, extension…)
    wonDeals: closure?.history || [], // [{ at, amount, paid }] per closure, for revenue by month
    tag: rawStage === "Not Responding" ? "Not responding" : null,
    score: scoreFromTemp(row.temperature),
    lastActivity: lastAt && Math.abs(lastAt - createdAt) > 60000 ? { type: "Updated", by: row.owner || "You", at: lastAt, none: false } : { type: "Created", by: row.owner || "You", at: createdAt, none: true },
    unread: 0,
    needsReply: false,
    lostReason: lostClosure?.lost_reason || (rawStage === "Invalid Lead" ? "Invalid lead" : null),
    deferredUntil: null,
    deferNote: "",
    prevStage: null,
    nextAction: null,
    paymentStatus: closure ? (finalAmount && paidAmount >= finalAmount ? "Paid" : paidAmount > 0 ? "Partial" : "Not sent") : "Not sent",
    bookingStatus: stage === "Won" ? "Confirmed" : "Not booked",
    amountPaid: paidAmount,
    // Budget column holds junk like "-1" on old rows: only a positive number counts
    dealValue: finalAmount || (Number(row.budget) > 0 ? Number(row.budget) : null),
    starred: false,
    stageSince: ctx.stageSince.get(row.id) || createdAt,
    notes: row.notes || "",
    legacy: { stage: row.legacy_stage || rawStage, service: row.service_required || "", babyStatus: row.baby_status || "", babyAge: row.baby_age || "", area: row.area || "", city: row.city || "" },
  };

  const lead = {
    ...derived,
    ...m,
    // Real columns are the source of truth (other systems — website form, WhatsApp — write them)
    id: row.id,
    name: row.name || "Unnamed",
    phone: row.phone || row.whatsapp || "",
    stage,
    source: row.source || "Website",
    hospital: row.hospital_name || m.hospital || null,
    zone: row.zone || m.zone || row.area || null,
    address: row.address || m.address || "",
    owner: row.owner && row.owner !== "Unassigned" ? row.owner : m.owner || null,
    createdAt,
    careStart,
    careEnd,
  };
  // The soonest open follow-up wins over a stale value in meta
  if (nextOpen) lead.nextFollowUp = nextOpen;
  else if (lead.nextFollowUp === undefined) lead.nextFollowUp = null;
  // Old follow-up dates (from before the fresh start) are not carried over
  if (lead.nextFollowUp instanceof Date && lead.nextFollowUp < FOLLOWUP_CUTOFF) lead.nextFollowUp = null;
  // The stored number is permanent; the rank is only a fallback for rows saved before customer_no existed
  lead.customerNo = row.customer_no ?? (lead.customerNo || ctx.customerNo.get(row.id));
  // Same format as the UI's customerId(): CW-P-0001 (pregnancy) / CW-B-0001 (baby born)
  delete lead.lastWin; // only for deals won in this session; after a reload it's in wonDeals
  lead.customerId = `CW-${lead.careKind === "P" ? "P" : "B"}-${String(lead.customerNo || 0).padStart(4, "0")}`;
  return lead;
}

export function uiLeadToDb(l, { packageValue, serviceDays }) {
  const meta = { ...l };
  LEAD_COLUMN_FIELDS.forEach((k) => delete meta[k]);
  delete meta.customerId; // recomputed from customerNo
  delete meta.customerNo; // lives in the customer_no column, assigned by the database
  delete meta.wonDeals; // read from closures
  delete meta.deals;
  let pv = 0;
  let sd = null;
  try { pv = packageValue(l) || 0; } catch { /* ignore */ }
  try { sd = serviceDays(l); } catch { /* ignore */ }
  meta.packageValue = pv;
  const services = Array.isArray(l.services) ? l.services : [];
  return {
    id: l.id,
    name: l.name || "Unnamed",
    phone: l.phone || "",
    whatsapp: l.phone || "",
    source: l.source || "Website",
    stage: l.stage,
    hospital_name: l.hospital || null,
    zone: l.zone || null,
    address: l.address || null,
    owner: l.owner || "Unassigned",
    created_at: (l.createdAt instanceof Date ? l.createdAt : new Date()).toISOString(),
    last_activity_at: l.lastActivity?.at instanceof Date ? l.lastActivity.at.toISOString() : null,
    baby_status: l.careKind === "B" ? "Born" : "Expecting",
    service_required: services.length ? services.join(", ") : l.legacy?.service || "",
    preferred_shift: l.shiftType || null,
    shift_hours_count: l.shiftHours || null,
    care_start_date: ymd(l.careStart),
    service_days: sd,
    notes: l.notes || null,
    meta: pack(meta),
  };
}

/* ---------- Follow-ups ---------- */

export function dbFollowupToUi(r) {
  const m = unpack(r.meta || {}) || {};
  return {
    owner: "You",
    auto: null,
    ...m,
    id: r.id,
    leadId: r.lead_id,
    type: m.type || FU_TYPE[r.type] || "Call",
    action: m.action || r.note || r.type || "Follow-up",
    due: toDate(r.due_at) || new Date(),
    status: r.completed ? "done" : m.status && m.status !== "done" ? m.status : "open",
    completedAt: toDate(r.completed_at) || m.completedAt || null,
    createdAt: toDate(r.created_at) || m.createdAt || new Date(),
  };
}

export function uiFollowupToDb(f) {
  const done = f.status === "done";
  return {
    id: f.id,
    lead_id: f.leadId,
    type: f.type || "Call",
    due_at: (f.due instanceof Date ? f.due : new Date()).toISOString(),
    note: f.action || "",
    completed: done,
    completed_at: done ? (f.completedAt instanceof Date ? f.completedAt : new Date()).toISOString() : null,
    created_at: (f.createdAt instanceof Date ? f.createdAt : new Date()).toISOString(),
    meta: pack(f),
  };
}

/* ---------- Timelines (old activity log → events) ---------- */

function activityToEvent(a) {
  const at = toDate(a.at) || new Date();
  const base = { id: `act-${a.id}`, by: "You", at };
  const msg = a.message || "";
  if (a.type === "created") return { ...base, type: "created", source: msg.replace(/^Lead created (from )?/i, "") };
  if (a.type === "note") return { ...base, type: "note", text: msg };
  if (a.type === "stage") {
    const to = (msg.match(/"([^"]+)"/) || [])[1];
    if (to) return { ...base, type: "stage", from: "", to: normStage(to), extra: LEGACY_STAGE[to] && to !== normStage(to) ? to : null };
  }
  return { ...base, type: "edit", text: msg };
}

/* ---------- Load everything ---------- */

export async function loadCRM() {
  const res = await fetch("/api/crm/v2", { cache: "no-store" });
  if (res.status === 401) {
    window.location.href = "/crm/login";
    throw new Error("Signed out");
  }
  if (!res.ok) throw new Error(`Could not load CRM data (${res.status})`);
  const d = await res.json();

  const wonClosure = new Map();
  const lostClosure = new Map();
  // A customer can have several Won closures (trial, then a month, then an extension):
  // add them up, and show the latest package.
  const dealOf = (c) => ({ at: toDate(c.closure_date), amount: Number(c.final_amount || 0), paid: Number(c.advance_received || 0) });
  const byDate = [...(d.closures || [])].sort((x, y) => new Date(x.closure_date || 0) - new Date(y.closure_date || 0));
  for (const c of byDate) {
    if (c.type !== "Won") { lostClosure.set(c.lead_id, c); continue; }
    const cur = wonClosure.get(c.lead_id);
    wonClosure.set(c.lead_id, cur
      ? { ...c, final_package: c.final_package || cur.final_package, final_amount: Number(cur.final_amount || 0) + Number(c.final_amount || 0), advance_received: Number(cur.advance_received || 0) + Number(c.advance_received || 0), deals: cur.deals + 1, history: [...cur.history, dealOf(c)] }
      : { ...c, deals: 1, history: [dealOf(c)] });
  }

  const leadCreated = new Map((d.leads || []).map((r) => [r.id, toDate(r.created_at) || toDate(r.lead_date)]));
  const followups = (d.followups || [])
    .map(dbFollowupToUi)
    .filter((f) => (leadCreated.get(f.leadId) || 0) >= FOLLOWUP_CUTOFF || (f.createdAt && f.createdAt >= FOLLOWUP_CUTOFF));
  const nextFollowUp = new Map();
  for (const f of followups) {
    if (f.status !== "open" || !f.leadId) continue;
    const cur = nextFollowUp.get(f.leadId);
    if (!cur || f.due < cur) nextFollowUp.set(f.leadId, f.due);
  }

  const activityBy = new Map();
  const stageSince = new Map();
  for (const a of d.activity || []) {
    if (!activityBy.has(a.lead_id)) activityBy.set(a.lead_id, []);
    activityBy.get(a.lead_id).push(a);
    if (a.type === "stage") {
      const t = toDate(a.at);
      const cur = stageSince.get(a.lead_id);
      if (t && (!cur || t > cur)) stageSince.set(a.lead_id, t);
    }
  }

  // Customer IDs follow creation order (oldest = 1)
  const customerNo = new Map();
  [...(d.leads || [])]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || String(a.id).localeCompare(String(b.id)))
    .forEach((r, i) => customerNo.set(r.id, i + 1));

  const ctx = { wonClosure, lostClosure, nextFollowUp, stageSince, customerNo };
  const leads = (d.leads || []).map((r) => dbLeadToUi(r, ctx)).sort((a, b) => b.createdAt - a.createdAt);
  const ids = new Set(leads.map((l) => l.id));

  const timelines = {};
  for (const t of d.timelines || []) if (ids.has(t.lead_id)) timelines[t.lead_id] = unpack(t.events) || [];
  // Leads without a saved timeline start from their old activity log
  const seededTimelines = {};
  for (const l of leads) {
    if (timelines[l.id]) continue;
    const evs = (activityBy.get(l.id) || []).map(activityToEvent);
    if (!evs.some((e) => e.type === "created")) evs.push({ id: `created-${l.id}`, type: "created", by: "You", at: l.createdAt, source: l.source });
    if (l.notes) evs.push({ id: `notes-${l.id}`, type: "note", by: "You", at: l.createdAt, text: l.notes });
    seededTimelines[l.id] = evs.sort((a, b) => b.at - a.at);
  }

  const consults = (d.consults || [])
    .map((c) => ({ ...(unpack(c.data) || {}), id: c.id, leadId: c.lead_id }))
    .filter((c) => c.start instanceof Date && ids.has(c.leadId));

  const settingsRows = Object.fromEntries((d.settings || []).map((s) => [s.id, unpack(s.data)]));

  return {
    leads,
    followups: followups.filter((f) => f.leadId && ids.has(f.leadId)),
    consults,
    timelines,
    seededTimelines,
    settings: settingsRows.settings || null,
    views: settingsRows.views || [],
  };
}

/* ---------- Save queue ---------- */

let queue = new Map(); // key coll:id → op
let timer = null;
let onError = null;
let inflight = Promise.resolve();
export const setSaveErrorHandler = (fn) => (onError = fn);

// New leads get their customer number from the database; the CRM is told which one
let onAssigned = null;
export const setAssignedHandler = (fn) => { onAssigned = fn; };

// Marking a lead Won writes its closure with exactly what was entered in the Won dialog
export function recordWin(leadId, deal) {
  const dealId = `cl-${leadId}-${Date.now()}`; // fixed here so a retried request can't record the deal twice
  enqueue([{ coll: "won", op: "upsert", id: leadId, row: { dealId, package: deal.package, total: deal.dealValue, paid: deal.amountPaid || 0, method: deal.paymentMethod || null } }]);
}

export function enqueue(ops) {
  for (const o of ops) queue.set(`${o.coll}:${o.id}`, o);
  clearTimeout(timer);
  timer = setTimeout(flush, 600);
}

async function send(ops, attempt = 0) {
  try {
    const res = await fetch("/api/crm/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops }),
      keepalive: JSON.stringify(ops).length < 60000,
    });
    if (res.status === 401) {
      window.location.href = "/crm/login";
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 207) throw new Error(`HTTP ${res.status}`);
    if (body.assigned && Object.keys(body.assigned).length) onAssigned?.(body.assigned);
    if (body.failed?.length) {
      // Failures come back as "coll:id" (older servers: bare id). A lead, its timeline and its Won entry share an id.
      const failed = new Set(body.failed);
      const retry = ops.filter((o) => failed.has(`${o.coll}:${o.id}`) || failed.has(o.id));
      if (attempt < 2 && retry.length) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        return send(retry, attempt + 1);
      }
      onError?.(`Couldn't save ${body.failed.length} change${body.failed.length > 1 ? "s" : ""}. Please refresh.`);
    }
  } catch (e) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      return send(ops, attempt + 1);
    }
    onError?.("Couldn't reach the server — your last changes may not be saved.");
  }
}

export function flush() {
  if (!queue.size) return inflight;
  const ops = [...queue.values()];
  queue = new Map();
  for (let i = 0; i < ops.length; i += 200) {
    const chunk = ops.slice(i, i + 200);
    inflight = inflight.then(() => send(chunk));
  }
  return inflight;
}

export const hasPending = () => queue.size > 0;

/* ---------- Diffing (state → write ops) ---------- */

export function diffById(prev, next, coll, toRow) {
  const ops = [];
  const before = new Map((prev || []).map((x) => [x.id, x]));
  const seen = new Set();
  for (const x of next || []) {
    seen.add(x.id);
    if (before.get(x.id) !== x) {
      const row = toRow(x);
      if (row) ops.push({ coll, op: "upsert", id: x.id, row });
    }
  }
  for (const id of before.keys()) if (!seen.has(id)) ops.push({ coll, op: "delete", id });
  return ops;
}

export function diffTimelines(prev, next, leadIds) {
  const ops = [];
  for (const [id, evs] of Object.entries(next || {})) {
    if (prev?.[id] === evs || !leadIds.has(id)) continue;
    ops.push({ coll: "timelines", op: "upsert", id, row: { events: pack((evs || []).slice(0, 500)) } });
  }
  return ops;
}

/* ---------- Derived views of real data ---------- */

export const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / DAY);
