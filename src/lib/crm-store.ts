"use client";
import type { Lead, Followup, Quotation, Closure, ActivityLog, CRMDb, LeadStage } from "./crm-types";

const STORAGE_KEY = "cradlewell-crm-v2";

const uid = () => Math.random().toString(36).slice(2, 10);
const leadCode = (i: number) => `CW-${1000 + i}`;
const now = () => new Date().toISOString();

// ─── Seed Data ────────────────────────────────────────────────────────────────
function buildSeed(): CRMDb {
  const today = new Date();
  const d = (daysAgo: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - daysAgo);
    return dt.toISOString();
  };

  const leads: Lead[] = [
    {
      id: leadCode(0), name: "Priya Sharma", phone: "9876543210", whatsapp: "9876543210",
      source: "Instagram", leadDate: d(0), serviceRequired: "Newborn Care",
      babyStatus: "Born", hospitalName: "Manipal Hospital", babyAge: "5 days",
      currentWeight: "3.1 kg", area: "Koramangala", city: "Bengaluru",
      preferredShift: "Day (12h)", budget: 35000, owner: "Ravi",
      stage: "New Lead", temperature: "Hot", closureProbability: 80,
      lastActivityAt: d(0), createdAt: d(0),
      notes: "Wants experienced nurse, C-section delivery",
    },
    {
      id: leadCode(1), name: "Anita Desai", phone: "9845012345", whatsapp: "9845012345",
      source: "Google Ads", leadDate: d(1), serviceRequired: "Nurse Care",
      babyStatus: "Expecting", hospitalName: "Fortis Hospital", babyAgeOrMonth: "8 months",
      area: "Indiranagar", city: "Bengaluru", preferredShift: "Night (12h)",
      budget: 28000, owner: "Sneha", stage: "Contacted", temperature: "Warm",
      closureProbability: 60, lastActivityAt: d(1), createdAt: d(1),
    },
    {
      id: leadCode(2), name: "Meera Nair", phone: "9900112233", whatsapp: "9900112233",
      source: "Referral", leadDate: d(2), serviceRequired: "Moba Care",
      babyStatus: "Born", hospitalName: "Narayana Health", babyAge: "12 days",
      currentWeight: "2.8 kg", area: "HSR Layout", city: "Bengaluru",
      preferredShift: "Full Day (24h)", budget: 55000, owner: "Ravi",
      stage: "Negotiation", temperature: "Hot", closureProbability: 90,
      lastActivityAt: d(0), createdAt: d(3),
      notes: "Pre-term baby, NICU discharged",
    },
    {
      id: leadCode(3), name: "Sunita Patel", phone: "9812345678", whatsapp: "9812345678",
      source: "Facebook", leadDate: d(4), serviceRequired: "Newborn Care",
      babyStatus: "Born", hospitalName: "BGS Global", babyAge: "3 weeks",
      area: "Whitefield", city: "Bengaluru", preferredShift: "Day (12h)",
      budget: 30000, owner: "Pooja", stage: "Follow-up", temperature: "Warm",
      closureProbability: 50, lastActivityAt: d(1), createdAt: d(4),
    },
    {
      id: leadCode(4), name: "Kavita Reddy", phone: "9700123456", whatsapp: "9700123456",
      source: "Website", leadDate: d(5), serviceRequired: "Nurse Care",
      babyStatus: "Expecting", babyAgeOrMonth: "7 months",
      area: "Electronic City", city: "Bengaluru", preferredShift: "Day (12h)",
      budget: 25000, owner: "Sneha", stage: "Not Responding", temperature: "Cold",
      lastActivityAt: d(3), createdAt: d(5),
    },
    {
      id: leadCode(5), name: "Deepa Krishnan", phone: "9988776655", whatsapp: "9988776655",
      source: "Hospital Partner", leadDate: d(6), serviceRequired: "Moba Care",
      babyStatus: "Born", hospitalName: "St. John's Hospital", babyAge: "2 days",
      currentWeight: "3.4 kg", area: "Jayanagar", city: "Bengaluru",
      preferredShift: "Full Day (24h)", budget: 60000, owner: "Ravi",
      stage: "Closed Won", temperature: "Hot", closureProbability: 100,
      lastActivityAt: d(1), createdAt: d(6),
    },
    {
      id: leadCode(6), name: "Radha Iyer", phone: "9123456780", whatsapp: "9123456780",
      source: "Walk-in", leadDate: d(7), serviceRequired: "Newborn Care",
      babyStatus: "Born", babyAge: "1 week", area: "Marathahalli",
      city: "Bengaluru", preferredShift: "Night (12h)", budget: 20000,
      owner: "Pooja", stage: "Closed Lost", temperature: "Cold",
      lastActivityAt: d(2), createdAt: d(7),
    },
    {
      id: leadCode(7), name: "Lakshmi Venkat", phone: "9090909090", whatsapp: "9090909090",
      source: "Instagram", leadDate: d(3), serviceRequired: "Nurse Care",
      babyStatus: "Expecting", babyAgeOrMonth: "9 months",
      area: "BTM Layout", city: "Bengaluru", preferredShift: "Day (12h)",
      budget: 32000, owner: "Sneha", stage: "Due date soon", temperature: "Hot",
      closureProbability: 75, lastActivityAt: d(0), createdAt: d(3),
      notes: "Due in 2 weeks",
    },
    {
      id: leadCode(8), name: "Nandini Rao", phone: "9555444333", whatsapp: "9555444333",
      source: "Google Ads", leadDate: d(8), serviceRequired: "Newborn Care",
      babyStatus: "Born", babyAge: "10 days", currentWeight: "3.0 kg",
      area: "Banashankari", city: "Bengaluru", preferredShift: "Day (12h)",
      budget: 27000, owner: "Ravi", stage: "Nurse Required", temperature: "Warm",
      closureProbability: 55, lastActivityAt: d(2), createdAt: d(8),
    },
    {
      id: leadCode(9), name: "Poornima Shetty", phone: "9666777888", whatsapp: "9666777888",
      source: "Referral", leadDate: d(2), serviceRequired: "Moba Care",
      babyStatus: "Born", babyAge: "4 days", currentWeight: "2.6 kg",
      hospitalName: "Apollo Hospital", area: "Hebbal", city: "Bengaluru",
      preferredShift: "Full Day (24h)", budget: 50000, owner: "Pooja",
      stage: "Moba Required", temperature: "Warm", closureProbability: 65,
      lastActivityAt: d(1), createdAt: d(2),
    },
    {
      id: leadCode(10), name: "Usha Bhat", phone: "9333222111", whatsapp: "9333222111",
      source: "Facebook", leadDate: d(10), serviceRequired: "Newborn Care",
      babyStatus: "Born", babyAge: "6 days", area: "Rajajinagar",
      city: "Bengaluru", preferredShift: "Night (12h)", budget: 22000,
      owner: "Sneha", stage: "Invalid Lead", temperature: "Cold",
      lastActivityAt: d(5), createdAt: d(10),
    },
    {
      id: leadCode(11), name: "Geetha Murthy", phone: "9444555666", whatsapp: "9444555666",
      source: "Website", leadDate: d(1), serviceRequired: "Nurse Care",
      babyStatus: "Expecting", babyAgeOrMonth: "8.5 months",
      area: "Vijayanagar", city: "Bengaluru", preferredShift: "Day (12h)",
      budget: 26000, owner: "Ravi", stage: "Contacted", temperature: "Warm",
      closureProbability: 45, lastActivityAt: d(0), createdAt: d(1),
    },
    {
      id: leadCode(12), name: "Savitha Rao", phone: "9777888999", whatsapp: "9777888999",
      source: "Hospital Partner", leadDate: d(3), serviceRequired: "Newborn Care",
      babyStatus: "Born", hospitalName: "Cloudnine Hospital", babyAge: "8 days",
      currentWeight: "3.2 kg", area: "Sarjapur", city: "Bengaluru",
      preferredShift: "Day (12h)", budget: 40000, owner: "Pooja",
      stage: "Negotiation", temperature: "Hot", closureProbability: 85,
      lastActivityAt: d(0), createdAt: d(3),
    },
    {
      id: leadCode(13), name: "Bharati Singh", phone: "9111222333", whatsapp: "9111222333",
      source: "Google Ads", leadDate: d(0), serviceRequired: "Moba Care",
      babyStatus: "Born", babyAge: "1 day", currentWeight: "3.6 kg",
      hospitalName: "Rainbow Hospital", area: "Yelahanka", city: "Bengaluru",
      preferredShift: "Full Day (24h)", budget: 65000, owner: "Sneha",
      stage: "New Lead", temperature: "Hot", closureProbability: 70,
      lastActivityAt: d(0), createdAt: d(0),
      notes: "Normal delivery, needs immediate care",
    },
  ];

  const followups: Followup[] = [
    {
      id: uid(), leadId: leadCode(0), type: "First call",
      dueAt: new Date().toISOString(), note: "Discuss shift timing and nurse profile",
      completed: false, createdAt: d(0),
    },
    {
      id: uid(), leadId: leadCode(1), type: "Call back",
      dueAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      note: "She asked to call after 5 PM", completed: false, createdAt: d(1),
    },
    {
      id: uid(), leadId: leadCode(2), type: "Quotation reminder",
      dueAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      note: "Send revised quotation for 30 days package", completed: false, createdAt: d(0),
    },
    {
      id: uid(), leadId: leadCode(3), type: "Closure follow-up",
      dueAt: d(-1), note: "Final decision pending", completed: false, createdAt: d(2),
    },
    {
      id: uid(), leadId: leadCode(7), type: "Trial decision",
      dueAt: d(-2), note: "Overdue — check if still interested", completed: false, createdAt: d(3),
    },
    {
      id: uid(), leadId: leadCode(12), type: "Payment reminder",
      dueAt: new Date(Date.now() + 3 * 86400 * 1000).toISOString(),
      note: "Advance payment due", completed: false, createdAt: d(1),
    },
    {
      id: uid(), leadId: leadCode(8), type: "Call back",
      dueAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      note: "Check nurse availability confirmation", completed: false, createdAt: d(2),
    },
    {
      id: uid(), leadId: leadCode(5), type: "Payment reminder",
      dueAt: d(1), note: "Balance payment collection",
      completed: true, completedAt: d(0), createdAt: d(3),
    },
  ];

  const quotations: Quotation[] = [
    {
      id: uid(), leadId: leadCode(2), package: "Premium 30 days",
      shiftHours: "24h", quotedPrice: 55000, discount: 2000,
      finalPrice: 53000, date: d(1), notes: "NICU baby, includes extra support",
    },
    {
      id: uid(), leadId: leadCode(12), package: "Standard 30 days",
      shiftHours: "12h", quotedPrice: 42000, discount: 2000,
      finalPrice: 40000, date: d(2), notes: "Day shift only",
    },
    {
      id: uid(), leadId: leadCode(5), package: "Premium 45 days",
      shiftHours: "24h", quotedPrice: 72000, discount: 5000,
      finalPrice: 67000, date: d(5), notes: "Long-term care package",
    },
  ];

  const closures: Closure[] = [
    {
      id: uid(), leadId: leadCode(5), type: "Won",
      finalPackage: "Premium 45 days", finalAmount: 67000,
      advanceReceived: 20000, paymentStatus: "Partial",
      closureDate: d(1), salesOwner: "Ravi",
    },
    {
      id: uid(), leadId: leadCode(6), type: "Lost",
      closureDate: d(2), lostReason: "Competitor selected",
      competitorName: "NurtureNest", notes: "Price was higher than competitor",
    },
  ];

  const activity: ActivityLog[] = leads.map((l) => ({
    id: uid(), leadId: l.id, type: "created",
    message: `Lead created from ${l.source}`, at: l.createdAt,
  }));

  return { leads, followups, quotations, closures, activity };
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
function loadDb(): CRMDb {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as CRMDb;
  } catch {
    return buildSeed();
  }
}

