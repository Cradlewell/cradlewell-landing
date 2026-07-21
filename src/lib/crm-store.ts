"use client";
import type { Lead, Followup, Quotation, Closure, ActivityLog, CRMDb, LeadStage } from "./crm-types";
import { useState, useEffect } from "react";

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ─── Global in-memory state ───────────────────────────────────────────────────
let _db: CRMDb = { leads: [], followups: [], quotations: [], closures: [], activity: [] };
let _initialized = false;
let _fetching = false;
let _retryCount = 0;
const RETRY_DELAYS = [5_000, 15_000, 30_000];

// ─── Per-slice listener system ────────────────────────────────────────────────
// Each slice has its own Set. "_all" listeners fire on every notify call.
// This lets useLeads/useFollowups/etc. subscribe narrowly so unrelated mutations
// don't trigger re-renders in uninterested pages.
type DBSlice = keyof CRMDb;
const sliceListeners: Record<DBSlice | "_all", Set<() => void>> = {
  leads: new Set(),
  followups: new Set(),
  quotations: new Set(),
  closures: new Set(),
  activity: new Set(),
  _all: new Set(),
};

function notify(...slices: DBSlice[]) {
  const fired = new Set<() => void>();
  for (const s of slices) sliceListeners[s].forEach(cb => fired.add(cb));
  sliceListeners._all.forEach(cb => fired.add(cb));
  fired.forEach(cb => cb());
}

async function syncAll() {
  if (_fetching) return;
  _fetching = true;
  try {
    const res = await fetch("/api/crm/data");
    if (res.ok) {
      _db = await res.json();
      _initialized = true;
      _retryCount = 0;
    } else if (res.status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/crm/login")) {
        window.location.href = "/crm/login";
      }
      return;
    } else {
      _initialized = true;
    }
  } catch {
    _initialized = true;
    // Schedule retry with exponential backoff — don't strand users on flaky connections
    if (_retryCount < RETRY_DELAYS.length) {
      setTimeout(syncAll, RETRY_DELAYS[_retryCount++]);
    }
  } finally {
    _fetching = false;
    notify("leads", "followups", "quotations", "closures", "activity");
  }
}

// Re-sync when the user returns to this tab after it was hidden.
// Only fires when there are active CRM components on the page.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || _fetching) return;
    const hasListeners =
      sliceListeners._all.size > 0 ||
      sliceListeners.leads.size > 0 ||
      sliceListeners.followups.size > 0 ||
      sliceListeners.quotations.size > 0 ||
      sliceListeners.closures.size > 0 ||
      sliceListeners.activity.size > 0;
    if (hasListeners) syncAll();
  });
}

