"use client";
import { useState, useMemo } from "react";
import { useDB, isStale, isUrgentNew } from "@/lib/crm-store";
import StageBadge from "@/components/crm/StageBadge";
import LeadDrawer from "@/components/crm/LeadDrawer";
import LeadFormModal from "@/components/crm/LeadFormModal";
import { Plus, Search, Download, AlertCircle, Clock } from "lucide-react";
import { LEAD_STAGES } from "@/lib/crm-types";
import type { LeadSource, LeadStage } from "@/lib/crm-types";

const SOURCES: LeadSource[] = ["Website", "Instagram", "Facebook", "Google Ads", "Referral", "Walk-in", "Hospital Partner", "Other"];

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}
function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}
function fmtDay(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" }).format(new Date(iso));
}

export default function LeadsPage() {
  const db = useDB();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "">("");
  const [filterSource, setFilterSource] = useState<LeadSource | "">("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return db.leads.filter(l => {
      if (q && !l.name.toLowerCase().includes(q) && !l.phone.includes(q)) return false;
      if (filterStage && l.stage !== filterStage) return false;
      if (filterSource && l.source !== filterSource) return false;
      return true;
    });
  }, [db.leads, search, filterStage, filterSource]);

  const exportCSV = () => {
    const headers = ["Name", "Phone", "Date", "Time", "Day", "Service", "Baby Born/Expecting", "Hospital Name", "Birth Stage Status", "Baby Age", "Current Weight", "Address", "Shift Type", "Shift Hours", "Shift Time", "Care Start Date", "Service Days", "Stage", "Owner"].join(",");
    const rows = filtered.map(l => [
      `"${l.name}"`,
      l.phone,
      fmtDate(l.leadDate),
      fmtTime(l.leadDate),
      fmtDay(l.leadDate),
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
      l.careStartDate ?? "",
      l.serviceDays ?? "",
      l.stage,
      l.owner,
    ].join(","));
    const csv = [headers, ...rows].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `cradlewell-leads-${Date.now()}.csv`;
    a.click();
  };

  return (
    <>
      <LeadFormModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Leads</h1>
          <p className="crm-page-subtitle">{filtered.length} of {db.leads.length} leads</p>
        </div>
        <div className="d-flex gap-2">
          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={exportCSV}>
            <Download size={15} /> Export
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
      <div className="crm-table-wrap">
        {filtered.length === 0 ? (
          <div className="crm-empty"><div>No leads match your filters.</div></div>
        ) : (
          <table className="crm-table">
            <thead>
              <tr>
                <th className="sticky-col">Name</th>
                <th>Phone</th>
                <th>Date</th>
                <th>Time</th>
                <th>Day</th>
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
                <th>Care Start</th>
                <th>Days</th>
                <th>Stage</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} onClick={() => setSelectedLead(l.id)}>
                  <td className="sticky-col" style={{ minWidth: 160 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{l.name}</span>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {isUrgentNew(l) && (
                          <span className="crm-badge" style={{ background: "#FEF2F2", color: "#DC2626" }}>
                            <AlertCircle size={10} /> Urgent
                          </span>
                        )}
                        {isStale(l) && (
                          <span className="crm-badge" style={{ background: "#FFFBEB", color: "#B45309" }}>
                            <Clock size={10} /> Stale
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <a href={`tel:${l.phone}`} style={{ color: "var(--crm-primary)", textDecoration: "none", fontSize: "0.875rem" }} onClick={e => e.stopPropagation()}>
                      {l.phone}
                    </a>
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{fmtDate(l.leadDate)}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{fmtTime(l.leadDate)}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{fmtDay(l.leadDate)}</td>
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
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.careStartDate || "—"}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{l.serviceDays ? `${l.serviceDays} days` : "—"}</td>
                  <td><StageBadge stage={l.stage} /></td>
                  <td style={{ fontSize: "0.8rem" }}>{l.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
