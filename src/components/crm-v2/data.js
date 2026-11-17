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
    // When this person last enquired. The website form moves lead_date to now
    // when a known number submits again, so a returning enquiry counts as new.
    enquiredAt: toDate(row.lead_date) || createdAt,
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
  delete lead.lastWin; // only for deals won in this session; after a reload it's in wonDeals
  // Same format as the UI's customerId(): one permanent ID per customer, CW-C-0001
  lead.customerId = `CW-C-${String(lead.customerNo || 0).padStart(4, "0")}`;
  return lead;
}

export function uiLeadToDb(l, { packageValue, serviceDays }) {
  const meta = { ...l };
  LEAD_COLUMN_FIELDS.forEach((k) => delete meta[k]);
  delete meta.customerId; // recomputed from customerNo
  delete meta.enquiredAt; // read from the lead_date column
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
    phone: phoneDigits(l.phone),
    whatsapp: phoneDigits(l.phone),
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
    // "cancelled" is stored as completed so other readers of the table never
    // treat it as open; it stays out of the done counts in the CRM.
    status: m.status === "cancelled" ? "cancelled" : r.completed ? "done" : m.status && m.status !== "done" ? m.status : "open",
    completedAt: toDate(r.completed_at) || m.completedAt || null,
    createdAt: toDate(r.created_at) || m.createdAt || new Date(),
  };
}

