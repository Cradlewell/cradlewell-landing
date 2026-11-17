/* ==========================================================================
   My Day: who needs attention, why, what to do next and when.

   Pure functions over the CRM's live data (leads, follow-up tasks,
   consultations, timelines), so the counts and the rows always come from
   the same rules and can be tested without a browser.

   Times are stored as instants (UTC) and every "today" / "tomorrow" boundary
   here is the Asia/Kolkata calendar day, whatever the device's time zone.
   ========================================================================== */

import { FOLLOWUP_CUTOFF } from "./data.js";

const DAY = 86400000;
const IST_MS = 330 * 60000; // Asia/Kolkata is UTC+5:30 all year (no daylight saving)
const TZ = "Asia/Kolkata";

const ms = (d) => (d instanceof Date ? d.getTime() : d == null || d === "" ? NaN : new Date(d).getTime());
const asDate = (d) => {
  const t = ms(d);
  return Number.isFinite(t) ? new Date(t) : null;
};

/* ---------- Asia/Kolkata calendar ---------- */

// Midnight (IST) of the day an instant falls on, as an instant
export const istDayStart = (d) => new Date(Math.floor((ms(d) + IST_MS) / DAY) * DAY - IST_MS);
// Whole IST calendar days from `now`'s day to `d`'s day (0 = same day, -1 = yesterday)
export const istDayDiff = (d, now) => Math.round((istDayStart(d) - istDayStart(now)) / DAY);
// Wall-clock parts in IST
export const istParts = (d) => {
  const x = new Date(ms(d) + IST_MS);
  return { y: x.getUTCFullYear(), mo: x.getUTCMonth(), d: x.getUTCDate(), h: x.getUTCHours(), mi: x.getUTCMinutes() };
};
// An IST wall-clock time as an instant
export const istAt = (y, mo, d, h = 0, mi = 0) => new Date(Date.UTC(y, mo, d, h, mi) - IST_MS);
// "2026-11-18T10:00" (a datetime-local value, read as IST) ↔ instant
export const fromIstInput = (v) => (v && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? new Date(`${v}:00+05:30`) : null);
export const toIstInput = (d) => new Date(ms(d) + IST_MS).toISOString().slice(0, 16);

const fmt = (opts) => new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...opts });
const TIME = fmt({ hour: "numeric", minute: "2-digit", hour12: true });
const SHORT_DAY = fmt({ weekday: "short", day: "numeric", month: "short" });
const LONG_DAY = fmt({ weekday: "long", day: "numeric", month: "long" });

