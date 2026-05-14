"use client";
import type { Lead, Followup, Quotation, Closure, ActivityLog, CRMDb, LeadStage } from "./crm-types";
import { useState, useEffect } from "react";

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ─── Global in-memory state ───────────────────────────────────────────────────
let _db: CRMDb = { leads: [], followups: [], quotations: [], closures: [], activity: [] };
let _initialized = false;
let _fetching = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

async function syncAll() {
  if (_fetching) return;
  _fetching = true;
  try {
    const res = await fetch("/api/crm/data");
    if (res.ok) {
      _db = await res.json();
      _initialized = true;
    } else if (res.status === 401) {
      if (!window.location.pathname.startsWith("/crm/login")) {
        window.location.href = "/crm/login";
      }
      return;
    } else {
      _initialized = true; // show empty CRM rather than infinite spinner
    }
  } catch {
    _initialized = true; // network failure — show empty state
  } finally {
    _fetching = false;
    notify();
  }
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
    _db.leads.unshift(lead);
    _db.activity.unshift({ id: uid(), leadId: id, type: "created", message: `Lead created from ${input.source}`, at: now() });
    notify();
    apiPost("/api/crm/leads", lead).catch(() => {
      _db.leads = _db.leads.filter((l) => l.id !== id);
      notify();
    });
  },

  updateLead(id: string, patch: Partial<Lead>) {
    const lead = _db.leads.find((l) => l.id === id);
    if (!lead) return;
    const prev = { ...lead };
    Object.assign(lead, patch, { lastActivityAt: now() });
    notify();
    apiPut(`/api/crm/leads/${id}`, patch).catch(() => {
      Object.assign(lead, prev);
      notify();
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
    notify();
    apiDelete(`/api/crm/leads/${id}`).catch(() => {
      Object.assign(_db, snap);
      notify();
    });
  },

  moveStage(id: string, stage: LeadStage) {
    const lead = _db.leads.find((l) => l.id === id);
    if (!lead) return;
    const prevStage = lead.stage;
    lead.stage = stage;
    lead.lastActivityAt = now();
    const actId = uid();
    _db.activity.unshift({ id: actId, leadId: id, type: "stage", message: `Stage changed to "${stage}"`, at: now() });
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
    notify();
    Promise.all([
      apiPut(`/api/crm/leads/${id}`, { stage, lastActivityAt: now() }),
      newFollowup ? apiPost("/api/crm/followups", newFollowup) : Promise.resolve(),
    ]).catch(() => {
      lead.stage = prevStage;
      _db.activity = _db.activity.filter((a) => a.id !== actId);
      if (newFollowup) _db.followups = _db.followups.filter((f) => f.id !== newFollowup!.id);
      notify();
    });
  },

  addFollowup(input: Omit<Followup, "id" | "createdAt" | "completed">) {
    const followup: Followup = { ...input, id: uid(), completed: false, createdAt: now() };
    _db.followups.unshift(followup);
    const lead = _db.leads.find((l) => l.id === input.leadId);
    if (lead) lead.lastActivityAt = now();
    notify();
    apiPost("/api/crm/followups", followup).catch(() => {
      _db.followups = _db.followups.filter((f) => f.id !== followup.id);
      notify();
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
    notify();
    apiPut(`/api/crm/followups/${id}`, { completed: true, completedAt: f.completedAt }).catch(() => {
      f.completed = prev.completed;
      f.completedAt = prev.completedAt;
      notify();
    });
  },

  rescheduleFollowup(id: string, dueAt: string) {
    const f = _db.followups.find((x) => x.id === id);
    if (!f) return;
    const prevDue = f.dueAt;
    f.dueAt = dueAt;
    notify();
    apiPut(`/api/crm/followups/${id}`, { dueAt }).catch(() => {
      f.dueAt = prevDue;
      notify();
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
    notify();
    apiPost("/api/crm/quotations", quotation).catch(() => {
      _db.quotations = _db.quotations.filter((qt) => qt.id !== quotation.id);
      notify();
    });
  },

  closeLead(c: Omit<Closure, "id">) {
    const closure: Closure = { ...c, id: uid() };
    _db.closures.unshift(closure);
    const stage = c.type === "Won" ? "Closed Won" : "Closed Lost";
    const lead = _db.leads.find((l) => l.id === c.leadId);
    if (lead) { lead.stage = stage; lead.lastActivityAt = now(); }
    notify();
    apiPost("/api/crm/closures", closure).catch(() => {
      _db.closures = _db.closures.filter((cl) => cl.id !== closure.id);
      notify();
    });
  },

  importLeads(rows: Lead[]) {
    const ts = Date.now();
    rows.forEach((r, i) => { if (!r.id) r.id = `IMP-${ts}-${i}`; });
    _db.leads.unshift(...rows);
    notify();
    apiPost("/api/crm/leads/bulk", rows).catch(() => {
      const ids = new Set(rows.map((r) => r.id));
      _db.leads = _db.leads.filter((l) => !ids.has(l.id));
      notify();
    });
  },

  resetSeed() {
    // No-op — seed data is dev-only; in production data comes from Supabase
  },
};

// ─── React hook ───────────────────────────────────────────────────────────────
export function useDB() {
  const [db, setDb] = useState<CRMDb>(_db);

  useEffect(() => {
    const cb = () => setDb({ ..._db });
    listeners.add(cb);
    if (!_initialized && !_fetching) syncAll();
    return () => { listeners.delete(cb); };
  }, []);

  return db;
}

export function useDBReady() {
  const [ready, setReady] = useState(_initialized);
  useEffect(() => {
    if (_initialized) { setReady(true); return; }
    const cb = () => {
      if (_initialized) {
        setReady(true);
      } else if (!_fetching) {
        // Previous fetch finished (e.g. 401 on login page) but we're now
        // authenticated — retry immediately.
        syncAll();
      }
    };
    listeners.add(cb);
    if (!_fetching) syncAll();
    return () => { listeners.delete(cb); };
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
