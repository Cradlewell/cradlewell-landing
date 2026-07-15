"use client";
import React, { useState, useEffect } from "react";
import { X, Phone, MessageCircle, Edit2, Save, Trash2, Plus, Check, Clock, ChevronDown } from "lucide-react";
import { api, useDB, isOverdue, isToday } from "@/lib/crm-store";
import type { Lead, LeadStage, FollowupType, LostReason, Closure } from "@/lib/crm-types";
import { LEAD_STAGES } from "@/lib/crm-types";
import StageBadge from "./StageBadge";
import { toast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm-dialog";
import { Avatar } from "@/components/ui/avatar";
import { format } from "date-fns";

const FOLLOWUP_TYPES: FollowupType[] = ["Callback + WhatsApp", "Quotation reminder", "Payment reminder", "Trial decision", "Closure follow-up"];
const LOST_REASONS: LostReason[] = ["Competitor selected", "Budget issue", "No response", "Trust issue", "Service not available", "Other"];

// ── Notes ───────────────────────────────────────────────────────────────────
// Notes are persisted as a JSON array inside the lead's `callNotes` field, so no
// separate table is needed. A legacy plain-text note (from before this format)
// is surfaced as the first, un-deletable entry so nothing is lost.
interface LeadNote { id: string; text: string; at: string; }

function parseNotes(raw?: string): LeadNote[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((n) => n && typeof n.text === "string")
        .map((n, i) => ({ id: typeof n.id === "string" ? n.id : `n${i}`, text: n.text, at: typeof n.at === "string" ? n.at : "" }));
    }
  } catch { /* not JSON — treat the whole string as one legacy note */ }
  return [{ id: "legacy", text: raw, at: "" }];
}

function fmtNoteDt(iso: string): string {
  if (!iso) return "";
  try { return format(new Date(iso), "dd MMM yyyy, hh:mm a"); } catch { return ""; }
}

interface Props { leadId: string | null; onClose: () => void; }
type Tab = "profile" | "followups" | "quotations" | "closure" | "activity";

interface FieldProps {
  label: string;
  value?: string | number;
  field: keyof Lead;
  type?: string;
  editing: boolean;
  draft: Partial<Lead>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
}

function Field({ label, value, field, type = "text", editing, draft, setDraft }: FieldProps) {
  return (
    <div>
      <div className="crm-field-label">{label}</div>
      {editing ? (
        <input className="crm-input" type={type} value={(draft[field] as string) ?? ""} onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))} style={{ fontSize: "0.85rem" }} />
      ) : (
        <div className={`crm-field-value ${value ? "" : "empty"}`}>{value || "—"}</div>
      )}
    </div>
  );
}

// ── Closure card ──────────────────────────────────────────────────────────────
// One card per closure. A lead can be closed multiple times (repeat bookings,
// renewals, split payments), so each closure renders independently with its own
// edit state. Saving writes through api.updateClosure, which updates the shared
// store — so the dashboard revenue and Closures page reflect the change live.
const PAYMENT_STYLE: Record<string, { bg: string; color: string }> = {
  Paid: { bg: "#F0FDF4", color: "#16A34A" },
  Partial: { bg: "#FFFBEB", color: "#B45309" },
  Pending: { bg: "#FEF2F2", color: "#DC2626" },
};

// A closure's date is edited as a plain calendar day. Anchor it to local noon so
// the stored UTC instant maps back to the same day in any reasonable timezone —
// both the dashboard month/year filter and the card display read it locally.
const dayToIso = (day: string) => new Date(`${day}T12:00:00`).toISOString();
const isoToDay = (iso: string) => format(new Date(iso), "yyyy-MM-dd");

