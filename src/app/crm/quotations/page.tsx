"use client";
import { useState } from "react";
import { useQuotations, useLeads, useClosures } from "@/lib/crm-store";
import LeadDrawer from "@/components/crm/LeadDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Trophy, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function QuotationsPage() {
  const rawQuotations = useQuotations();
  const leads = useLeads();
  const closures = useClosures();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const quotations = [...rawQuotations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalQuotation = quotations.reduce((s, q) => s + q.quotedPrice, 0);
  const closedWon = closures.filter(c => c.type === "Won").reduce((s, c) => s + (c.finalAmount ?? 0), 0);
  const closedLost = closures.filter(c => c.type === "Lost").reduce((s, c) => s + (c.finalAmount ?? 0), 0);

  return (
    <>
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Quotations</h1>
          <p className="crm-page-subtitle">{quotations.length} quotations</p>
        </div>
      </div>

      {quotations.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 16,
            marginBottom: 28,
            maxWidth: 760,
          }}
        >
          {[
            { label: "Total Quotation Amount", value: totalQuotation, Icon: FileText, color: "#5F47FF", tint: "rgba(95,71,255,0.08)", valueColor: "#0F172A" },
            { label: "Closed Won Amount", value: closedWon, Icon: Trophy, color: "#16A34A", tint: "#F0FDF4", valueColor: "#16A34A" },
            { label: "Closed Lost Amount", value: closedLost, Icon: XCircle, color: "#DC2626", tint: "#FEF2F2", valueColor: "#DC2626" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#fff",
                border: "1px solid rgba(15,23,42,0.06)",
                borderRadius: 14,
                padding: "16px 18px",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: s.tint,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <s.Icon size={20} color={s.color} strokeWidth={2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#94A3B8",
                    lineHeight: 1.3,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: "1.45rem",
                    fontWeight: 800,
                    color: s.valueColor,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                    marginTop: 3,
                  }}
                >
                  ₹{s.value.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {quotations.length === 0 ? (
        <div className="crm-card">
          <EmptyState
            icon={<FileText size={40} />}
            title="No quotations yet"
            description="Send a quotation from any lead's drawer to see it here."
            action={{ label: "Go to Leads", href: "/crm/leads" }}
          />
        </div>
      ) : (
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Package</th>
                <th className="d-none d-md-table-cell">Shift</th>
                <th>Quoted</th>
                <th className="d-none d-md-table-cell">Discount</th>
                <th>Paid Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => {
                const lead = leads.find(l => l.id === q.leadId);
                return (
                  <tr key={q.id} onClick={() => lead && setSelectedLead(lead.id)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{lead?.name ?? "—"}</div>
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>{q.package}</td>
                    <td className="d-none d-md-table-cell" style={{ fontSize: "0.875rem", color: "var(--crm-text-muted)" }}>{q.shiftHours}</td>
                    <td style={{ fontSize: "0.875rem" }}>₹{q.quotedPrice.toLocaleString("en-IN")}</td>
                    <td className="d-none d-md-table-cell" style={{ fontSize: "0.875rem", color: "#16A34A" }}>
                      {q.discount > 0 ? `−₹${q.discount.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--crm-primary)", fontSize: "0.975rem" }}>
                      ₹{q.finalPrice.toLocaleString("en-IN")}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--crm-text-muted)", whiteSpace: "nowrap" }}>
                      {format(new Date(q.date), "dd MMM yyyy")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
