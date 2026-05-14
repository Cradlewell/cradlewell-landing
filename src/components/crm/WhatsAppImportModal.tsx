"use client";
import { useState, useEffect, useCallback } from "react";
import { X, MessageSquare, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

const STEP_LABEL: Record<string, string> = {
  ask_name: "Gave name only",
  ask_baby_status: "Gave name",
  ask_location: "Gave baby status",
  ask_hospital: "Gave location",
  ask_birth_stage: "Gave hospital",
  ask_baby_age: "Gave birth stage",
  ask_baby_weight: "Gave baby age",
  ask_service: "Gave baby weight",
  ask_shift: "Chose service",
  ask_japa_hours: "Chose shift type",
  ask_time_slot: "Chose Japa hours",
  ask_care_date: "Chose time slot",
  ask_due_date: "Gave due date step",
  ask_service_days: "Almost done — missing service days",
};

const STEP_COLOR: Record<string, string> = {
  ask_name: "#94A3B8",
  ask_baby_status: "#94A3B8",
  ask_location: "#F59E0B",
  ask_hospital: "#F59E0B",
  ask_birth_stage: "#F59E0B",
  ask_baby_age: "#3B82F6",
  ask_baby_weight: "#3B82F6",
  ask_service: "#3B82F6",
  ask_shift: "#8B5CF6",
  ask_japa_hours: "#8B5CF6",
  ask_time_slot: "#8B5CF6",
  ask_care_date: "#10B981",
  ask_due_date: "#10B981",
  ask_service_days: "#F97316",
};

interface WASession {
  wa_phone: string;
  step: string;
  name?: string;
  baby_status?: string;
  service?: string;
  shift?: string;
  location?: string;
  already_imported: boolean;
  updated_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function WhatsAppImportModal({ open, onClose, onImported }: Props) {
  const [sessions, setSessions] = useState<WASession[]>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, "ok" | "error" | "exists">>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/whatsapp-sessions");
      const json = await res.json();
      setSessions(json.sessions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      setResults({});
    }
  }, [open, load]);

  if (!open) return null;

  const handleConvert = async (wa_phone: string) => {
    setConverting(wa_phone);
    try {
      const res = await fetch("/api/crm/whatsapp-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa_phone }),
      });
      if (res.status === 409) {
        setResults((r) => ({ ...r, [wa_phone]: "exists" }));
      } else if (res.ok) {
        setResults((r) => ({ ...r, [wa_phone]: "ok" }));
        onImported();
      } else {
        setResults((r) => ({ ...r, [wa_phone]: "error" }));
      }
    } catch {
      setResults((r) => ({ ...r, [wa_phone]: "error" }));
    } finally {
      setConverting(null);
    }
  };

  const fmtPhone = (p: string) => p.replace(/\D/g, "").slice(-10);
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1059 }} onClick={onClose} />
      <div className="modal fade show d-block crm-modal" style={{ zIndex: 1060 }} role="dialog" aria-modal aria-label="Import from WhatsApp">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">

            <div className="modal-header">
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageSquare size={16} color="#16A34A" />
                </div>
                <div>
                  <h5 className="modal-title" style={{ marginBottom: 0 }}>Import from WhatsApp</h5>
                  <p style={{ fontSize: "0.75rem", color: "var(--crm-text-muted)", margin: 0 }}>
                    Customers who started but didn&apos;t complete the chatbot flow
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button type="button" className="crm-btn crm-btn-ghost crm-btn-icon" onClick={load} title="Refresh" disabled={loading}>
                  <RefreshCw size={15} className={loading ? "crm-spin" : ""} />
                </button>
                <button type="button" className="crm-btn crm-btn-ghost crm-btn-icon" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--crm-text-muted)", fontSize: "0.9rem" }}>
                  Loading incomplete sessions…
                </div>
              ) : !sessions.length ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--crm-text-muted)", fontSize: "0.9rem" }}>
                  No incomplete WhatsApp sessions found.
                </div>
              ) : (
                <table className="crm-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Contact</th>
                      <th>Dropped at</th>
                      <th>Details</th>
                      <th>Last seen</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => {
                      const result = results[s.wa_phone];
                      const done = result === "ok" || s.already_imported;
                      return (
                        <tr key={s.wa_phone}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{s.name || "—"}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)" }}>+91 {fmtPhone(s.wa_phone)}</div>
                          </td>
                          <td>
                            <span style={{
                              display: "inline-block",
                              fontSize: "0.73rem", fontWeight: 600,
                              padding: "2px 8px", borderRadius: 20,
                              background: (STEP_COLOR[s.step] ?? "#94A3B8") + "22",
                              color: STEP_COLOR[s.step] ?? "#94A3B8",
                            }}>
                              {STEP_LABEL[s.step] ?? s.step}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)" }}>
                            {[s.baby_status, s.service, s.shift].filter(Boolean).join(" · ") || "—"}
                          </td>
                          <td style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)" }}>
                            {fmtDate(s.updated_at)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {done ? (
                              <span style={{ color: "#16A34A", fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                                <CheckCircle size={14} /> Imported
                              </span>
                            ) : result === "error" ? (
                              <span style={{ color: "#DC2626", fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                                <AlertCircle size={14} /> Failed
                              </span>
                            ) : result === "exists" ? (
                              <span style={{ color: "#F59E0B", fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                                <AlertCircle size={14} /> Already exists
                              </span>
                            ) : (
                              <button
                                className="crm-btn crm-btn-primary"
                                style={{ fontSize: "0.78rem", padding: "4px 12px" }}
                                disabled={converting === s.wa_phone}
                                onClick={() => handleConvert(s.wa_phone)}
                              >
                                {converting === s.wa_phone ? "Importing…" : "Convert to Lead"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="crm-btn crm-btn-ghost" onClick={onClose}>Close</button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