async function apiPost(path: string, data: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPut(path: string, data: unknown) {
  const res = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete(path: string) {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const api = {
  addLead(input: Omit<Lead, "id" | "createdAt" | "lastActivityAt" | "stage" | "temperature">) {
    const id = uid();
    const lead: Lead = {
      ...input,
      id,
      stage: "New Lead",
      temperature: "Cold",
      createdAt: now(),
      lastActivityAt: now(),
    };
    const act: ActivityLog = { id: uid(), leadId: id, type: "created", message: `Lead created from ${input.source}`, at: now() };
    _db.leads.unshift(lead);
    _db.activity.unshift(act);
    notify("leads", "activity");
    apiPost("/api/crm/leads", lead)
      .then(() => apiPost("/api/crm/activity", act).catch(console.error))
      .catch(() => {
        _db.leads = _db.leads.filter((l) => l.id !== id);
        _db.activity = _db.activity.filter((a) => a.id !== act.id);
        notify("leads", "activity");
      });
  },

  updateLead(id: string, patch: Partial<Lead>) {
    const lead = _db.leads.find((l) => l.id === id);
    if (!lead) return;
    const prev = { ...lead };
    Object.assign(lead, patch, { lastActivityAt: now() });
    notify("leads");
    apiPut(`/api/crm/leads/${id}`, patch).catch(() => {
      Object.assign(lead, prev);
      notify("leads");
    });
  },

  deleteLead(id: string) {
    const snap = {
      leads: [..._db.leads],
      followups: [..._db.followups],
      quotations: [..._db.quotations],
      closures: [..._db.closures],
      activity: [..._db.activity],
    };
    _db.leads = _db.leads.filter((l) => l.id !== id);
    _db.followups = _db.followups.filter((f) => f.leadId !== id);
    _db.quotations = _db.quotations.filter((q) => q.leadId !== id);
    _db.closures = _db.closures.filter((c) => c.leadId !== id);
    _db.activity = _db.activity.filter((a) => a.leadId !== id);
    notify("leads", "followups", "quotations", "closures", "activity");
    apiDelete(`/api/crm/leads/${id}`).catch(() => {
      Object.assign(_db, snap);
      notify("leads", "followups", "quotations", "closures", "activity");
    });
  },

  moveStage(id: string, stage: LeadStage) {
    const lead = _db.leads.find((l) => l.id === id);
    if (!lead) return;
    const prevStage = lead.stage;
    lead.stage = stage;
    lead.lastActivityAt = now();
    const actAt = now();
    const actId = uid();
    const actMsg = `Stage changed to "${stage}"`;
    _db.activity.unshift({ id: actId, leadId: id, type: "stage", message: actMsg, at: actAt });
    let newFollowup: Followup | null = null;
    if (stage === "Negotiation") {
      newFollowup = {
        id: uid(), leadId: id, type: "Quotation reminder",
        dueAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        note: "Auto: follow up on quotation",
        completed: false, createdAt: now(),
      };
      _db.followups.unshift(newFollowup);
    }
    notify("leads", "activity", "followups");
    Promise.all([
      apiPut(`/api/crm/leads/${id}`, { stage, lastActivityAt: now() }),
      newFollowup ? apiPost("/api/crm/followups", newFollowup) : Promise.resolve(),
    ]).then(() =>
      apiPost("/api/crm/activity", { id: actId, leadId: id, type: "stage", message: actMsg, at: actAt }).catch(console.error)
    ).catch(() => {
      lead.stage = prevStage;
      _db.activity = _db.activity.filter((a) => a.id !== actId);
      if (newFollowup) _db.followups = _db.followups.filter((f) => f.id !== newFollowup!.id);
      notify("leads", "activity", "followups");
    });
  },

  addFollowup(input: Omit<Followup, "id" | "createdAt" | "completed">) {
    const followup: Followup = { ...input, id: uid(), completed: false, createdAt: now() };
    _db.followups.unshift(followup);
    const lead = _db.leads.find((l) => l.id === input.leadId);
    if (lead) lead.lastActivityAt = now();
    notify("leads", "followups");
    apiPost("/api/crm/followups", followup).catch(() => {
      _db.followups = _db.followups.filter((f) => f.id !== followup.id);
      notify("followups");
    });
  },

  completeFollowup(id: string) {
    const f = _db.followups.find((x) => x.id === id);
    if (!f) return;
    const prev = { completed: f.completed, completedAt: f.completedAt };
    f.completed = true;
    f.completedAt = now();
    const lead = _db.leads.find((l) => l.id === f.leadId);
    if (lead) lead.lastActivityAt = now();
    notify("leads", "followups");
    apiPut(`/api/crm/followups/${id}`, { completed: true, completedAt: f.completedAt }).catch(() => {
      f.completed = prev.completed;
      f.completedAt = prev.completedAt;
      notify("leads", "followups");
    });
  },

  rescheduleFollowup(id: string, dueAt: string) {
    const f = _db.followups.find((x) => x.id === id);
    if (!f) return;
    const prevDue = f.dueAt;
    f.dueAt = dueAt;
    notify("followups");
    apiPut(`/api/crm/followups/${id}`, { dueAt }).catch(() => {
      f.dueAt = prevDue;
      notify("followups");
    });
  },

  addQuotation(q: Omit<Quotation, "id">) {
    const quotation: Quotation = { ...q, id: uid() };
    _db.quotations.unshift(quotation);
    const lead = _db.leads.find((l) => l.id === q.leadId);
    if (lead) {
      lead.lastActivityAt = now();
      if (lead.stage !== "Closed Won" && lead.stage !== "Closed Lost") lead.stage = "Negotiation";
    }
    const act: ActivityLog = { id: uid(), leadId: q.leadId, type: "quotation", message: `Quotation: ${q.package} — ₹${q.finalPrice.toLocaleString("en-IN")}`, at: now() };
    _db.activity.unshift(act);
    notify("leads", "quotations", "activity");
    apiPost("/api/crm/quotations", quotation)
      .then(() => apiPost("/api/crm/activity", act).catch(console.error))
      .catch(() => {
        _db.quotations = _db.quotations.filter((qt) => qt.id !== quotation.id);
        _db.activity = _db.activity.filter((a) => a.id !== act.id);
        notify("leads", "quotations", "activity");
      });
  },

  updateQuotation(id: string, patch: Partial<Quotation>) {
    const prev = _db.quotations.find((q) => q.id === id);
    if (!prev) return;
    const snap = { ...prev };
    _db.quotations = _db.quotations.map((q) => q.id === id ? { ...q, ...patch } : q);
    const lead = _db.leads.find((l) => l.id === snap.leadId);
    if (lead) lead.lastActivityAt = now();
    notify("leads", "quotations");
    apiPut(`/api/crm/quotations/${id}`, patch).catch(() => {
      _db.quotations = _db.quotations.map((q) => q.id === id ? snap : q);
      notify("leads", "quotations");
    });
  },

  deleteQuotation(id: string) {
    const idx = _db.quotations.findIndex((q) => q.id === id);
    if (idx === -1) return;
    const snap = _db.quotations[idx];
    _db.quotations = _db.quotations.filter((q) => q.id !== id);
    notify("quotations");
    apiDelete(`/api/crm/quotations/${id}`).catch(() => {
      _db.quotations.splice(idx, 0, snap);
      notify("quotations");
    });
  },

  closeLead(c: Omit<Closure, "id">) {
    const closure: Closure = { ...c, id: uid() };
    _db.closures.unshift(closure);
    const stage = c.type === "Won" ? "Closed Won" : "Closed Lost";
    const lead = _db.leads.find((l) => l.id === c.leadId);
    if (lead) { lead.stage = stage; lead.lastActivityAt = now(); }
    const actMsg = c.type === "Won"
      ? `Closed Won${c.finalAmount ? ` — ₹${c.finalAmount.toLocaleString("en-IN")}` : ""}`
      : `Closed Lost — ${c.lostReason ?? ""}`;
    const act: ActivityLog = { id: uid(), leadId: c.leadId, type: "closure", message: actMsg, at: now() };
    _db.activity.unshift(act);
    notify("leads", "closures", "activity");
    apiPost("/api/crm/closures", closure)
      .then(() => apiPost("/api/crm/activity", act).catch(console.error))
      .catch(() => {
        _db.closures = _db.closures.filter((cl) => cl.id !== closure.id);
        _db.activity = _db.activity.filter((a) => a.id !== act.id);
        notify("leads", "closures", "activity");
      });
  },

  updateClosure(id: string, patch: Partial<Closure>) {
    const prev = _db.closures.find((c) => c.id === id);
    if (!prev) return;
    const snap = { ...prev };
    _db.closures = _db.closures.map((c) => c.id === id ? { ...c, ...patch } : c);
    const lead = _db.leads.find((l) => l.id === snap.leadId);
    if (lead) lead.lastActivityAt = now();
    notify("leads", "closures");
    apiPut(`/api/crm/closures/${id}`, patch).catch(() => {
      // Restore the pre-edit closure so a failed save doesn't leave a wrong value on screen
      _db.closures = _db.closures.map((c) => c.id === id ? snap : c);
      notify("leads", "closures");
    });
  },

  deleteClosure(id: string) {
    const idx = _db.closures.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const snap = _db.closures[idx];
    _db.closures = _db.closures.filter((c) => c.id !== id);

    // If the lead has no closures left, move it back to Negotiation so it
    // returns to the active pipeline instead of staying in a Closed column.
    const lead = _db.leads.find((l) => l.id === snap.leadId);
    const stillClosed = _db.closures.some((c) => c.leadId === snap.leadId);
    const prevStage = lead?.stage;
    const revert = !!lead && !stillClosed && (lead.stage === "Closed Won" || lead.stage === "Closed Lost");
    if (revert && lead) {
      lead.stage = "Negotiation";
      lead.lastActivityAt = now();
    }
    notify("closures", "leads");

    apiDelete(`/api/crm/closures/${id}`).catch(() => {
      _db.closures.splice(idx, 0, snap);
      if (revert && lead && prevStage) lead.stage = prevStage;
      notify("closures", "leads");
    });
    if (revert && lead) {
      apiPut(`/api/crm/leads/${snap.leadId}`, { stage: "Negotiation", lastActivityAt: now() }).catch(console.error);
    }
  },

  importLeads(rows: Lead[]) {
    const ts = Date.now();
    rows.forEach((r, i) => { if (!r.id) r.id = `IMP-${ts}-${i}`; });
    _db.leads.unshift(...rows);
    notify("leads");
    apiPost("/api/crm/leads/bulk", rows).catch(() => {
      const ids = new Set(rows.map((r) => r.id));
      _db.leads = _db.leads.filter((l) => !ids.has(l.id));
      notify("leads");
    });
  },

  resetSeed() {
    // No-op — seed data is dev-only; in production data comes from Supabase
  },
};

export function refreshStore() {
  _initialized = false;
  _fetching = false;
  syncAll();
}

// ─── React hooks ──────────────────────────────────────────────────────────────

// Full-store hook — subscribes to all slices. Use only when you need multiple
// slices in the same component. Prefer the targeted slice hooks below.
export function useDB() {
  const [db, setDb] = useState<CRMDb>(_db);
  useEffect(() => {
    const cb = () => setDb({ ..._db });
    sliceListeners._all.add(cb);
    if (!_initialized && !_fetching) syncAll();
    return () => { sliceListeners._all.delete(cb); };
  }, []);
  return db;
}

// Targeted slice hooks — only re-render when their specific slice changes.
export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>(_db.leads);
  useEffect(() => {
    const cb = () => setLeads([..._db.leads]);
    sliceListeners.leads.add(cb);
    if (!_initialized && !_fetching) syncAll();
    return () => { sliceListeners.leads.delete(cb); };
  }, []);
  return leads;
}

export function useFollowups() {
  const [followups, setFollowups] = useState<Followup[]>(_db.followups);
  useEffect(() => {
    const cb = () => setFollowups([..._db.followups]);
    sliceListeners.followups.add(cb);
    if (!_initialized && !_fetching) syncAll();
    return () => { sliceListeners.followups.delete(cb); };
  }, []);
  return followups;
}

export function useQuotations() {
  const [quotations, setQuotations] = useState<Quotation[]>(_db.quotations);
  useEffect(() => {
    const cb = () => setQuotations([..._db.quotations]);
    sliceListeners.quotations.add(cb);
    if (!_initialized && !_fetching) syncAll();
    return () => { sliceListeners.quotations.delete(cb); };
  }, []);
  return quotations;
}

export function useClosures() {
  const [closures, setClosures] = useState<Closure[]>(_db.closures);
  useEffect(() => {
    const cb = () => setClosures([..._db.closures]);
    sliceListeners.closures.add(cb);
    if (!_initialized && !_fetching) syncAll();
    return () => { sliceListeners.closures.delete(cb); };
  }, []);
  return closures;
}

export function useActivity() {
  const [activity, setActivity] = useState<ActivityLog[]>(_db.activity);
  useEffect(() => {
    const cb = () => setActivity([..._db.activity]);
    sliceListeners.activity.add(cb);
    if (!_initialized && !_fetching) syncAll();
    return () => { sliceListeners.activity.delete(cb); };
  }, []);
  return activity;
}

export function useDBReady() {
  const [ready, setReady] = useState(_initialized);
  useEffect(() => {
    if (_initialized) { setReady(true); return; }
    const cb = () => {
      if (_initialized) {
        setReady(true);
      } else if (!_fetching) {
        syncAll();
      }
    };
    sliceListeners._all.add(cb);
    if (!_fetching) syncAll();
    return () => { sliceListeners._all.delete(cb); };
  }, []);
  return ready;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function isOverdue(dueAt: string) {
  return new Date(dueAt) < new Date();
}

export function isToday(dt: string) {
  const d = new Date(dt);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate();
}

export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function isStale(lead: Lead) {
  const closed: LeadStage[] = ["Closed Won", "Closed Lost", "Invalid Lead"];
  if (closed.includes(lead.stage)) return false;
  return daysSince(lead.lastActivityAt) >= 3;
}

export function isUrgentNew(lead: Lead) {
  if (lead.stage !== "New Lead") return false;
  return (Date.now() - new Date(lead.createdAt).getTime()) > 15 * 60 * 1000;
}
