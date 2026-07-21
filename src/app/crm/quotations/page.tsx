"use client";
import { useState, useMemo } from "react";
import { useQuotations, useLeads, useClosures } from "@/lib/crm-store";
import type { Quotation } from "@/lib/crm-types";
import LeadDrawer from "@/components/crm/LeadDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/components/ui/toast";

export default function QuotationsPage() {
  const rawQuotations = useQuotations();
  const leads = useLeads();
  const closures = useClosures();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const quotations = [...rawQuotations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalQuotation = quotations.reduce((s, q) => s + q.quotedPrice, 0);
  const closedWon = closures.filter(c => c.type === "Won").reduce((s, c) => s + (c.finalAmount ?? 0), 0);
  const closedLost = closures.filter(c => c.type === "Lost").reduce((s, c) => s + (c.finalAmount ?? 0), 0);

  // Payment status for a quotation is read from its lead's closure: a Won lead
  // carries the closure's payment status (Paid when closed Won), a Lost lead
  // shows Lost, and anything still open is Pending.
  const paymentStatusFor = (leadId: string): { label: string; bg: string; color: string } => {
    const won = closures.find(c => c.leadId === leadId && c.type === "Won");
    if (won) {
      const st = won.paymentStatus ?? "Paid";
      if (st === "Partial") return { label: "Partial", bg: "#FFFBEB", color: "#B45309" };
      if (st === "Pending") return { label: "Pending", bg: "#FEF2F2", color: "#DC2626" };
      return { label: "Paid", bg: "#F0FDF4", color: "#16A34A" };
    }
    if (closures.some(c => c.leadId === leadId && c.type === "Lost")) {
      return { label: "Lost", bg: "#F1F5F9", color: "#64748B" };
    }
    return { label: "Pending", bg: "#FEF2F2", color: "#DC2626" };
  };

  // ── Export (date range by quotation date), mirrors the Leads tab ────────────
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  const exportRows = useMemo(() => {
    const fromMs = exportFrom ? new Date(`${exportFrom}T00:00:00`).getTime() : -Infinity;
    const toMs = exportTo ? new Date(`${exportTo}T23:59:59.999`).getTime() : Infinity;
    return quotations.filter(q => {
      const t = new Date(q.date).getTime();
      return t >= fromMs && t <= toMs;
    });
  }, [quotations, exportFrom, exportTo]);

  const rangeValid = !exportFrom || !exportTo || exportFrom <= exportTo;

  const exportCSV = (rows: Quotation[]) => {
    const headers = ["Lead", "Phone", "Package", "Shift Hours", "Quoted Price", "Discount", "Final Price", "Payment Status", "Date"].join(",");
    const body = rows.map(q => {
      const lead = leads.find(l => l.id === q.leadId);
      return [
        `"${lead?.name ?? ""}"`,
        lead?.phone ?? "",
        `"${q.package}"`,
        `"${q.shiftHours}"`,
        q.quotedPrice,
        q.discount,
        q.finalPrice,
        paymentStatusFor(q.leadId).label,
        format(new Date(q.date), "dd MMM yyyy"),
      ].join(",");
    });
    const csv = [headers, ...body].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `cradlewell-quotations-${Date.now()}.csv`;
    a.click();
  };

  const runExport = () => {
    exportCSV(exportRows);
    setShowExportDialog(false);
    toast.success(`Exported ${exportRows.length} quotation${exportRows.length === 1 ? "" : "s"}`);
  };

  return (
    <>
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      {/* Export date-range dialog */}
      {showExportDialog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1060, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={() => setShowExportDialog(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
          <div className="crm-card" style={{ position: "relative", width: "min(440px, 100%)", padding: "1.25rem 1.5rem" }}>
            <div className="crm-section-title" style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>Export quotations</div>
            <p style={{ fontSize: "0.8rem", color: "var(--crm-text-muted)", marginBottom: "1rem" }}>
              Pick a date range (by quotation date). Leave a field blank for no limit.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div className="crm-form-group">
                <label className="crm-label">From</label>
                <input type="date" className="crm-input" value={exportFrom} max={exportTo || undefined} onChange={e => setExportFrom(e.target.value)} />
              </div>
              <div className="crm-form-group">
                <label className="crm-label">To</label>
                <input type="date" className="crm-input" value={exportTo} min={exportFrom || undefined} onChange={e => setExportTo(e.target.value)} />
              </div>
            </div>
            <div style={{ fontSize: "0.78rem", color: rangeValid ? "var(--crm-text-muted)" : "#DC2626", marginBottom: "1rem" }}>
              {rangeValid ? `${exportRows.length} quotation${exportRows.length === 1 ? "" : "s"} in range` : "“From” must be on or before “To”."}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => setShowExportDialog(false)}>Cancel</button>
              <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={runExport} disabled={!rangeValid || exportRows.length === 0}>
                <Download size={15} /> Export {exportRows.length}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Quotations</h1>
          <p className="crm-page-subtitle">{quotations.length} quotations</p>
        </div>
        {quotations.length > 0 && (
          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => { setExportFrom(""); setExportTo(""); setShowExportDialog(true); }}>
            <Download size={15} /> Export
          </button>
        )}
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
            { label: "Total Quoted Amount", value: totalQuotation, valueColor: "#0F172A" },
            { label: "Closed Won Amount", value: closedWon, valueColor: "#16A34A" },
            { label: "Closed Lost Amount", value: closedLost, valueColor: "#DC2626" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#fff",
                border: "1px solid rgba(15,23,42,0.06)",
                borderRadius: 14,
                padding: "18px 20px",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#94A3B8",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: s.valueColor,
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  marginTop: 10,
                }}
              >
                ₹{s.value.toLocaleString("en-IN")}
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
                <th>Payment Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => {
                const lead = leads.find(l => l.id === q.leadId);
                const ps = paymentStatusFor(q.leadId);
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
                    <td>
                      <span className="crm-badge" style={{ background: ps.bg, color: ps.color }}>{ps.label}</span>
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