function saveDb(db: CRMDb) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// ─── Singleton ────────────────────────────────────────────────────────────────
let _db: CRMDb | null = null;
const listeners = new Set<() => void>();

function getDb(): CRMDb {
  if (!_db) _db = loadDb();
  return _db;
}

function mutate(fn: (db: CRMDb) => void) {
  const db = getDb();
  fn(db);
  saveDb(db);
  listeners.forEach((cb) => cb());
}

function logActivity(leadId: string, type: ActivityLog["type"], message: string) {
  getDb().activity.push({ id: uid(), leadId, type, message, at: now() });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export const api = {
  resetSeed() {
    _db = buildSeed();
    saveDb(_db);
    listeners.forEach((cb) => cb());
  },

  addLead(input: Omit<Lead, "id" | "createdAt" | "lastActivityAt" | "stage" | "temperature">) {
    mutate((db) => {
      const id = leadCode(db.leads.length);
      const lead: Lead = {
        ...input,
        id,
        stage: "New Lead",
        temperature: "Cold",
        createdAt: now(),
        lastActivityAt: now(),
      };
      db.leads.push(lead);
      logActivity(id, "created", `Lead created from ${input.source}`);
    });
  },

  updateLead(id: string, patch: Partial<Lead>) {
    mutate((db) => {
      const lead = db.leads.find((l) => l.id === id);
      if (!lead) return;
      Object.assign(lead, patch, { lastActivityAt: now() });
      logActivity(id, "note", "Lead details updated");
    });
  },

  deleteLead(id: string) {
    mutate((db) => {
      db.leads = db.leads.filter((l) => l.id !== id);
      db.followups = db.followups.filter((f) => f.leadId !== id);
      db.quotations = db.quotations.filter((q) => q.leadId !== id);
      db.closures = db.closures.filter((c) => c.leadId !== id);
      db.activity = db.activity.filter((a) => a.leadId !== id);
    });
  },

  moveStage(id: string, stage: LeadStage) {
    mutate((db) => {
      const lead = db.leads.find((l) => l.id === id);
      if (!lead) return;
      lead.stage = stage;
      lead.lastActivityAt = now();
      logActivity(id, "stage", `Stage changed to "${stage}"`);
      if (stage === "Negotiation") {
        const tomorrow = new Date(Date.now() + 86400 * 1000).toISOString();
        db.followups.push({
          id: uid(), leadId: id, type: "Quotation reminder",
          dueAt: tomorrow, note: "Auto: follow up on quotation",
          completed: false, createdAt: now(),
        });
      }
    });
  },

  addFollowup(input: Omit<Followup, "id" | "createdAt" | "completed">) {
    mutate((db) => {
      db.followups.push({ ...input, id: uid(), completed: false, createdAt: now() });
      const lead = db.leads.find((l) => l.id === input.leadId);
      if (lead) lead.lastActivityAt = now();
      logActivity(input.leadId, "followup", `Follow-up scheduled: ${input.type}`);
    });
  },

  completeFollowup(id: string) {
    mutate((db) => {
      const f = db.followups.find((x) => x.id === id);
      if (!f) return;
      f.completed = true;
      f.completedAt = now();
      const lead = db.leads.find((l) => l.id === f.leadId);
      if (lead) lead.lastActivityAt = now();
      logActivity(f.leadId, "followup", `Follow-up completed: ${f.type}`);
    });
  },

  rescheduleFollowup(id: string, dueAt: string) {
    mutate((db) => {
      const f = db.followups.find((x) => x.id === id);
      if (!f) return;
      f.dueAt = dueAt;
    });
  },

  addQuotation(q: Omit<Quotation, "id">) {
    mutate((db) => {
      db.quotations.push({ ...q, id: uid() });
      const lead = db.leads.find((l) => l.id === q.leadId);
      if (lead) {
        lead.lastActivityAt = now();
        if (lead.stage !== "Closed Won" && lead.stage !== "Closed Lost") {
          lead.stage = "Negotiation";
        }
      }
      logActivity(q.leadId, "quotation", `Quotation added: ₹${q.finalPrice}`);
    });
  },

  closeLead(c: Omit<Closure, "id">) {
    mutate((db) => {
      db.closures.push({ ...c, id: uid() });
      const stage = c.type === "Won" ? "Closed Won" : "Closed Lost";
      const lead = db.leads.find((l) => l.id === c.leadId);
      if (lead) {
        lead.stage = stage;
        lead.lastActivityAt = now();
      }
      logActivity(c.leadId, "closure", `Lead ${c.type === "Won" ? "closed won" : "closed lost"}`);
    });
  },

  importLeads(rows: Lead[]) {
    mutate((db) => {
      const ts = Date.now();
      rows.forEach((r, i) => {
        if (!r.id) r.id = `IMP-${ts}-${i}`;
        db.leads.push(r);
      });
    });
  },
};

// ─── React hook ───────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";

export function useDB() {
  const [db, setDb] = useState<CRMDb>(() => {
    if (typeof window === "undefined") return buildSeed();
    return getDb();
  });

  useEffect(() => {
    const cb = () => setDb({ ...getDb() });
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  return db;
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