export function uiFollowupToDb(f) {
  const done = f.status === "done" || f.status === "cancelled";
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

/* ---------- Phone numbers ---------- */

// Leads are stored with the bare 10-digit mobile, the form the website form and
// WhatsApp use and match duplicates on. "+91 98450 12345", "919845012345" and
// "09845012345" all become "9845012345"; anything shorter is kept as typed.
export function phoneDigits(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : String(raw || "").trim();
}

/* ---------- Tasks that follow a lead's stage ---------- */

// Stages where the lead needs no more calls. Deferred pauses it instead: its
// tasks are replaced by one reconnect call on the chosen date.
const CLOSED_STAGES = ["Won", "Lost"];
const UNDO_REOPEN_MS = 10 * 60000;

// What settleTasks compares: the stage, plus the reconnect date while deferred
// so that re-deferring to a new date moves the task too.
export const stageKey = (l) => `${l.stage}|${l.stage === "Deferred" && l.deferredUntil ? new Date(l.deferredUntil).getTime() : ""}`;

// moved: leads whose stageKey changed; before: id → previous stage.
// Open tasks are cancelled when a lead is won, lost or deferred (a won lead
// keeps its payment tasks). Deferring adds a reconnect call on the date.
// Moving back to an active stage soon after (an undo) reopens what was
// cancelled and drops the reconnect call.
export function settleTasks(followups, moved, before, now = new Date()) {
  let out = followups;
  for (const l of moved) {
    const from = before.get(l.id);
    const to = l.stage;
    const pausing = CLOSED_STAGES.includes(to) || to === "Deferred";
    if (pausing) {
      out = out.map((f) =>
        f.leadId === l.id && f.status === "open" && f.type !== "Payment"
          ? { ...f, status: "cancelled", closedBy: to, completedAt: now }
          : f,
      );
      if (to === "Deferred" && l.deferredUntil) {
        out = [
          {
            id: `fu-def-${l.id}-${now.getTime()}`,
            leadId: l.id,
            type: "Call",
            action: `Reconnect after deferral${l.deferNote ? ` · ${l.deferNote}` : ""}`,
            due: new Date(l.deferredUntil),
            owner: l.owner || "You",
            status: "open",
            auto: "Deferred",
            sakhiStatus: null,
            summary: null,
            createdAt: now,
          },
          ...out,
        ];
      }
    } else if (CLOSED_STAGES.includes(from) || from === "Deferred") {
      out = out.map((f) => {
        if (f.leadId !== l.id) return f;
        if (f.status === "open" && f.auto === "Deferred") return { ...f, status: "cancelled", closedBy: to, completedAt: now };
        if (f.status === "cancelled" && f.closedBy === from && f.auto !== "Deferred" && now - new Date(f.completedAt) < UNDO_REOPEN_MS)
          return { ...f, status: "open", closedBy: null, completedAt: null };
        return f;
      });
    }
  }
  return out;
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

export async function loadCRM({ quiet = false } = {}) {
  const res = await fetch("/api/crm/v2", { cache: "no-store" });
  if (res.status === 401) {
    if (!quiet) window.location.href = "/crm/login";
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
  for (const o of ops) {
    const key = `${o.coll}:${o.id}`;
    queue.set(key, mergeOp(queue.get(key), o));
  }
  clearTimeout(timer);
  timer = setTimeout(flush, 600);
}

/* ---------- Partial lead updates ---------- */

// A lead edit sends only what changed: the changed columns, plus the meta keys
// set or removed. The server merges that into the stored row, so two people
// editing different things on the same lead no longer overwrite each other.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function leadPatch(prevRow, nextRow) {
  const row = {};
  for (const k of Object.keys(nextRow)) if (k !== "meta" && k !== "id" && !same(nextRow[k], prevRow[k])) row[k] = nextRow[k];
  const a = prevRow.meta || {};
  const b = nextRow.meta || {};
  const set = {};
  for (const k of Object.keys(b)) if (!same(b[k], a[k])) set[k] = b[k];
  const unset = Object.keys(a).filter((k) => !(k in b));
  if (!Object.keys(row).length && !Object.keys(set).length && !unset.length) return null;
  return { row, meta: { set, unset } };
}

export function applyMetaPatch(meta, patch) {
  const out = { ...(meta || {}), ...(patch?.set || {}) };
  for (const k of patch?.unset || []) delete out[k];
  return out;
}

// Two queued writes for the same record become one. A patch on top of a patch
// keeps both sets of changes; a patch on a not-yet-sent full row is folded in.
export function mergeOp(prev, next) {
  if (!prev || next.op !== "patch") return next;
  if (prev.op === "patch") {
    const set = { ...prev.meta.set, ...next.meta.set };
    for (const k of next.meta.unset) delete set[k];
    const unset = [...new Set([...prev.meta.unset.filter((k) => !(k in next.meta.set)), ...next.meta.unset])];
    return { ...next, row: { ...prev.row, ...next.row }, meta: { set, unset } };
  }
  if (prev.op === "upsert") return { ...prev, row: { ...prev.row, ...next.row, meta: applyMetaPatch(prev.row.meta, next.meta) } };
  return next;
}

/* ---------- What a background refresh may overwrite ---------- */

// Objects that came from a refresh: the save step skips them, so pulling in
// someone else's change never echoes it back to the server.
const REMOTE = new WeakSet();
export const isRemote = (x) => !!x && typeof x === "object" && REMOTE.has(x);

const sending = new Map(); // key → requests in flight
const answeredAt = new Map(); // key → when the server last answered a write for it
function markSending(ops, delta) {
  for (const o of ops) {
    const key = `${o.coll}:${o.id}`;
    const n = (sending.get(key) || 0) + delta;
    if (n > 0) sending.set(key, n);
    else sending.delete(key);
    if (delta < 0) answeredAt.set(key, Date.now());
  }
}

// True while this tab has a write for the record that the server may not have
// seen when a refresh started at `since`: queued, held (a pending delete),
// in flight, or answered after the refresh began. Then the local copy wins.
export function isBusy(coll, id, since) {
  const key = `${coll}:${id}`;
  return queue.has(key) || later.has(key) || sending.has(key) || (answeredAt.get(key) || 0) >= since;
}

// Merge a refreshed list into the local one. Records this tab is still saving
// keep their local version (or stay absent, for a pending delete); everything
// else takes the server's. Unchanged records keep their identity, and when
// nothing changed the same array comes back so nothing re-renders.
export function mergeRemote(local, remote, canTake, onGone) {
  const localById = new Map(local.map((x) => [x.id, x]));
  const remoteIds = new Set(remote.map((x) => x.id));
  const out = [];
  for (const x of local) {
    if (remoteIds.has(x.id)) continue;
    if (!canTake(x.id)) out.push(x); // created here, not saved yet
    else onGone?.(x.id); // deleted elsewhere
  }
  for (const r of remote) {
    const l = localById.get(r.id);
    if (!canTake(r.id)) {
      if (l) out.push(l);
      continue;
    }
    if (l && same(l, r)) {
      out.push(l);
      continue;
    }
    REMOTE.add(r);
    out.push(r);
  }
  return out.length === local.length && out.every((x, i) => x === local[i]) ? local : out;
}

// Same for the timelines map (lead id → events).
export function mergeRemoteMap(local, remote, canTake) {
  let changed = false;
  const out = { ...local };
  for (const [id, evs] of Object.entries(remote || {})) {
    if (!canTake(id) || same(local[id], evs)) continue;
    REMOTE.add(evs);
    out[id] = evs;
    changed = true;
  }
  return changed ? out : local;
}

/* ---------- Changes that couldn't be saved yet ---------- */

// A write that fails is never dropped silently. It's kept here and in the
// browser's storage, and tried again when the connection returns, every 30 s,
// and the next time the CRM opens (after signing in again if the session ran
// out). Only a write the server keeps rejecting is given up, after 5 rounds,
// and the user is told.
const STASH_KEY = "cw-crm-unsaved";
const MAX_ROUNDS = 5;
const stash = new Map(); // key coll:id → { op, rounds }
let onStatus = null;
export const setSaveStatusHandler = (fn) => {
  onStatus = fn;
  fn?.(stash.size);
};

function persistStash() {
  try {
    if (stash.size) localStorage.setItem(STASH_KEY, JSON.stringify([...stash.values()]));
    else localStorage.removeItem(STASH_KEY);
  } catch {
    // storage blocked: the in-memory copy still retries while the tab is open
  }
  onStatus?.(stash.size);
}

function keep(ops, countRound) {
  for (const o of ops) {
    const key = `${o.coll}:${o.id}`;
    const cur = stash.get(key);
    stash.set(key, { op: cur ? mergeOp(cur.op, o) : o, rounds: (cur?.rounds || 0) + (countRound ? 1 : 0) });
  }
  persistStash();
}

// Called once when the CRM opens: picks up what a previous visit couldn't save.
export function restoreStash() {
  try {
    for (const e of JSON.parse(localStorage.getItem(STASH_KEY) || "[]")) {
      if (e?.op?.coll && e.op.id) stash.set(`${e.op.coll}:${e.op.id}`, { op: e.op, rounds: e.rounds || 0 });
    }
  } catch {
    // unreadable: nothing to restore
  }
  onStatus?.(stash.size);
  return stash.size;
}

// Put kept writes back in the queue (under any newer edit of the same record) and send them.
export function retryStash() {
  if (!stash.size) return inflight;
  for (const [key, { op }] of stash) {
    const newer = queue.get(key);
    queue.set(key, newer ? mergeOp(op, newer) : op);
    roundsOf.set(key, stash.get(key).rounds);
  }
  stash.clear();
  persistStash();
  return flush();
}
const roundsOf = new Map(); // rounds a retried write had already used

async function send(ops, attempt = 0) {
  try {
    const res = await fetch("/api/crm/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops }),
      keepalive: JSON.stringify(ops).length < 60000,
    });
    if (res.status === 401) {
      // Signed out: keep this batch and everything still waiting, then sign in again.
      // The next visit saves them before loading.
      keep(ops, false);
      keep([...queue.values(), ...[...later.values()].map((h) => h.op)], false);
      queue = new Map();
      for (const h of later.values()) clearTimeout(h.timer);
      later.clear();
      window.location.href = "/crm/login?expired=1";
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
      // Keep the rejected writes for another round; give up on one after MAX_ROUNDS.
      const giveUp = [];
      for (const o of retry) {
        const key = `${o.coll}:${o.id}`;
        const rounds = (roundsOf.get(key) || 0) + 1;
        if (rounds >= MAX_ROUNDS) {
          giveUp.push(o);
          continue;
        }
        const newer = stash.get(key); // a later edit that failed to send meanwhile
        stash.set(key, { op: newer ? mergeOp(o, newer.op) : o, rounds });
      }
      persistStash();
      if (giveUp.length) onError?.(`The server keeps refusing ${giveUp.length} change${giveUp.length > 1 ? "s" : ""}, so ${giveUp.length > 1 ? "they were" : "it was"} not saved. Reload the CRM and try again.`);
      else onError?.(`Couldn't save ${retry.length} change${retry.length > 1 ? "s" : ""} yet. They're kept and will be tried again.`);
    }
    for (const o of ops) roundsOf.delete(`${o.coll}:${o.id}`);
  } catch (e) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      return send(ops, attempt + 1);
    }
    keep(ops, false);
    onError?.("Couldn't reach the server. Your changes are kept and will be saved when the connection is back.");
  }
}

