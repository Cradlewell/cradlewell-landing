"use client";
import { useState } from "react";
import { useDB } from "@/lib/crm-store";
import LeadDrawer from "@/components/crm/LeadDrawer";
import { Trophy, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function ClosuresPage() {
  const db = useDB();
  const [tab, setTab] = useState<"won" | "lost">("won");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const won = db.closures.filter(c => c.type === "Won");
  const lost = db.closures.filter(c => c.type === "Lost");
  const current = tab === "won" ? won : lost;

  const totalWon = won.reduce((s, c) => s + (c.finalAmount ?? 0), 0);

  const PAYMENT_STYLE: Record<string, { bg: string; color: string }> = {
    Paid:    { bg: "#F0FDF4", color: "#16A34A" },
    Partial: { bg: "#FFFBEB", color: "#B45309" },
    Pending: { bg: "#FEF2F2", color: "#DC2626" },
  };

  return (
    <>
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Closures</h1>
          <p className="crm-page-subtitle">{won.length} won · {lost.length} lost · ₹{totalWon.toLocaleString("en-IN")} revenue</p>
        </div>
      </div>

      <div className="crm-tabs">
        <button onClick={() => setTab("won")} className={`crm-tab ${tab === "won" ? "active" : ""}`}>
          <Trophy size={15} /> Won <span className="crm-tab-count">{won.length}</span>
        </button>
        <button onClick={() => setTab("lost")} className={`crm-tab ${tab === "lost" ? "active" : ""}`}
          style={tab !== "lost" && lost.length > 0 ? { color: "#DC2626" } : {}}>
          <XCircle size={15} /> Lost <span className="crm-tab-count" style={tab !== "lost" ? { background: "#FEF2F2", color: "#DC2626" } : {}}>{lost.length}</span>
        </button>
      </div>

      {current.length === 0 ? (
        <div className="crm-card"><div className="crm-empty">No closures yet in this category.</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
          {current.map(c => {
            const lead = db.leads.find(l => l.id === c.leadId);
            return (
              <div key={c.id} className="crm-card" style={{ padding: "1.25rem", cursor: "pointer" }}
                onClick={() => lead && setSelectedLead(lead.id)}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>{lead?.name ?? c.leadId}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)", marginBottom: 10 }}>{format(new Date(c.closureDate), "dd MMM yyyy")}</div>

                {c.type === "Won" && (
                  <>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--crm-primary)", lineHeight: 1 }}>
                      ₹{(c.finalAmount ?? 0).toLocaleString("en-IN")}
                    </div>
                    {c.finalPackage && <div style={{ fontSize: "0.8rem", color: "var(--crm-text-muted)", marginTop: 4 }}>{c.finalPackage}</div>}
                    <div className="d-flex align-items-center justify-content-between mt-2">
                      {c.advanceReceived && (
                        <span style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)" }}>
                          Advance: ₹{c.advanceReceived.toLocaleString("en-IN")}
                        </span>
                      )}
                      {c.paymentStatus && (
                        <span className="crm-badge" style={PAYMENT_STYLE[c.paymentStatus] ?? {}}>
                          {c.paymentStatus}
                        </span>
                      )}
                    </div>
                  </>
                )}

                {c.type === "Lost" && (
                  <>
                    <span className="crm-badge mb-2" style={{ background: "#FEF2F2", color: "#DC2626" }}>{c.lostReason}</span>
                    {c.competitorName && (
                      <div style={{ fontSize: "0.8rem", color: "var(--crm-text-muted)", marginTop: 4 }}>
                        Competitor: {c.competitorName}
                      </div>
                    )}
                    {c.notes && <div style={{ fontSize: "0.78rem", marginTop: 4, color: "var(--crm-text-muted)" }}>{c.notes}</div>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