function ClosureCard({ closure }: { closure: Closure }) {
  const [editing, setEditing] = useState(false);
  const [pkg, setPkg] = useState("");
  const [amount, setAmount] = useState("");
  const [advance, setAdvance] = useState("");
  const [payStatus, setPayStatus] = useState<"Pending" | "Partial" | "Paid">("Pending");
  const [lostReason, setLostReason] = useState<LostReason>("Competitor selected");
  const [competitor, setCompetitor] = useState("");
  const [notes, setNotes] = useState("");
  const [dateStr, setDateStr] = useState("");

  const startEdit = () => {
    setPkg(closure.finalPackage ?? "");
    setAmount(String(closure.finalAmount ?? ""));
    setAdvance(String(closure.advanceReceived ?? ""));
    setPayStatus((closure.paymentStatus as "Pending" | "Partial" | "Paid") ?? "Pending");
    setLostReason((closure.lostReason as LostReason) ?? "Competitor selected");
    setCompetitor(closure.competitorName ?? "");
    setNotes(closure.notes ?? "");
    setDateStr(isoToDay(closure.closureDate));
    setEditing(true);
  };

  const save = () => {
    const closureDate = dateStr ? dayToIso(dateStr) : closure.closureDate;
    if (closure.type === "Won") {
      api.updateClosure(closure.id, {
        finalPackage: pkg,
        finalAmount: Number(amount) || undefined,
        advanceReceived: Number(advance) || undefined,
        paymentStatus: payStatus,
        closureDate,
      });
    } else {
      api.updateClosure(closure.id, { lostReason, competitorName: competitor, notes, closureDate });
    }
    setEditing(false);
    toast.success("Closure updated");
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Delete this closure?",
      body: "This closure record will be permanently removed and revenue totals will update.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (ok) { api.deleteClosure(closure.id); toast.success("Closure removed"); }
  };

  return (
    <div className="crm-card p-4">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="crm-badge" style={closure.type === "Won" ? { background: "#F0FDF4", color: "#16A34A", fontSize: "0.85rem" } : { background: "#FEF2F2", color: "#DC2626", fontSize: "0.85rem" }}>
            {closure.type === "Won" ? "🏆 Closed Won" : "✗ Closed Lost"}
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)" }}>{format(new Date(closure.closureDate), "dd MMM yyyy")}</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => (editing ? setEditing(false) : startEdit())}>
            {editing ? <><X size={13} /> Cancel</> : <><Edit2 size={13} /> Edit</>}
          </button>
          {!editing && (
            <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={remove} style={{ color: "#DC2626" }} title="Delete closure">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        closure.type === "Won" ? (
          <div className="crm-grid-2">
            <div className="crm-form-group">
              <label className="crm-label">Package</label>
              <input className="crm-input" value={pkg} onChange={e => setPkg(e.target.value)} />
            </div>
            <div className="crm-form-group">
              <label className="crm-label">Final Amount (₹)</label>
              <input className="crm-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="crm-form-group">
              <label className="crm-label">Advance Received (₹)</label>
              <input className="crm-input" type="number" value={advance} onChange={e => setAdvance(e.target.value)} />
            </div>
            <div className="crm-form-group">
              <label className="crm-label">Payment Status</label>
              <select className="crm-select" value={payStatus} onChange={e => setPayStatus(e.target.value as "Pending" | "Partial" | "Paid")}>
                <option>Pending</option><option>Partial</option><option>Paid</option>
              </select>
            </div>
            <div className="crm-form-group">
              <label className="crm-label">Closure Date</label>
              <input className="crm-input" type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={save}><Save size={13} /> Save Changes</button>
            </div>
          </div>
        ) : (
          <div className="crm-grid-2">
            <div className="crm-form-group">
              <label className="crm-label">Lost Reason</label>
              <select className="crm-select" value={lostReason} onChange={e => setLostReason(e.target.value as LostReason)}>
                {LOST_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="crm-form-group">
              <label className="crm-label">Competitor Name</label>
              <input className="crm-input" value={competitor} onChange={e => setCompetitor(e.target.value)} />
            </div>
            <div className="crm-form-group">
              <label className="crm-label">Closure Date</label>
              <input className="crm-input" type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} />
            </div>
            <div className="crm-form-group" style={{ gridColumn: "1/-1" }}>
              <label className="crm-label">Notes</label>
              <textarea className="crm-textarea" value={notes} onChange={e => setNotes(e.target.value)} style={{ minHeight: 64 }} />
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={save}><Save size={13} /> Save Changes</button>
            </div>
          </div>
        )
      ) : (
        <>
          {closure.type === "Won" && (
            <div className="crm-grid-2">
              <div><div className="crm-section-title mb-1">Package</div><div style={{ fontSize: "0.875rem" }}>{closure.finalPackage || "—"}</div></div>
              <div><div className="crm-section-title mb-1">Final Amount</div><div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--crm-primary)" }}>{closure.finalAmount ? `₹${closure.finalAmount.toLocaleString("en-IN")}` : "—"}</div></div>
              <div><div className="crm-section-title mb-1">Advance</div><div style={{ fontSize: "0.875rem" }}>{closure.advanceReceived ? `₹${closure.advanceReceived.toLocaleString("en-IN")}` : "—"}</div></div>
              <div><div className="crm-section-title mb-1">Payment</div>
                <span className="crm-badge" style={PAYMENT_STYLE[closure.paymentStatus ?? "Pending"] ?? {}}>
                  {closure.paymentStatus}
                </span>
              </div>
            </div>
          )}
          {closure.type === "Lost" && (
            <div className="crm-grid-2">
              <div><div className="crm-section-title mb-1">Reason</div><div style={{ fontSize: "0.875rem" }}>{closure.lostReason || "—"}</div></div>
              <div><div className="crm-section-title mb-1">Competitor</div><div style={{ fontSize: "0.875rem" }}>{closure.competitorName || "—"}</div></div>
              {closure.notes && <div style={{ gridColumn: "1/-1" }}><div className="crm-section-title mb-1">Notes</div><div style={{ fontSize: "0.875rem" }}>{closure.notes}</div></div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LeadDrawer({ leadId, onClose }: Props) {
  const db = useDB();
  const lead = leadId ? db.leads.find(l => l.id === leadId) ?? null : null;
  const [tab, setTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Lead>>({});

  const [fuType, setFuType] = useState<FollowupType>("Callback + WhatsApp");
  const [fuDue, setFuDue] = useState("");
  const [fuNote, setFuNote] = useState("");

  const [noteDraft, setNoteDraft] = useState("");
  const [notesSort, setNotesSort] = useState<"recent-last" | "recent-first">("recent-last");
  const [hoverNote, setHoverNote] = useState<string | null>(null);

  const [qPkg, setQPkg] = useState("Standard 30 days");
  const [qHours, setQHours] = useState("12h");
  const [qPrice, setQPrice] = useState("");
  const [qDiscount, setQDiscount] = useState("0");
  const [qNotes, setQNotes] = useState("");

  const [closureType, setClosureType] = useState<"Won" | "Lost">("Won");
  const [cPkg, setCPkg] = useState("");
  const [cAmount, setCAmount] = useState("");
  const [cAdvance, setCAdvance] = useState("");
  const [cPayStatus, setCPayStatus] = useState<"Pending"|"Partial"|"Paid">("Pending");
  const [cLostReason, setCLostReason] = useState<LostReason>("Competitor selected");
  const [cCompetitor, setCCompetitor] = useState("");
  const [cNotes, setCNotes] = useState("");
  const [cDate, setCDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [showAddClosure, setShowAddClosure] = useState(false);

  useEffect(() => {
    if (lead) setDraft({ ...lead });
    setTab("profile");
    setEditing(false);
    setShowAddClosure(false);
  }, [leadId]);

  if (!lead) return null;

  const leadFollowups = db.followups.filter(f => f.leadId === lead.id).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const leadQuotations = db.quotations.filter(q => q.leadId === lead.id);
  const leadClosures = db.closures
    .filter(c => c.leadId === lead.id)
    .sort((a, b) => new Date(b.closureDate).getTime() - new Date(a.closureDate).getTime());
  const leadActivity = db.activity.filter(a => a.leadId === lead.id).reverse();

  const saveEdits = () => {
    // callNotes is owned by the Notes thread, not the profile form. Exclude it
    // so a stale draft snapshot can't overwrite notes added after the drawer opened.
    const { callNotes: _ignore, ...patch } = draft;
    api.updateLead(lead.id, patch);
    setEditing(false);
    toast.success("Lead updated");
  };
  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete lead?",
      body: `"${lead.name}" and all related data will be permanently removed. This cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (ok) { api.deleteLead(lead.id); onClose(); toast.success(`"${lead.name}" deleted`); }
  };
  const notes = parseNotes(lead.callNotes);
  const sortedNotes = [...notes].sort((a, b) => {
    const ta = a.at ? new Date(a.at).getTime() : 0;
    const tb = b.at ? new Date(b.at).getTime() : 0;
    return notesSort === "recent-last" ? ta - tb : tb - ta;
  });
  const addNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    const next = [...notes, { id: crypto.randomUUID(), text, at: new Date().toISOString() }];
    api.updateLead(lead.id, { callNotes: JSON.stringify(next) });
    setNoteDraft("");
  };
  const deleteNote = (id: string) => {
    const next = notes.filter(n => n.id !== id);
    api.updateLead(lead.id, { callNotes: next.length ? JSON.stringify(next) : "" });
  };

  const addFollowup = () => {
    if (!fuDue) return;
    // fuDue is a naive datetime-local string (no timezone). Convert it to an
    // absolute ISO instant so it stays stable across the TIMESTAMPTZ round-trip —
    // otherwise Postgres reads the offset-less string as UTC and the time shifts
    // by the user's timezone offset once it's re-fetched.
    api.addFollowup({ leadId: lead.id, type: fuType, dueAt: new Date(fuDue).toISOString(), note: fuNote });
    setFuDue(""); setFuNote("");
    toast.success("Follow-up scheduled");
  };
  const addQuotation = () => {
    const p = Number(qPrice); if (!p) return;
    const d = Number(qDiscount) || 0;
    api.addQuotation({ leadId: lead.id, package: qPkg, shiftHours: qHours, quotedPrice: p, discount: d, finalPrice: p - d, date: new Date().toISOString(), notes: qNotes });
    setQPrice(""); setQDiscount("0"); setQNotes("");
    toast.success("Quotation saved", { description: `₹${(p - d).toLocaleString("en-IN")} — ${qPkg}` });
  };
  const submitClosure = () => {
    const closureDate = cDate ? new Date(`${cDate}T12:00:00`).toISOString() : new Date().toISOString();
    if (closureType === "Won") {
      api.closeLead({ leadId: lead.id, type: "Won", finalPackage: cPkg, finalAmount: Number(cAmount) || undefined, advanceReceived: Number(cAdvance) || undefined, paymentStatus: cPayStatus, closureDate });
      toast.success("Closed Won!", { description: cAmount ? `₹${Number(cAmount).toLocaleString("en-IN")} · ${cPayStatus}` : undefined });
    } else {
      api.closeLead({ leadId: lead.id, type: "Lost", lostReason: cLostReason, competitorName: cCompetitor, notes: cNotes, closureDate });
      toast.warning("Marked as Lost", { description: cLostReason });
    }
    // Reset the add-closure form so the next entry starts blank, and collapse it.
    setCPkg(""); setCAmount(""); setCAdvance(""); setCPayStatus("Pending");
    setCLostReason("Competitor selected"); setCCompetitor(""); setCNotes("");
    setCDate(format(new Date(), "yyyy-MM-dd"));
    setShowAddClosure(false);
  };
  const fmtDt = (iso: string) => { try { return format(new Date(iso), "dd MMM, hh:mm a"); } catch { return iso; } };

  return (
    <>
      <div className="crm-drawer-overlay open" onClick={onClose} />
      <aside className="crm-drawer open" role="dialog" aria-label={`Lead: ${lead.name}`}>

        {/* ── Header ── */}
        <div style={{
          background: "#FFFFFF",
          padding: "1.25rem 1.25rem 0",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
        }}>
          {/* Avatar + Name row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", marginBottom: "1rem" }}>
            <Avatar
              name={lead.name}
              size={44}
              shape="rounded"
              style={{
                background: "rgba(95,71,255,0.08)",
                color: "#5F47FF",
                border: "1px solid rgba(95,71,255,0.18)",
                fontWeight: 700,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111110", lineHeight: 1.2, letterSpacing: "-0.015em" }}>{lead.name}</h3>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(0,0,0,0.04)",
                  color: "#6B6B6A", fontSize: "0.78rem", textDecoration: "none",
                  padding: "3px 10px", borderRadius: 6,
                  border: "1px solid rgba(0,0,0,0.08)",
                  fontWeight: 500,
                }}>
                  <Phone size={12} />{lead.phone}
                </a>
                {lead.whatsapp && (
                  <a href={`https://wa.me/91${lead.whatsapp}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: "rgba(48,164,108,0.07)",
                    color: "#30A46C", fontSize: "0.78rem", textDecoration: "none",
                    padding: "3px 10px", borderRadius: 6,
                    border: "1px solid rgba(48,164,108,0.2)",
                    fontWeight: 500,
                  }}>
                    <MessageCircle size={12} />WhatsApp
                  </a>
                )}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="crm-icon-btn">
              <X size={16} />
            </button>
          </div>

          {/* Stage selector + Edit/Close action bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.875rem" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <select
                value={lead.stage}
                onChange={e => api.moveStage(lead.id, e.target.value as LeadStage)}
                style={{
                  width: "100%", appearance: "none",
                  background: "#F9F8F6",
                  color: "#111110", border: "1px solid rgba(0,0,0,0.09)",
                  borderRadius: 8, padding: "0.45rem 2rem 0.45rem 0.75rem",
                  fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#A8A8A6", pointerEvents: "none" }} />
            </div>

            {editing ? (
              <>
                <button onClick={saveEdits} className="crm-btn crm-btn-primary crm-btn-sm">
                  <Save size={13} /> Save
                </button>
                <button onClick={() => { setEditing(false); setDraft({ ...lead }); }} className="crm-btn crm-btn-ghost crm-btn-sm crm-btn-icon">
                  <X size={13} />
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="crm-btn crm-btn-ghost crm-btn-sm">
                <Edit2 size={13} /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="crm-drawer-tabs">
          {(["profile", "followups", "quotations", "closure", "activity"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`crm-drawer-tab ${tab === t ? "active" : ""}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === "followups" && leadFollowups.filter(f => !f.completed).length > 0 && (
                <span className="crm-tab-count">{leadFollowups.filter(f => !f.completed).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="crm-drawer-body">

          {/* ── Profile ── */}
          {tab === "profile" && (
            <div className="crm-drawer-tab-content">

              {/* Lead Info */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div className="crm-section-title" style={{ marginBottom: "0.875rem" }}>Lead Info</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Name" value={lead.name} field="name"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Phone" value={lead.phone} field="phone"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="WhatsApp" value={lead.whatsapp} field="whatsapp"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Source" value={lead.source} field="source"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Relation with baby" value={lead.owner} field="owner"  editing={editing} draft={draft} setDraft={setDraft} />
                </div>
              </div>

              <div style={{ height: 1, background: "var(--crm-border)", marginBottom: "1.5rem" }} />

              {/* Baby Details */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div className="crm-section-title" style={{ marginBottom: "0.875rem" }}>Baby Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Baby Status" value={lead.babyStatus} field="babyStatus"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Hospital" value={lead.hospitalName} field="hospitalName"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Birth Stage" value={lead.babyBirthStageStatus} field="babyBirthStageStatus"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Baby Age" value={lead.babyAge} field="babyAge"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Current Weight" value={lead.currentWeight} field="currentWeight"  editing={editing} draft={draft} setDraft={setDraft} />
                </div>
              </div>

              <div style={{ height: 1, background: "var(--crm-border)", marginBottom: "1.5rem" }} />

              {/* Service & Shift */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div className="crm-section-title" style={{ marginBottom: "0.875rem" }}>Service & Shift</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Service" value={lead.serviceRequired} field="serviceRequired"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Shift Type" value={lead.preferredShift} field="preferredShift"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Shift Hours" value={lead.shiftHoursCount} field="shiftHoursCount" type="number"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Shift Time" value={lead.shiftTime} field="shiftTime"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Care Start Date" value={lead.careStartDate} field="careStartDate" type="date"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Service Days" value={lead.serviceDays} field="serviceDays" type="number"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="Budget (₹)" value={lead.budget} field="budget" type="number"  editing={editing} draft={draft} setDraft={setDraft} />
                </div>
              </div>

              <div style={{ height: 1, background: "var(--crm-border)", marginBottom: "1.5rem" }} />

              {/* Address */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div className="crm-section-title" style={{ marginBottom: "0.875rem" }}>Location</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Area" value={lead.area} field="area"  editing={editing} draft={draft} setDraft={setDraft} />
                  <Field label="City" value={lead.city} field="city"  editing={editing} draft={draft} setDraft={setDraft} />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Address" value={lead.address} field="address"  editing={editing} draft={draft} setDraft={setDraft} />
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: "var(--crm-border)", marginBottom: "1.5rem" }} />

              {/* Notes */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: "0.875rem" }}>
                  <div className="crm-section-title" style={{ margin: 0 }}>Notes</div>
                  <div style={{ position: "relative" }}>
                    <select
                      value={notesSort}
                      onChange={e => setNotesSort(e.target.value as "recent-last" | "recent-first")}
                      style={{
                        appearance: "none", background: "#F9F8F6", color: "#111110",
                        border: "1px solid rgba(0,0,0,0.09)", borderRadius: 8,
                        padding: "0.3rem 1.75rem 0.3rem 0.6rem", fontSize: "0.72rem",
                        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      <option value="recent-last">Recent Last</option>
                      <option value="recent-first">Recent First</option>
                    </select>
                    <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "#A8A8A6", pointerEvents: "none" }} />
                  </div>
                </div>

                {notes.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "0.85rem" }}>
                    {sortedNotes.map(n => (
                      <div
                        key={n.id}
                        onMouseEnter={() => setHoverNote(n.id)}
                        onMouseLeave={() => setHoverNote(h => (h === n.id ? null : h))}
                        style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start" }}
                      >
                        <Avatar name={lead.name} size={34} shape="circle" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.85rem", color: "#111110", fontWeight: 600, lineHeight: 1.4, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{n.text}</div>
                          {n.at && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 3, fontSize: "0.72rem", color: "var(--crm-text-muted)" }}>
                              <Clock size={11} />{fmtNoteDt(n.at)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteNote(n.id)}
                          aria-label="Delete note"
                          className="crm-icon-btn"
                          style={{ opacity: hoverNote === n.id ? 0.7 : 0, transition: "opacity 0.15s", flexShrink: 0, color: "#DC2626" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  className="crm-input"
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNote(); } }}
                  placeholder="Add a note"
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ height: 1, background: "var(--crm-border)", marginBottom: "1.5rem" }} />

              {/* Danger Zone */}
              <div>
                <div className="crm-section-title" style={{ color: "#EF4444", marginBottom: "0.875rem" }}>Danger Zone</div>
                <button className="crm-btn crm-btn-danger crm-btn-sm" onClick={handleDelete}>
                  <Trash2 size={14} /> Delete Lead
                </button>
              </div>
            </div>
          )}

          {/* ── Follow-ups ── */}
          {tab === "followups" && (
            <div className="crm-drawer-tab-content">
              <p className="crm-section-title">Schedule Follow-up</p>
              <div className="crm-card p-3 mb-4">
                <div className="crm-grid-2 mb-2">
                  <div className="crm-form-group">
                    <label className="crm-label">Type</label>
                    <select className="crm-select" value={fuType} onChange={e => setFuType(e.target.value as FollowupType)}>
                      {FOLLOWUP_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label required">Due Date & Time</label>
                    <input className="crm-input" type="datetime-local" value={fuDue} onChange={e => setFuDue(e.target.value)} />
                  </div>
                </div>
                <div className="crm-form-group mb-2">
                  <label className="crm-label">Note</label>
                  <input className="crm-input" value={fuNote} onChange={e => setFuNote(e.target.value)} placeholder="What to discuss..." />
                </div>
                <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={addFollowup}><Plus size={14} /> Add Follow-up</button>
              </div>

              <p className="crm-section-title">Follow-up History</p>
              {leadFollowups.length === 0 && <div className="crm-empty" style={{ padding: "1.5rem" }}>No follow-ups yet.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {leadFollowups.map(f => (
                  <div key={f.id} className="crm-card p-3" style={{ opacity: f.completed ? 0.6 : 1 }}>
                    <div className="d-flex align-items-start justify-content-between gap-2">
                      <div className="flex-1">
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                          <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{f.type}</span>
                          {f.completed ? <span className="crm-badge" style={{ background: "#F0FDF4", color: "#16A34A" }}><Check size={11} /> Done</span>
                            : isOverdue(f.dueAt) ? <span className="crm-badge" style={{ background: "#FEF2F2", color: "#DC2626" }}>Overdue</span>
                            : isToday(f.dueAt) ? <span className="crm-badge" style={{ background: "#FFFBEB", color: "#B45309" }}>Today</span>
                            : null}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} />{fmtDt(f.dueAt)}
                        </div>
                        {f.note && <div style={{ fontSize: "0.8rem", marginTop: 4 }}>{f.note}</div>}
                      </div>
                      {!f.completed && (
                        <div className="d-flex gap-1">
                          <button className="crm-btn crm-btn-sm" style={{ background: "#F0FDF4", color: "#16A34A" }} onClick={() => api.completeFollowup(f.id)}><Check size={13} /> Done</button>
                          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => api.rescheduleFollowup(f.id, new Date(new Date(f.dueAt).getTime() + 86400000).toISOString())} title="+1 day">+1d</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Quotations ── */}
          {tab === "quotations" && (
            <div className="crm-drawer-tab-content">
              <p className="crm-section-title">Add Quotation</p>
              <div className="crm-card p-3 mb-4">
                <div className="crm-grid-2 mb-2">
                  <div className="crm-form-group">
                    <label className="crm-label">Package</label>
                    <input className="crm-input" value={qPkg} onChange={e => setQPkg(e.target.value)} placeholder="Standard 30 days" />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Shift Hours</label>
                    <input className="crm-input" value={qHours} onChange={e => setQHours(e.target.value)} placeholder="12h" />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label required">Quoted Price (₹)</label>
                    <input className="crm-input" type="number" value={qPrice} onChange={e => setQPrice(e.target.value)} placeholder="40000" />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Discount (₹)</label>
                    <input className="crm-input" type="number" value={qDiscount} onChange={e => setQDiscount(e.target.value)} placeholder="0" />
                  </div>
                </div>
                {qPrice && (
                  <div style={{ fontSize: "0.85rem", marginBottom: 8, color: "var(--crm-primary)", fontWeight: 600 }}>
                    Final: ₹{(Number(qPrice) - Number(qDiscount || 0)).toLocaleString("en-IN")}
                  </div>
                )}
                <div className="crm-form-group mb-2">
                  <label className="crm-label">Notes</label>
                  <input className="crm-input" value={qNotes} onChange={e => setQNotes(e.target.value)} placeholder="Package details..." />
                </div>
                <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={addQuotation}><Plus size={14} /> Save Quotation</button>
              </div>

              <p className="crm-section-title">Quotation History</p>
              {leadQuotations.length === 0 && <div className="crm-empty" style={{ padding: "1.5rem" }}>No quotations yet.</div>}
              {leadQuotations.map(q => (
                <div key={q.id} className="crm-card p-3 mb-2">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{q.package} · {q.shiftHours}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)", marginTop: 2 }}>
                        Quoted ₹{q.quotedPrice.toLocaleString("en-IN")} — Discount ₹{q.discount.toLocaleString("en-IN")}
                      </div>
                      {q.notes && <div style={{ fontSize: "0.78rem", marginTop: 4 }}>{q.notes}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--crm-primary)" }}>₹{q.finalPrice.toLocaleString("en-IN")}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)" }}>{format(new Date(q.date), "dd MMM")}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Closure ── */}
          {tab === "closure" && (
            <div className="crm-drawer-tab-content">
              {/* Existing closures — one card each, independently editable */}
              {leadClosures.length > 0 && (
                <div className="d-flex flex-column gap-3 mb-3">
                  {leadClosures.map(c => <ClosureCard key={c.id} closure={c} />)}
                </div>
              )}

              {/* Add-closure form: always shown when there are no closures yet,
                  otherwise revealed by the "Add closure" button so a lead can
                  hold multiple bookings/renewals. */}
              {(showAddClosure || leadClosures.length === 0) ? (
                <div>
                  {leadClosures.length > 0 && (
                    <div className="crm-section-title mb-2">Add another closure</div>
                  )}
                  <div className="d-flex gap-2 mb-3">
                    <button onClick={() => setClosureType("Won")} className={`crm-btn ${closureType === "Won" ? "crm-btn-primary" : "crm-btn-ghost"} crm-btn-sm`}>Won</button>
                    <button onClick={() => setClosureType("Lost")} className={`crm-btn crm-btn-sm ${closureType === "Lost" ? "" : "crm-btn-ghost"}`} style={closureType === "Lost" ? { background: "#FEF2F2", color: "#DC2626" } : {}}>Lost</button>
                  </div>
                  {closureType === "Won" ? (
                    <div className="crm-card p-3">
                      <div className="crm-grid-2 mb-2">
                        <div className="crm-form-group">
                          <label className="crm-label">Package</label>
                          <input className="crm-input" value={cPkg} onChange={e => setCPkg(e.target.value)} placeholder="Standard 30 days" />
                        </div>
                        <div className="crm-form-group">
                          <label className="crm-label">Final Amount (₹)</label>
                          <input className="crm-input" type="number" value={cAmount} onChange={e => setCAmount(e.target.value)} placeholder="40000" />
                        </div>
                        <div className="crm-form-group">
                          <label className="crm-label">Advance Received (₹)</label>
                          <input className="crm-input" type="number" value={cAdvance} onChange={e => setCAdvance(e.target.value)} placeholder="10000" />
                        </div>
                        <div className="crm-form-group">
                          <label className="crm-label">Payment Status</label>
                          <select className="crm-select" value={cPayStatus} onChange={e => setCPayStatus(e.target.value as "Pending"|"Partial"|"Paid")}>
                            <option>Pending</option><option>Partial</option><option>Paid</option>
                          </select>
                        </div>
                        <div className="crm-form-group">
                          <label className="crm-label">Closure Date</label>
                          <input className="crm-input" type="date" value={cDate} onChange={e => setCDate(e.target.value)} />
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={submitClosure}>Confirm Won</button>
                        {leadClosures.length > 0 && (
                          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => setShowAddClosure(false)}>Cancel</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="crm-card p-3">
                      <div className="crm-grid-2 mb-2">
                        <div className="crm-form-group">
                          <label className="crm-label">Lost Reason</label>
                          <select className="crm-select" value={cLostReason} onChange={e => setCLostReason(e.target.value as LostReason)}>
                            {LOST_REASONS.map(r => <option key={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="crm-form-group">
                          <label className="crm-label">Competitor Name</label>
                          <input className="crm-input" value={cCompetitor} onChange={e => setCCompetitor(e.target.value)} placeholder="NurtureNest" />
                        </div>
                        <div className="crm-form-group">
                          <label className="crm-label">Closure Date</label>
                          <input className="crm-input" type="date" value={cDate} onChange={e => setCDate(e.target.value)} />
                        </div>
                      </div>
                      <div className="crm-form-group mb-2">
                        <label className="crm-label">Notes</label>
                        <textarea className="crm-textarea" value={cNotes} onChange={e => setCNotes(e.target.value)} placeholder="Why did we lose?" style={{ minHeight: 64 }} />
                      </div>
                      <div className="d-flex gap-2">
                        <button className="crm-btn crm-btn-sm" style={{ background: "#FEF2F2", color: "#DC2626" }} onClick={submitClosure}>Confirm Lost</button>
                        {leadClosures.length > 0 && (
                          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => setShowAddClosure(false)}>Cancel</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => setShowAddClosure(true)}>
                  <Plus size={14} /> Add closure
                </button>
              )}
            </div>
          )}

          {/* ── Activity ── */}
          {tab === "activity" && (
            <div className="crm-drawer-tab-content">
              <div className="crm-timeline">
                {leadActivity.length === 0 && <div className="crm-empty" style={{ padding: "1.5rem" }}>No activity yet.</div>}
                {leadActivity.map(a => (
                  <div key={a.id} className="crm-timeline-item">
                    <div className="crm-timeline-dot" />
                    <div className="flex-1">
                      <div style={{ fontSize: "0.875rem", color: "var(--crm-text)" }}>{a.message}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)", marginTop: 2 }}>{fmtDt(a.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