// Writes held back for a while before they join the queue. A lead delete
// cascades on the server (follow-ups, consultations, history, payments), so it
// waits out the Undo window: Undo then just cancels it and nothing was lost.
// flush() releases them early, so logging out or closing the tab still deletes.
const later = new Map(); // key coll:id → { op, timer }

export function enqueueLater(op, ms) {
  const key = `${op.coll}:${op.id}`;
  clearTimeout(later.get(key)?.timer);
  later.set(key, {
    op,
    timer: setTimeout(() => {
      later.delete(key);
      enqueue([op]);
    }, ms),
  });
}

// True when a held write was cancelled before it reached the server.
export function cancelLater(coll, id) {
  const key = `${coll}:${id}`;
  const held = later.get(key);
  if (!held) return false;
  clearTimeout(held.timer);
  later.delete(key);
  return true;
}

export function flush() {
  for (const [key, held] of later) {
    clearTimeout(held.timer);
    queue.set(key, held.op);
  }
  later.clear();
  if (!queue.size) return inflight;
  const ops = [...queue.values()];
  queue = new Map();
  for (let i = 0; i < ops.length; i += 200) {
    const chunk = ops.slice(i, i + 200);
    markSending(chunk, 1);
    inflight = inflight.then(() => send(chunk)).finally(() => markSending(chunk, -1));
  }
  return inflight;
}

