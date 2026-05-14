"use client";
import { useState, useEffect } from "react";
import { X, Phone, MessageCircle, Edit2, Save, Trash2, Plus, Check, Clock, ChevronDown } from "lucide-react";
import { api, useDB, isOverdue, isToday } from "@/lib/crm-store";
import type { Lead, LeadStage, FollowupType, LostReason } from "@/lib/crm-types";
import { LEAD_STAGES } from "@/lib/crm-types";
import StageBadge from "./StageBadge";
import { format } from "date-fns";

const FOLLOWUP_TYPES: FollowupType[] = ["First call", "Call back", "Quotation reminder", "Payment reminder", "Trial decision", "Closure follow-up"];
const LOST_REASONS: LostReason[] = ["Competitor selected", "Budget issue", "No response", "Trust issue", "Service not available", "Other"];

interface Props { leadId: string | null; onClose: () => void; }
type Tab = "profile" | "followups" | "quotations" | "closure" | "activity";

export default function LeadDrawer({ leadId, onClose }: Props) {
  const db = useDB();
  const lead = leadId ? db.leads.find(l => l.id === leadId) ?? null : null;
  const [tab, setTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Lead>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [fuType, setFuType] = useState<FollowupType>("Call back");
  const [fuDue, setFuDue] = useState("");
  const [fuNote, setFuNote] = useState("");

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

  useEffect(() => {
    if (lead) setDraft({ ...lead });
    setTab("profile");
    setEditing(false);
    setDeleteConfirm(false);
  }, [leadId]);

  if (!lead) return null;

  const leadFollowups = db.followups.filter(f => f.leadId === lead.id).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const leadQuotations = db.quotations.filter(q => q.leadId === lead.id);
  const leadClosure = db.closures.find(c => c.leadId === lead.id);
  const leadActivity = db.activity.filter(a => a.leadId === lead.id).reverse();

  const initials = (lead.name || "U").split(" ").map((w: string) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const saveEdits = () => { api.updateLead(lead.id, draft); setEditing(false); };
  const handleDelete = () => { api.deleteLead(lead.id); onClose(); };
  const addFollowup = () => {
    if (!fuDue) return;
    api.addFollowup({ leadId: lead.id, type: fuType, dueAt: fuDue, note: fuNote });
    setFuDue(""); setFuNote("");
  };
  const addQuotation = () => {
    const p = Number(qPrice); if (!p) return;
    const d = Number(qDiscount) || 0;
    api.addQuotation({ leadId: lead.id, package: qPkg, shiftHours: qHours, quotedPrice: p, discount: d, finalPrice: p - d, date: new Date().toISOString(), notes: qNotes });
    setQPrice(""); setQDiscount("0"); setQNotes("");
  };
  const submitClosure = () => {
    if (closureType === "Won") {
      api.closeLead({ leadId: lead.id, type: "Won", finalPackage: cPkg, finalAmount: Number(cAmount) || undefined, advanceReceived: Number(cAdvance) || undefined, paymentStatus: cPayStatus, closureDate: new Date().toISOString() });
    } else {
      api.closeLead({ leadId: lead.id, type: "Lost", lostReason: cLostReason, competitorName: cCompetitor, notes: cNotes, closureDate: new Date().toISOString() });
    }
  };
  const fmtDt = (iso: string) => { try { return format(new Date(iso), "dd MMM, hh:mm a"); } catch { return iso; } };

  const Field = ({ label, value, field, type = "text" }: { label: string; value?: string | number; field: keyof Lead; type?: string }) => (
    <div>
      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--crm-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      {editing ? (
        <input className="crm-input" type={type} value={(draft[field] as string) ?? ""} onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))} style={{ fontSize: "0.85rem" }} />
      ) : (
        <div style={{ fontSize: "0.875rem", color: value ? "var(--crm-text)" : "var(--crm-text-muted)", fontWeight: value ? 500 : 400 }}>{value || "—"}</div>
      )}
    </div>
  );

  return (
    <>
      <div className="crm-drawer-overlay open" onClick={onClose} />
      <aside className="crm-drawer open" role="dialog" aria-label={`Lead: ${lead.name}`}>

        {/* ── Premium Header ── */}
        <div style={{
          background: "linear-gradient(135deg, #4F6EF7 0%, #6C3FC5 100%)",
          padding: "1.5rem 1.25rem 0",
          position: "relative",
        }}>
          {/* Avatar + Name row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", marginBottom: "1rem" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", fontWeight: 700, color: "#fff",
              flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.3)",
            }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{lead.name}</h3>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                  color: "#fff", fontSize: "0.78rem", textDecoration: "none",
                  padding: "4px 10px", borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.25)",
                  fontWeight: 500,
                }}>
                  <Phone size={12} />{lead.phone}
                </a>
                {lead.whatsapp && (
                  <a href={`https://wa.me/91${lead.whatsapp}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: "rgba(37,211,102,0.25)", backdropFilter: "blur(8px)",
                    color: "#fff", fontSize: "0.78rem", textDecoration: "none",
                    padding: "4px 10px", borderRadius: 999,
                    border: "1px solid rgba(37,211,102,0.4)",
                    fontWeight: 500,
                  }}>
                    <MessageCircle size={12} />WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stage selector + Edit/Close action bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.875rem" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <select
                value={lead.stage}
                onChange={e => api.moveStage(lead.id, e.target.value as LeadStage)}
                style={{
                  width: "100%", appearance: "none",
                  background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                  color: "#fff", border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 8, padding: "0.45rem 2rem 0.45rem 0.75rem",
                  fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                }}
              >
                {LEAD_STAGES.map(s => <option key={s} value={s} style={{ color: "#1E293B", background: "#fff" }}>{s}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.7)", pointerEvents: "none" }} />
            </div>

            {editing ? (
              <>
                <button onClick={saveEdits} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(255,255,255,0.9)", color: "#4F6EF7",
                  border: "none", borderRadius: 8, padding: "0.45rem 0.875rem",
                  fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                }}>
                  <Save size={13} /> Save
                </button>
                <button onClick={() => { setEditing(false); setDraft({ ...lead }); }} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(255,255,255,0.15)", color: "#fff",
                  border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8,
                  padding: "0.45rem 0.75rem", fontSize: "0.78rem", cursor: "pointer",
                }}>
                  <X size={13} />
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
                color: "#fff", border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8, padding: "0.45rem 0.875rem",
                fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}>
                <Edit2 size={13} /> Edit
              </button>
            )}
            <button onClick={onClose} aria-label="Close" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
              color: "#fff", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 8, width: 34, height: 34, cursor: "pointer", flexShrink: 0,
            }}>
              <X size={16} />
            </button>
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
                <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--crm-text-muted)", marginBottom: "0.875rem" }}>Lead Info</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Name" value={lead.name} field="name" />
                  <Field label="Phone" value={lead.phone} field="phone" />
                  <Field label="WhatsApp" value={lead.whatsapp} field="whatsapp" />
                  <Field label="Source" value={lead.source} field="source" />
                  <Field label="Owner" value={lead.owner} field="owner" />
                </div>
              </div>

              <div style={{ height: 1, background: "var(--crm-border)", marginBottom: "1.5rem" }} />

              {/* Baby Details */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--crm-text-muted)", marginBottom: "0.875rem" }}>Baby Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Baby Status" value={lead.babyStatus} field="babyStatus" />
                  <Field label="Hospital" value={lead.hospitalName} field="hospitalName" />
                  <Field label="Birth Stage" value={lead.babyBirthStageStatus} field="babyBirthStageStatus" />
                  <Field label="Baby Age" value={lead.babyAge} field="babyAge" />
                  <Field label="Current Weight" value={lead.currentWeight} field="currentWeight" />
                </div>
              </div>

              <div style={{ height: 1, background: "var(--crm-border)", marginBottom: "1.5rem" }} />

              {/* Service & Shift */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--crm-text-muted)", marginBottom: "0.875rem" }}>Service & Shift</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Service" value={lead.serviceRequired} field="serviceRequired" />
                  <Field label="Shift Type" value={lead.preferredShift} field="preferredShift" />
                  <Field label="Shift Hours" value={lead.shiftHoursCount} field="shiftHoursCount" type="number" />
                  <Field label="Shift Time" value={lead.shiftTime} field="shiftTime" />
                  <Field label="Care Start Date" value={lead.careStartDate} field="careStartDate" type="date" />
                  <Field label="Service Days" value={lead.serviceDays} field="serviceDays" type="number" />
                  <Field label="Budget (₹)" value={lead.budget} field="budget" type="number" />
                </div>
              </div>

              <div style={{ height: 1, background: "var(--crm-border)", marginBottom: "1.5rem" }} />

              {/* Address */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--crm-text-muted)", marginBottom: "0.875rem" }}>Location</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <Field label="Area" value={lead.area} field="area" />
                  <Field label="City" value={lead.city} field="city" />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Address" value={lead.address} field="address" />
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: "var(--crm-border)", marginBottom: "1.5rem" }} />

              {/* Call Notes */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--crm-text-muted)", marginBottom: "0.875rem" }}>Call Notes</div>
                <textarea
                  key={lead.id}
                  className="crm-textarea"
                  defaultValue={lead.callNotes ?? ""}
                  placeholder="Add notes from your call…"
                  onBlur={e => api.updateLead(lead.id, { callNotes: e.target.value })}
                  style={{ minHeight: 80, fontSize: "0.875rem" }}
                />
              </div>

              <div style={{ height: 1, background: "var(--crm-border)", marginBottom: "1.5rem" }} />

              {/* Danger Zone */}
              <div>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#EF4444", marginBottom: "0.875rem" }}>Danger Zone</div>
                {deleteConfirm ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--crm-text-muted)" }}>This cannot be undone.</span>
                    <button className="crm-btn crm-btn-danger crm-btn-sm" onClick={handleDelete}><Trash2 size={14} /> Yes, Delete</button>
                    <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => setDeleteConfirm(false)}>Cancel</button>
                  </div>
                ) : (
                  <button className="crm-btn crm-btn-danger crm-btn-sm" onClick={() => setDeleteConfirm(true)}><Trash2 size={14} /> Delete Lead</button>
                )}
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
                    <select className="crm-select" value={qHours} onChange={e => setQHours(e.target.value)}>
                      <option>12h</option><option>24h</option><option>8h</option>
                    </select>
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
              {leadClosure ? (
                <div className="crm-card p-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <span className="crm-badge" style={leadClosure.type === "Won" ? { background: "#F0FDF4", color: "#16A34A", fontSize: "0.85rem" } : { background: "#FEF2F2", color: "#DC2626", fontSize: "0.85rem" }}>
                      {leadClosure.type === "Won" ? "🏆 Closed Won" : "✗ Closed Lost"}
                    </span>
                  </div>
                  {leadClosure.type === "Won" && (
                    <div className="crm-grid-2">
                      <div><div className="crm-section-title mb-1">Package</div><div style={{ fontSize: "0.875rem" }}>{leadClosure.finalPackage || "—"}</div></div>
                      <div><div className="crm-section-title mb-1">Final Amount</div><div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--crm-primary)" }}>{leadClosure.finalAmount ? `₹${leadClosure.finalAmount.toLocaleString("en-IN")}` : "—"}</div></div>
                      <div><div className="crm-section-title mb-1">Advance</div><div style={{ fontSize: "0.875rem" }}>{leadClosure.advanceReceived ? `₹${leadClosure.advanceReceived.toLocaleString("en-IN")}` : "—"}</div></div>
                      <div><div className="crm-section-title mb-1">Payment</div>
                        <span className="crm-badge" style={{ background: leadClosure.paymentStatus === "Paid" ? "#F0FDF4" : leadClosure.paymentStatus === "Partial" ? "#FFFBEB" : "#FEF2F2", color: leadClosure.paymentStatus === "Paid" ? "#16A34A" : leadClosure.paymentStatus === "Partial" ? "#B45309" : "#DC2626" }}>
                          {leadClosure.paymentStatus}
                        </span>
                      </div>
                    </div>
                  )}
                  {leadClosure.type === "Lost" && (
                    <div className="crm-grid-2">
                      <div><div className="crm-section-title mb-1">Reason</div><div style={{ fontSize: "0.875rem" }}>{leadClosure.lostReason || "—"}</div></div>
                      <div><div className="crm-section-title mb-1">Competitor</div><div style={{ fontSize: "0.875rem" }}>{leadClosure.competitorName || "—"}</div></div>
                      {leadClosure.notes && <div style={{ gridColumn: "1/-1" }}><div className="crm-section-title mb-1">Notes</div><div style={{ fontSize: "0.875rem" }}>{leadClosure.notes}</div></div>}
                    </div>
                  )}
                </div>
              ) : (
                <div>
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
                      </div>
                      <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={submitClosure}>Confirm Won</button>
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
                      </div>
                      <div className="crm-form-group mb-2">
                        <label className="crm-label">Notes</label>
                        <textarea className="crm-textarea" value={cNotes} onChange={e => setCNotes(e.target.value)} placeholder="Why did we lose?" style={{ minHeight: 64 }} />
                      </div>
                      <button className="crm-btn crm-btn-sm" style={{ background: "#FEF2F2", color: "#DC2626" }} onClick={submitClosure}>Confirm Lost</button>
                    </div>
                  )}
                </div>
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
