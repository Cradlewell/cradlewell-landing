"use client";
import { useState } from "react";
import { useDB } from "@/lib/crm-store";
import LeadDrawer from "@/components/crm/LeadDrawer";
import { FileText } from "lucide-react";
import { format } from "date-fns";

export default function QuotationsPage() {
  const db = useDB();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const quotations = [...db.quotations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalRevenue = quotations.reduce((s, q) => s + q.finalPrice, 0);

  return (
    <>
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Quotations</h1>
          <p className="crm-page-subtitle">{quotations.length} quotations · Pipeline ₹{totalRevenue.toLocaleString("en-IN")}</p>
        </div>
      </div>

      {quotations.length === 0 ? (
        <div className="crm-card"><div className="crm-empty"><FileText size={40} className="crm-empty-icon" /><div>No quotations yet. Add one from a lead drawer.</div></div></div>
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
                <th>Final Price</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => {
                const lead = db.leads.find(l => l.id === q.leadId);
                return (
                  <tr key={q.id} onClick={() => lead && setSelectedLead(lead.id)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{lead?.name ?? "—"}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)" }}>{q.leadId}</div>
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