export const hasPending = () => queue.size > 0 || later.size > 0 || stash.size > 0;
// True while a write for this record is kept on the device because the server didn't take it
export const isStashed = (coll, id) => stash.has(`${coll}:${id}`);

/* ---------- Diffing (state → write ops) ---------- */

export function diffById(prev, next, coll, toRow, { patch } = {}) {
  const ops = [];
  const before = new Map((prev || []).map((x) => [x.id, x]));
  const seen = new Set();
  for (const x of next || []) {
    seen.add(x.id);
    const was = before.get(x.id);
    if (was !== x && !isRemote(x)) {
      const row = toRow(x);
      if (!row) continue;
      if (patch && was) {
        const p = patch(toRow(was) || {}, row);
        if (p) ops.push({ coll, op: "patch", id: x.id, ...p });
      } else ops.push({ coll, op: "upsert", id: x.id, row });
    }
  }
  for (const id of before.keys()) if (!seen.has(id)) ops.push({ coll, op: "delete", id });
  return ops;
}

export function diffTimelines(prev, next, leadIds) {
  const ops = [];
  for (const [id, evs] of Object.entries(next || {})) {
    if (prev?.[id] === evs || !leadIds.has(id) || isRemote(evs)) continue;
    // The server merges by event id, so name the ones deleted here
    const kept = new Set((evs || []).map((e) => e.id));
    const removed = (prev?.[id] || []).map((e) => e.id).filter((e) => !kept.has(e));
    ops.push({ coll: "timelines", op: "upsert", id, row: { events: pack((evs || []).slice(0, 500)), removed } });
  }
  return ops;
}

/* ---------- Derived views of real data ---------- */

export const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / DAY);
