"use client";
import { useState, useMemo } from "react";
import { useLeads, api, refreshStore } from "@/lib/crm-store";
import { confirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import StageBadge from "@/components/crm/StageBadge";
import LeadDrawer from "@/components/crm/LeadDrawer";
import LeadFormModal from "@/components/crm/LeadFormModal";
import WhatsAppImportModal from "@/components/crm/WhatsAppImportModal";
import { useHScroll, HScrollButtons } from "@/components/crm/HScrollControls";
import { waStageLabel, waStageTone } from "@/lib/whatsapp-stage";
import { Plus, Search, Download, Trash2, MessageSquare } from "lucide-react";
import { LEAD_STAGES } from "@/lib/crm-types";
import type { Lead, LeadSource, LeadStage } from "@/lib/crm-types";

const WA_STAGE_STYLE: Record<"done" | "stopped" | "neutral", { bg: string; color: string }> = {
  done:    { bg: "#F0FDF4", color: "#16A34A" },
  stopped: { bg: "#FEF2F2", color: "#DC2626" },
  neutral: { bg: "#EEF9F2", color: "#128C7E" },
};

function WhatsAppStageCell({ stage }: { stage?: string }) {
  const label = waStageLabel(stage);
  if (!label) return <span style={{ color: "var(--crm-text-3)" }}>—</span>;
  const s = WA_STAGE_STYLE[waStageTone(stage)];
  return (
    <span className="crm-badge" style={{ background: s.bg, color: s.color, fontSize: "0.72rem", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

const SOURCES: LeadSource[] = ["Website", "WhatsApp", "Aria Chat", "Instagram", "Facebook", "Google Ads", "Referral", "Walk-in", "Hospital Partner", "Other"];

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}
function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}
function fmtDay(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" }).format(new Date(iso));
}
function fmtCareDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

const PAGE_SIZE = 50;

export default function LeadsPage() {
  const leads = useLeads();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [showWAImport, setShowWAImport] = useState(false);
  const [page, setPage] = useState(1);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    const ok = await confirm({
      title: `Delete "${name}"?`,
      body: "All related follow-ups, quotations, and activity will be permanently removed.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (ok) { api.deleteLead(id); toast.success(`"${name}" deleted`); }
  };
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "">("");
  const [filterSource, setFilterSource] = useState<LeadSource | "">("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter(l => {
      if (q && !l.name.toLowerCase().includes(q) && !l.phone.includes(q)) return false;
      if (filterStage && l.stage !== filterStage) return false;
      if (filterSource && l.source !== filterSource) return false;
      return true;
    });
  }, [leads, search, filterStage, filterSource]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const tableScroll = useHScroll<HTMLDivElement>(paginated.length);

  // Reset to page 1 when filters change
  useMemo(() => { setPage(1); }, [search, filterStage, filterSource]);

  // Leads within the chosen export date range (by lead date). A blank bound
  // means "no limit" on that side. Also respects the active search/stage filters.
  const exportRows = useMemo(() => {
    const fromMs = exportFrom ? new Date(`${exportFrom}T00:00:00`).getTime() : -Infinity;
    const toMs = exportTo ? new Date(`${exportTo}T23:59:59.999`).getTime() : Infinity;
    return filtered.filter(l => {
      const t = new Date(l.leadDate).getTime();
      return t >= fromMs && t <= toMs;
    });
  }, [filtered, exportFrom, exportTo]);

  const rangeValid = !exportFrom || !exportTo || exportFrom <= exportTo;

  const runExport = () => {
    exportCSV(exportRows);
    setShowExportDialog(false);
    toast.success(`Exported ${exportRows.length} lead${exportRows.length === 1 ? "" : "s"}`);
  };

  const exportCSV = (rows: Lead[]) => {
    const headers = ["Name", "Phone", "Date", "Time", "Day", "Source", "WhatsApp Stage", "Service", "Baby Born/Expecting", "Hospital Name", "Birth Stage Status", "Baby Age", "Current Weight", "Address", "Shift Type", "Shift Hours", "Shift Time", "Care Start Date", "Service Days", "Stage"].join(",");
    const body = rows.map(l => [
      `"${l.name}"`,
      l.phone,
      fmtDate(l.leadDate),
      fmtTime(l.leadDate),
      fmtDay(l.leadDate),
      l.source ?? "",
      waStageLabel(l.whatsappStage),
      l.serviceRequired ?? "",
      l.babyStatus ?? "",
      l.hospitalName ?? "",
      l.babyBirthStageStatus ?? "",
      l.babyAge ?? "",
      l.currentWeight ?? "",
      `"${l.address ?? ""}"`,
      l.preferredShift ?? "",
      l.shiftHoursCount ?? "",
      l.shiftTime ?? "",
      fmtCareDate(l.careStartDate),
      l.serviceDays ?? "",
      l.stage,
    ].join(","));
    const csv = [headers, ...body].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `cradlewell-leads-${Date.now()}.csv`;
    a.click();
  };

  return (
    <>
      <LeadFormModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <WhatsAppImportModal
        open={showWAImport}
        onClose={() => setShowWAImport(false)}
        onImported={() => refreshStore()}
      />
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      {/* Export date-range dialog */}
      {showExportDialog && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1060, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={() => setShowExportDialog(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} />
          <div className="crm-card" style={{ position: "relative", width: "min(440px, 100%)", padding: "1.25rem 1.5rem" }}>
            <div className="crm-section-title" style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>Export leads</div>
            <p style={{ fontSize: "0.8rem", color: "var(--crm-text-muted)", marginBottom: "1rem" }}>
              Pick a date range (by lead date). Leave a field blank for no limit. Current search / stage / source filters still apply.
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
              {rangeValid ? `${exportRows.length} lead${exportRows.length === 1 ? "" : "s"} in range` : "“From” must be on or before “To”."}
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
          <h1 className="crm-page-title">Leads</h1>
          <p className="crm-page-subtitle">{filtered.length} of {leads.length} leads</p>
        </div>
        <div className="d-flex gap-2">
          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => { setExportFrom(""); setExportTo(""); setShowExportDialog(true); }}>
            <Download size={15} /> Export
          </button>
          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => setShowWAImport(true)}>
            <MessageSquare size={15} style={{ color: "#25D366" }} /> Import WhatsApp
          </button>
          <button className="crm-btn crm-btn-primary" onClick={() => setShowNewLead(true)}>
            <Plus size={16} /> New Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="crm-filter-bar">
        <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--crm-text-muted)" }} />
          <input
            className="crm-input"
            style={{ paddingLeft: 32 }}
            placeholder="Search name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="crm-select" style={{ flex: "0 0 auto", width: "auto" }} value={filterStage} onChange={e => setFilterStage(e.target.value as LeadStage | "")}>
          <option value="">All Stages</option>
          {LEAD_STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="crm-select" style={{ flex: "0 0 auto", width: "auto" }} value={filterSource} onChange={e => setFilterSource(e.target.value as LeadSource | "")}>
          <option value="">All Sources</option>
          {SOURCES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="crm-table-wrap" ref={tableScroll.ref}>
        {filtered.length === 0 ? (
          <EmptyState
            title={leads.length === 0 ? "No leads yet" : "No leads match your filters"}
            description={leads.length === 0 ? "Add your first lead to get started." : "Try clearing your search or filter."}
            action={leads.length === 0 ? { label: "Add lead", onClick: () => setShowNewLead(true) } : undefined}
          />
        ) : (
          <table className="crm-table">
            <thead>
              <tr>
                <th className="sticky-col">Name</th>
                <th>Phone</th>
                <th>Date</th>
                <th>Time</th>
                <th>Day</th>
                <th>Source</th>
                <th>WhatsApp Stage</th>
                <th>Service</th>
                <th>Baby Status</th>
                <th>Hospital</th>
                <th>Birth Stage</th>
                <th>Baby Age</th>
                <th>Weight</th>
                <th>Address</th>
                <th>Shift Type</th>
                <th>Shift Hours</th>
                <th>Shift Time</th>
                <th>Care Start Date</th>
                <th>Days</th>
                <th>Stage</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(l => (
                <tr key={l.id} onClick={() => setSelectedLead(l.id)}>
                  <td className="sticky-col" style={{ minWidth: 160 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{l.name}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }} className="crm-tabular">
                    <a href={`tel:${l.phone}`} style={{ color: "var(--crm-primary)", textDecoration: "none", fontSize: "0.875rem" }} onClick={e => e.stopPropagation()}>
                      {l.phone}
                    </a>
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }} className="crm-tabular">{fmtDate(l.leadDate)}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }} className="crm-tabular">{fmtTime(l.leadDate)}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{fmtDay(l.leadDate)}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.source || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}><WhatsAppStageCell stage={l.whatsappStage} /></td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.875rem" }}>{l.serviceRequired || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.babyStatus || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.hospitalName || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.babyBirthStageStatus || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.babyAge || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.currentWeight || "—"}</td>
                  <td style={{ fontSize: "0.8rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.address ?? ""}>{l.address || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.preferredShift || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.shiftHoursCount ? `${l.shiftHoursCount} hrs` : "—"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.shiftTime || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }} className="crm-tabular">{fmtCareDate(l.careStartDate)}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }} className="crm-tabular">{l.serviceDays ? `${l.serviceDays} days` : "—"}</td>
                  <td><StageBadge stage={l.stage} /></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      onClick={e => handleDelete(e, l.id, l.name)}
                      className="crm-icon-btn danger"
                      style={{ width: 28, height: 28 }}
                      title="Delete lead"
                      aria-label={`Delete ${l.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Horizontal scroll controls */}
      <HScrollButtons ctrl={tableScroll} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 0" }}>
          <button
            className="crm-btn crm-btn-ghost crm-btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
            .reduce<(number | "…")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} style={{ color: "var(--crm-text-muted)", padding: "0 4px" }}>…</span>
              ) : (
                <button
                  key={p}
                  className="crm-btn crm-btn-sm"
                  style={p === safePage ? { background: "var(--crm-primary)", color: "#fff", borderColor: "var(--crm-primary)" } : { background: "none" }}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </button>
              )
            )}
          <button
            className="crm-btn crm-btn-ghost crm-btn-sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            Next →
          </button>
          <span style={{ color: "var(--crm-text-muted)", fontSize: "0.8rem", marginLeft: 8 }}>
            Page {safePage} of {totalPages} · {filtered.length} total
          </span>
        </div>
      )}
    </>
  );
}