export const fmtIstTime = (d) => TIME.format(asDate(d)).replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`);
export const fmtIstDay = (d, now) => {
  const diff = istDayDiff(d, now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return SHORT_DAY.format(asDate(d)).replace(",", "");
};
export const fmtIstWhen = (d, now) => `${fmtIstDay(d, now)}, ${fmtIstTime(d)}`;
export const fmtIstLongDate = (d) => LONG_DAY.format(asDate(d));
export const istGreeting = (now) => {
  const h = istParts(now).h;
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

// "3 hrs" / "2 days" / "25 min"
export const fmtSpan = (span) => {
  const mins = Math.max(1, Math.round(span / 60000));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""}`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""}`;
};

// Shortcuts for picking a due time, all in IST
export const laterToday = (now, hours = 3) => {
  const t = new Date(ms(now) + hours * 3600000);
  const p = istParts(t);
  const at = istAt(p.y, p.mo, p.d, p.h, Math.ceil(p.mi / 15) * 15);
  // Past 8 PM it's no longer "today" for a call: next morning instead
  return istParts(at).h >= 20 || istDayDiff(at, now) !== 0 ? tomorrowAt(now) : at;
};
export const tomorrowAt = (now, hour = 10) => {
  const p = istParts(now);
  return istAt(p.y, p.mo, p.d + 1, hour, 0);
};
export const inDaysAt = (now, days, hour = 10) => {
  const p = istParts(now);
  return istAt(p.y, p.mo, p.d + days, hour, 0);
};

/* ---------- Rules (explicit and configurable) ---------- */

export const MYDAY_RULES = {
  // New leads that still need a first human contact are shown from this date
  // (the CRM's existing "fresh start" for follow-ups; older ones are in Needs scheduling).
  newLeadsSince: FOLLOWUP_CUTOFF,
  // Consultations from earlier days that still have no outcome are shown for this long
  consultOutcomeLookbackDays: 14,
  // Stages where a lead is an open opportunity and needs a next action
  activeStages: ["New", "Qualified", "Consult booked", "Consult done", "Payment pending"],
  // Days in a stage before it counts as stale. Filled from Settings → Pipeline stages.
  stuckDays: {},
  // Needs scheduling lists leads touched in this many days first; older ones are an "older backlog" group
  schedulingRecentDays: 30,
};

// Lower comes first. Within a priority, the earliest due time comes first.
export const PRIORITY = {
  reply: 10,
  consultOutcome: 20,
  newLead: 30,
  payment: 40,
  booking: 50,
  postConsult: 55,
  contact: 60,
  review: 70,
};

// Order of stages in Needs scheduling: closest to money first
const STAGE_ORDER = { "Payment pending": 1, "Consult done": 2, "Consult booked": 3, Qualified: 4, Deferred: 5, New: 6 };

/* ---------- Lead facts ---------- */

// Nobody from the team has reached this lead yet. The customer's own form
// submission is a last interaction, but not contact from us.
export const neverContacted = (l) => !l?.lastActivity || !!l.lastActivity.none || !!l.lastActivity.uncontacted;

export const careLabel = (l) => (l?.careKind === "P" ? "Expecting parent" : l?.careKind === "B" ? "Baby born" : null);

// Money still due on a lead or customer. `known` is false when no total was ever recorded:
// that amount is unknown, not zero.
export function balanceOf(l) {
  const total = l?.dealValue > 0 ? Number(l.dealValue) : l?.quoted > 0 ? Number(l.quoted) : 0;
  const paid = Number(l?.amountPaid || 0);
  if (!total) return { known: false, total: null, paid, due: null };
  return { known: true, total, paid, due: Math.max(0, total - paid) };
}
export const paidInFull = (l) => l?.paymentStatus === "Paid" || (balanceOf(l).known && balanceOf(l).due === 0 && balanceOf(l).paid > 0);

// The open task is shown wherever the lead is still being worked. Tasks of lost
// leads are not (Lost cancels them, older data may still have some).
export const taskVisible = (f, lead) => !!lead && f.status === "open" && lead.stage !== "Lost";

export const isBookingTask = (f) =>
  f.kind === "booking" ||
  f.auto === "Consult no-show" ||
  f.auto === "Consult cancelled" ||
  /\b(re)?book\b.*\bconsult|\bconsult\w*\b.*\b(re)?book/i.test(f.action || "");

export function taskKind(f, lead) {
  if (f.type === "Payment") return "payment";
  if (isBookingTask(f)) return "booking";
  if (lead?.stage === "New" && neverContacted(lead)) return "newLead";
  if (lead?.stage === "Consult done") return "postConsult";
  return "contact";
}

// Outcomes that mean the customer was actually reached (a record update or an
// unanswered attempt is not customer contact)
export const CONTACT_OUTCOMES = new Set([
  "Connected", "Follow-up requested", "Not interested", "Payment received", "Part payment received",
  "Promised to pay", "Payment problem", "Consultation booked", "Not ready yet",
  // outcome tags used elsewhere in the CRM
  "Interested", "Price concern", "Converted",
]);
const NOT_REACHED = /no answer|not responding|busy|missed|unreachable|switched off/i;

// The latest real interaction with the customer, from the lead's history.
export function lastContactOf(lead, events = []) {
  let best = null;
  const take = (at, how) => {
    const t = asDate(at);
    if (t && (!best || t > best.at)) best = { at: t, how };
  };
  for (const e of events || []) {
    if (!e) continue;
    if (e.type === "call" && !NOT_REACHED.test(e.outcome || "")) take(e.at, e.label === "Consult" ? "Consultation" : "Call");
    else if (e.type === "whatsapp") (e.messages || []).filter((m) => m.from === "lead").forEach((m) => take(m.at || e.at, "WhatsApp"));
    else if (e.type === "followup" && e.done && CONTACT_OUTCOMES.has(e.outcome)) take(e.at, e.channel || "Follow-up");
  }
  if (lead?.lastContact?.at) take(lead.lastContact.at, lead.lastContact.how || "Contact");
  return best;
}

const waitingOf = (l) => {
  const reviewAt = asDate(l?.waiting?.reviewAt);
  return reviewAt ? { ...l.waiting, reviewAt } : null;
};

/* ---------- The day ---------- */

const consultEnd = (c) => new Date(ms(c.start) + (Number(c.duration) || 30) * 60000);
const consultLive = (c) => c.status !== "cancelled" && c.status !== "rescheduled-old";

function reasonFor(kind, f, lead) {
  if (kind === "payment") {
    const b = balanceOf(lead);
    return b.known && b.due > 0 ? `Payment follow-up · ₹${Math.round(b.due).toLocaleString("en-IN")} due` : "Payment follow-up";
  }
  if (kind === "booking") return f?.auto === "Consult no-show" ? "Missed consultation · rebook" : f?.auto === "Consult cancelled" ? "Cancelled consultation · rebook" : "Book a consultation";
  if (kind === "newLead") return "New lead · not contacted yet";
  if (kind === "postConsult") return "Follow up after consultation";
  if (f?.auto === "Deferred") return "Deferral ended · reconnect";
  return "Follow-up";
}

function schedulingReason(l, now, rules) {
  const b = balanceOf(l);
  const since = asDate(l.stageSince) || asDate(l.createdAt);
  const days = since ? Math.floor((ms(now) - ms(since)) / DAY) : null;
  const limit = rules.stuckDays?.[l.stage];
  const stale = limit != null && days != null && days > limit;
  let reason;
  if (l.stage === "Deferred") reason = `Deferral ended ${fmtIstDay(l.deferredUntil, now).toLowerCase()} · no reconnect planned`;
  else if (l.stage === "New") reason = neverContacted(l) ? "New lead · never contacted" : "New lead with no next action";
  else if (l.stage === "Qualified") reason = "Qualified lead with no next action";
  else if (l.stage === "Consult booked") reason = "Marked Consult booked, but no consultation is scheduled";
  else if (l.stage === "Consult done") reason = "Consultation done · no next step";
  else if (l.stage === "Payment pending") reason = b.known && b.due > 0 ? `Payment pending · ₹${Math.round(b.due).toLocaleString("en-IN")} due · no follow-up` : "Payment pending · no follow-up";
  else reason = `${l.stage} with no next action`;
  const notes = [];
  if (stale) notes.push(`${days} days in ${l.stage}`);
  const nfu = asDate(l.nextFollowUp);
  if (nfu) notes.push(`a follow-up date (${fmtIstDay(nfu, now)}) was set without a task`);
  return { reason, stale, days, note: notes.join(" · ") };
}

/**
 * Everything My Day shows, from one set of rules.
 * Returns rows for the three queue tabs (mutually exclusive), the summary
 * cards and today's consultations. Counts are the lengths of these lists.
 */
export function buildMyDay({ leads = [], followups = [], consults = [], timelines = {}, now = new Date(), rules = MYDAY_RULES } = {}) {
  const r = { ...MYDAY_RULES, ...rules };
  const t = ms(now);
  const leadOf = new Map(leads.map((l) => [l.id, l]));
  const contactCache = new Map();
  const contactOf = (l) => {
    if (!contactCache.has(l.id)) contactCache.set(l.id, lastContactOf(l, timelines[l.id]));
    return contactCache.get(l.id);
  };
  const base = (l) => ({
    leadId: l.id,
    name: l.name,
    phone: l.phone || "",
    care: careLabel(l),
    stage: l.stage,
    lastContact: contactOf(l),
    // Automation context only when the data says so: the lead came in through WhatsApp onboarding
    automation: l.source === "WhatsApp" ? "Came in through WhatsApp onboarding" : null,
  });
  const today = [];
  const overdue = [];
  const scheduling = [];
  const hasAction = new Set(); // lead ids with something planned or on the list

  // 1. Open tasks (the same records Follow-ups shows)
  const openTasks = followups.filter((f) => taskVisible(f, leadOf.get(f.leadId)));
  for (const f of openTasks) {
    hasAction.add(f.leadId);
    const due = asDate(f.due);
    if (!due) continue; // an undated task is never overdue
    const lead = leadOf.get(f.leadId);
    const late = ms(due) < t;
    if (!late && istDayDiff(due, now) !== 0) continue; // later days live in Follow-ups
    const kind = taskKind(f, lead);
    const row = {
      ...base(lead),
      id: `task:${f.id}`,
      kind,
      taskId: f.id,
      type: f.type || "Call",
      priority: PRIORITY[kind],
      reason: reasonFor(kind, f, lead),
      nextAction: f.action || null,
      due,
      overdueBy: late ? t - ms(due) : 0,
      amount: kind === "payment" ? balanceOf(lead) : null,
      auto: f.auto || null,
    };
    (late ? overdue : today).push(row);
  }

  // 2. New leads that need a first human contact (no task yet)
  for (const l of leads) {
    if (l.stage !== "New" || !neverContacted(l) || hasAction.has(l.id)) continue;
    const created = asDate(l.createdAt);
    if (!created || created < r.newLeadsSince) continue;
    hasAction.add(l.id);
    today.push({ ...base(l), id: `new:${l.id}`, kind: "newLead", type: "Call", priority: PRIORITY.newLead, reason: "New lead · not contacted yet", nextAction: "First call", due: null, receivedAt: created, overdueBy: 0 });
  }

  // 3. Customer replies waiting for a person
  for (const l of leads) {
    if (!l.needsReply || l.stage === "Lost") continue;
    hasAction.add(l.id);
    today.push({ ...base(l), id: `reply:${l.id}`, kind: "reply", type: "WhatsApp", priority: PRIORITY.reply, reason: "Customer replied · waiting for you", nextAction: "Reply on WhatsApp", due: null, overdueBy: 0 });
  }

  // 4. Consultations from earlier days with no outcome recorded (today's are in their own section)
  const todayStart = ms(istDayStart(now));
  const lookback = todayStart - r.consultOutcomeLookbackDays * DAY;
  const scheduledFor = new Map(); // lead id → scheduled consults still ahead or awaiting outcome
  for (const c of consults) {
    if (!consultLive(c) || c.status !== "scheduled" || !leadOf.has(c.leadId)) continue;
    scheduledFor.set(c.leadId, (scheduledFor.get(c.leadId) || 0) + 1);
    const end = consultEnd(c);
    if (ms(c.start) >= todayStart || ms(end) >= t || ms(end) < lookback) continue;
    const l = leadOf.get(c.leadId);
    if (l.stage === "Lost") continue;
    overdue.push({ ...base(l), id: `consult:${c.id}`, kind: "consultOutcome", consultId: c.id, type: "Consult", priority: PRIORITY.consultOutcome, reason: "Consultation outcome not recorded", nextAction: "Record consultation outcome", due: end, overdueBy: t - ms(end) });
  }
  for (const id of scheduledFor.keys()) hasAction.add(id);

  // 5. Waiting states: quiet until their review time
  for (const l of leads) {
    if (hasAction.has(l.id) || !r.activeStages.includes(l.stage)) continue;
    const w = waitingOf(l);
    if (!w) continue;
    hasAction.add(l.id);
    const late = ms(w.reviewAt) < t;
    if (!late && istDayDiff(w.reviewAt, now) !== 0) continue; // a valid wait: nothing to do yet
    (late ? overdue : today).push({ ...base(l), id: `review:${l.id}`, kind: "review", type: "Call", priority: PRIORITY.review, reason: `Review: ${w.reason || "waiting on the customer"}`, nextAction: "Check in and decide the next step", due: w.reviewAt, overdueBy: late ? t - ms(w.reviewAt) : 0, waiting: w });
  }

  // 6. Open opportunities with nothing planned
  for (const l of leads) {
    if (hasAction.has(l.id)) continue;
    const deferEnded = l.stage === "Deferred" && asDate(l.deferredUntil) && ms(l.deferredUntil) <= t;
    if (!r.activeStages.includes(l.stage) && !deferEnded) continue;
    const s = schedulingReason(l, now, r);
    // When anything last happened on the lead: it arrived, enquired, changed stage or was worked on
    const lastTouch = Math.max(...[l.createdAt, l.enquiredAt, l.stageSince, l.lastActivity?.at].map((d) => ms(d)).filter(Number.isFinite), 0);
    const recent = t - lastTouch <= r.schedulingRecentDays * DAY;
    scheduling.push({ ...base(l), id: `plan:${l.id}`, kind: "schedule", type: "Call", priority: STAGE_ORDER[l.stage] || 9, reason: s.reason, note: s.note || null, stale: s.stale, staleDays: s.days, recent, lastTouch: lastTouch ? new Date(lastTouch) : null, nextAction: null, due: null, overdueBy: 0, suggestedDate: asDate(l.nextFollowUp) });
  }

  const byPriority = (a, b) => a.priority - b.priority || (a.due ? ms(a.due) : Infinity) - (b.due ? ms(b.due) : Infinity) || ms(a.receivedAt || 0) - ms(b.receivedAt || 0) || String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id));
  const bySchedule = (a, b) => (b.recent ? 1 : 0) - (a.recent ? 1 : 0) || a.priority - b.priority || (b.stale ? 1 : 0) - (a.stale ? 1 : 0) || (b.staleDays || 0) - (a.staleDays || 0) || String(a.name).localeCompare(String(b.name)) || String(a.id).localeCompare(String(b.id));
  today.sort(byPriority);
  overdue.sort(byPriority);
  scheduling.sort(bySchedule);

  return {
    queue: { today, overdue, scheduling },
    cards: summaryCards({ leads, consults, today, overdue, now, followups: openTasks }),
    consultations: todaysConsultations({ leads, consults, now }),
  };
}

function summaryCards({ leads, consults, today, overdue, now, followups }) {
  const received = leads.filter((l) => {
    const at = asDate(l.enquiredAt) || asDate(l.createdAt);
    return at && istDayDiff(at, now) === 0;
  });
  const isTask = (row) => !!row.taskId;
  const outstanding = leads
    .filter((l) => l.stage === "Payment pending" || (l.stage === "Won" && balanceOf(l).known && balanceOf(l).due > 0))
    .map((l) => {
      const b = balanceOf(l);
      const task = followups.filter((f) => f.leadId === l.id && f.type === "Payment").sort((a, c) => ms(a.due) - ms(c.due))[0] || null;
      return { lead: l, ...b, task };
    })
    .filter((x) => !x.known || x.due > 0);
  const live = consults.filter((c) => consultLive(c) && leads.some((l) => l.id === c.leadId) && istDayDiff(c.start, now) === 0);
  const t = ms(now);
  return {
    newLeads: { received: received.length, needContact: received.filter((l) => l.stage === "New" && neverContacted(l)).length },
    consultations: {
      total: live.length,
      upcoming: live.filter((c) => c.status === "scheduled" && ms(consultEnd(c)) >= t).length,
      toRecord: live.filter((c) => c.status === "scheduled" && ms(consultEnd(c)) < t).length,
      completed: live.filter((c) => c.status === "done" || c.status === "noshow").length,
    },
    followups: { dueToday: today.filter(isTask).length, overdue: overdue.filter(isTask).length },
    payments: {
      customers: outstanding.length,
      amount: outstanding.reduce((s, x) => s + (x.known ? x.due : 0), 0),
      unknown: outstanding.filter((x) => !x.known).length,
      list: outstanding.sort((a, b) => (b.due || 0) - (a.due || 0) || String(a.lead.name).localeCompare(String(b.lead.name))),
    },
  };
}

function todaysConsultations({ leads, consults, now }) {
  const leadOf = new Map(leads.map((l) => [l.id, l]));
  const t = ms(now);
  return consults
    .filter((c) => consultLive(c) && leadOf.has(c.leadId) && istDayDiff(c.start, now) === 0)
    .sort((a, b) => ms(a.start) - ms(b.start) || String(a.id).localeCompare(String(b.id)))
    .map((c) => {
      const l = leadOf.get(c.leadId);
      const end = consultEnd(c);
      const status =
        c.status === "done" ? "completed" : c.status === "noshow" ? "noshow" : ms(end) < t ? "needsOutcome" : ms(c.start) <= t ? "live" : "upcoming";
      return { id: c.id, leadId: l.id, name: l.name, phone: l.phone || "", care: careLabel(l), start: asDate(c.start), end, status, outcome: c.outcome || null, mode: String(c.mode || "").toLowerCase(), confirmed: !!c.confirmed, rescheduled: !!c.rescheduledFrom, lead: l, raw: c };
    });
}

/* ---------- Recording an outcome ---------- */

// Outcomes offered for each kind of action. Contact outcomes are never forced on
// payment or consultation work.
export const OUTCOMES_FOR = {
  contact: ["Connected", "No answer", "Follow-up requested", "Not interested"],
  newLead: ["Connected", "No answer", "Follow-up requested", "Not interested"],
  postConsult: ["Connected", "No answer", "Follow-up requested", "Not interested"],
  reply: ["Connected", "Follow-up requested", "Not interested"],
  review: ["Connected", "No answer", "Still waiting", "Not interested"],
  booking: ["Consultation booked", "No answer", "Not ready yet", "Not interested"],
  payment: ["Payment received", "Promised to pay", "No answer", "Payment problem"],
};
// Outcomes that end the opportunity instead of needing a next step
export const CLOSING_OUTCOMES = new Set(["Not interested"]);
// Outcomes handled by an existing flow (booking form, payment form) rather than here
export const HANDOFF_OUTCOMES = new Set(["Consultation booked"]);

/**
 * Applies a recorded outcome. Pure: returns the new task list, the lead
 * changes and the history events. Saving the same submission twice gives the
 * same result (the next task's id is chosen once by the caller).
 *
 * input: { followups, lead, row, outcome, note, next, payment, now, by, nextId, eventIds }
 *   next: { kind: "task", type, due, action } | { kind: "wait", reason, reviewAt } | null
 *   payment: { amount } when a payment was received on a known balance
 */
export function applyOutcome({ followups, lead, row, outcome, note = "", next = null, payment = null, now = new Date(), by = "You", nextId, eventIds = {} }) {
  const at = new Date(ms(now));
  const reached = CONTACT_OUTCOMES.has(outcome);
  const channel = row?.type || "Call";
  let out = followups;
  if (row?.taskId) {
    out = out.map((f) =>
      f.id === row.taskId ? { ...f, status: "done", completedAt: at, completedBy: by, outcome, outcomeNote: note || null } : f,
    );
  }
  const leadPatch = {
    // Planning a step without talking to the customer is a record update, not contact
    lastActivity: row ? { type: row.kind === "payment" ? "Payment follow-up" : row.kind === "review" ? "Review" : channel, at, by, none: false } : { ...(lead.lastActivity || {}), type: "Updated", at, by },
    needsReply: row?.kind === "reply" && !reached ? lead.needsReply : false,
  };
  if (reached) leadPatch.lastContact = { at, how: channel };
  if (payment && payment.amount > 0) {
    const b = balanceOf(lead);
    const paid = (b.paid || 0) + Number(payment.amount);
    leadPatch.amountPaid = b.known ? Math.min(paid, b.total) : paid;
    if (b.known) leadPatch.paymentStatus = leadPatch.amountPaid >= b.total ? "Paid" : "Partial";
  }
  const events = [];
  if (row?.taskId || row?.kind) {
    events.push({ id: eventIds.done || `ev-${row?.id}-${at.getTime()}`, type: "followup", done: true, by, at, outcome, action: row?.nextAction || row?.reason || "", channel, ...(note ? { notes: note } : {}), ...(payment?.amount ? { amount: Number(payment.amount) } : {}) });
  }
  if (next?.kind === "task") {
    const task = { id: nextId, leadId: lead.id, type: next.type || "Call", action: next.action || "Follow-up", due: new Date(ms(next.due)), owner: lead.owner || by, status: "open", createdAt: at };
    out = out.some((f) => f.id === nextId) ? out.map((f) => (f.id === nextId ? { ...f, ...task } : f)) : [...out, task];
    Object.assign(leadPatch, { nextFollowUp: task.due, nextAction: task.action, waiting: null });
    events.push({ id: eventIds.next || `ev-next-${nextId}`, type: "followup", by, at: new Date(at.getTime() + 1), when: task.due, action: task.action });
  } else if (next?.kind === "wait") {
    const reviewAt = new Date(ms(next.reviewAt));
    Object.assign(leadPatch, { waiting: { reason: next.reason, reviewAt, setAt: at, by }, nextFollowUp: null });
    events.push({ id: eventIds.next || `ev-wait-${lead.id}-${at.getTime()}`, type: "edit", by, at: new Date(at.getTime() + 1), text: `Waiting: ${next.reason} · review ${fmtIstWhen(reviewAt, at)}` });
  } else if (row?.kind === "review") {
    leadPatch.waiting = null;
  }
  return { followups: out, leadPatch, events };
}

// Validation shared by the form and tests: an open opportunity must leave with a
// scheduled next action or an explicit wait with a review time in the future.
export function outcomeProblem({ outcome, next, payment, balance, now = new Date(), needsNext = true }) {
  if (!outcome) return "Choose what happened.";
  if (payment && balance?.known && Number(payment.amount) > balance.due) return "That's more than the balance due.";
  if (CLOSING_OUTCOMES.has(outcome) || HANDOFF_OUTCOMES.has(outcome) || !needsNext) return null;
  if (!next) return "Choose the next step.";
  const when = next.kind === "task" ? next.due : next.reviewAt;
  if (!when || !Number.isFinite(ms(when))) return "Pick a date and time.";
  if (ms(when) <= ms(now)) return "Pick a time in the future.";
  if (next.kind === "task" && !String(next.action || "").trim()) return "Say what the next action is.";
  if (next.kind === "wait" && !String(next.reason || "").trim()) return "Say what you're waiting for.";
  return null;
}

/* ---------- Snooze ---------- */

// Moves an existing task (never creates a second one) and keeps the history.
export function snoozeTask(followups, taskId, until, now = new Date(), by = "You") {
  const to = new Date(ms(until));
  if (!Number.isFinite(to.getTime()) || to.getTime() <= ms(now)) throw new Error("Snooze needs a future time");
  return followups.map((f) =>
    f.id === taskId ? { ...f, due: to, snoozes: [...(f.snoozes || []), { from: asDate(f.due), to, at: new Date(ms(now)), by }] } : f,
  );
}

// Keyboard and screen-reader friendly label for a due time
export function dueText(row, now) {
  if (!row.due) return row.kind === "newLead" && row.receivedAt ? `Received ${fmtIstWhen(row.receivedAt, now)}` : row.kind === "reply" ? "Waiting now" : "Not scheduled";
  if (row.overdueBy > 0) return `Overdue by ${fmtSpan(row.overdueBy)} · was ${fmtIstWhen(row.due, now)}`;
  return fmtIstWhen(row.due, now);
}

export function lastContactText(c, now) {
  if (!c) return "No customer contact recorded";
  return `Last customer contact: ${fmtIstDay(c.at, now)}${istDayDiff(c.at, now) === 0 ? `, ${fmtIstTime(c.at)}` : ""} · ${c.how}`;
}

/* ---------- Keeping tasks true to what happened ---------- */

const nextWorkingMorning = (now) => tomorrowAt(now, 10);

/**
 * Closes tasks made obsolete by authoritative events and adds the one follow-up
 * a part payment still needs. Safe to run any number of times: it returns the
 * same array when nothing changes, and tasks it creates have fixed ids.
 *  - A booking task (book / rebook a consultation) closes when the lead has a
 *    scheduled consultation booked after the task was created.
 *  - A payment task closes only when the customer has paid in full.
 *  - A deal recorded in this session with money still due gets a "Collect
 *    balance" task, unless a payment task is already open.
 */
export function reconcileTasks(followups, leads, consults, now = new Date(), by = "System") {
  const leadOf = new Map(leads.map((l) => [l.id, l]));
  let changed = false;
  let out = followups.map((f) => {
    if (f.status !== "open") return f;
    const l = leadOf.get(f.leadId);
    if (!l) return f;
    if (isBookingTask(f)) {
      const created = ms(f.createdAt) || 0;
      const booked = consults.find(
        (c) => c.leadId === f.leadId && c.status === "scheduled" && (ms(c.bookedAt) || ms(c.start)) >= created && ms(c.start) >= created,
      );
      if (booked) {
        changed = true;
        return { ...f, status: "done", completedAt: new Date(ms(now)), completedBy: by, outcome: "Consultation booked", resolvedBy: `consult:${booked.id}` };
      }
    }
    if (f.type === "Payment" && paidInFull(l)) {
      changed = true;
      return { ...f, status: "done", completedAt: new Date(ms(now)), completedBy: by, outcome: "Paid in full", resolvedBy: "payment" };
    }
    return f;
  });
  for (const l of leads) {
    if (l.stage !== "Won" || !l.lastWin?.at) continue;
    const b = balanceOf(l);
    if (!b.known || b.due <= 0) continue;
    if (out.some((f) => f.leadId === l.id && f.status === "open" && f.type === "Payment")) continue;
    const id = `fu-bal-${l.id}-${ms(l.lastWin.at)}`;
    if (out.some((f) => f.id === id)) continue; // created before (maybe already done): never twice
    out = [...out, { id, leadId: l.id, type: "Payment", action: `Collect balance · ₹${Math.round(b.due).toLocaleString("en-IN")}`, due: nextWorkingMorning(now), owner: l.owner || "You", status: "open", auto: "Balance due", createdAt: new Date(ms(now)) }];
    changed = true;
  }
  return changed ? out : followups;
}

/**
 * Some screens set a follow-up date on the lead itself ("Snooze", "Set
 * follow-up" on Leads and the lead record). A date with no task never reached
 * Follow-ups or My Day. For each lead whose date was just changed here, this
 * moves the lead's next open task to that date, or creates one.
 */
export function followUpDatesToTasks(followups, changedLeads, consults, now = new Date()) {
  let out = followups;
  for (const l of changedLeads) {
    const when = asDate(l.nextFollowUp);
    if (!when || l.stage === "Lost" || l.stage === "Won") continue;
    const near = (d) => Math.abs(ms(d) - ms(when)) < 60000;
    const open = out.filter((f) => f.leadId === l.id && f.status === "open");
    if (open.some((f) => near(f.due))) continue;
    if (consults.some((c) => c.leadId === l.id && c.status === "scheduled" && near(c.start))) continue;
    const movable = open.filter((f) => f.type !== "Payment").sort((a, b) => ms(a.due) - ms(b.due))[0];
    if (movable) {
      out = out.map((f) => (f.id === movable.id ? { ...f, due: when, snoozes: [...(f.snoozes || []), { from: asDate(f.due), to: when, at: new Date(ms(now)), by: "You" }] } : f));
      continue;
    }
    const id = `fu-date-${l.id}-${ms(when)}`;
    if (out.some((f) => f.id === id)) continue;
    out = [...out, { id, leadId: l.id, type: "Call", action: l.nextAction || "Follow-up call", due: when, owner: l.owner || "You", status: "open", auto: "Follow-up date", createdAt: new Date(ms(now)) }];
  }
  return out;
}
