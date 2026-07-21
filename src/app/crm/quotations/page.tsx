"use client";
import { useState } from "react";
import { useQuotations, useLeads, useClosures } from "@/lib/crm-store";
import LeadDrawer from "@/components/crm/LeadDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";
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
        <div className="crm-grid-2 mb-4" style={{ gridTemplateColumns: "repeat(3, minmax(0, 220px))" }}>
          <div className="crm-stat-card">
            <div className="crm-stat-label">Total Quotation Amount</div>
            <div className="crm-stat-value">₹{totalQuotation.toLocaleString("en-IN")}</div>
          </div>
          <div className="crm-stat-card">
            <div className="crm-stat-label">Closed Won Amount</div>
            <div className="crm-stat-value" style={{ color: "#16A34A" }}>₹{closedWon.toLocaleString("en-IN")}</div>
          </div>
          <div className="crm-stat-card">
            <div className="crm-stat-label">Closed Lost Amount</div>
            <div className="crm-stat-value" style={{ color: "#DC2626" }}>₹{closedLost.toLocaleString("en-IN")}</div>
          </div>
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
