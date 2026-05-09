"use client";
import { useState, useMemo } from "react";
import { useDB, isStale, isUrgentNew } from "@/lib/crm-store";
import StageBadge from "@/components/crm/StageBadge";
import TempBadge from "@/components/crm/TempBadge";
import LeadDrawer from "@/components/crm/LeadDrawer";
import LeadFormModal from "@/components/crm/LeadFormModal";
import { Plus, Search, Download, Upload, AlertCircle, Clock } from "lucide-react";
import { LEAD_STAGES } from "@/lib/crm-types";
import type { LeadSource, LeadStage } from "@/lib/crm-types";
import { format } from "date-fns";

const SOURCES: LeadSource[] = ["Website", "Instagram", "Facebook", "Google Ads", "Referral", "Walk-in", "Hospital Partner", "Other"];

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
      if (q && !l.name.toLowerCase().includes(q) && !l.phone.includes(q) && !l.id.toLowerCase().includes(q)) return false;
      if (filterStage && l.stage !== filterStage) return false;
      if (filterSource && l.source !== filterSource) return false;
      return true;
    });
  }, [db.leads, search, filterStage, filterSource]);

  const exportCSV = () => {
    const headers = ["ID", "Name", "Phone", "Source", "Stage", "Temperature", "Service", "City", "Owner", "Date"].join(",");
    const rows = filtered.map(l =>
      [l.id, `"${l.name}"`, l.phone, l.source, l.stage, l.temperature, l.serviceRequired, l.city ?? "", l.owner, format(new Date(l.leadDate), "dd/MM/yyyy")].join(",")
    );
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
            placeholder="Search name, phone, ID…"
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
                <th className="sticky-col">Lead</th>
                <th>Phone</th>
                <th>Service</th>
                <th>Baby</th>
                <th>Temperature</th>
                <th>Source</th>
                <th>City</th>
                <th>Owner</th>
                <th>Date</th>
                <th>Closure %</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} onClick={() => setSelectedLead(l.id)}>
                  <td className="sticky-col" style={{ minWidth: 200 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{l.name}</span>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--crm-text-muted)" }}>{l.id}</span>
                        <StageBadge stage={l.stage} />
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
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.875rem" }}>{l.serviceRequired}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.875rem" }}>{l.babyStatus}</td>
                  <td><TempBadge temp={l.temperature} /></td>
                  <td style={{ fontSize: "0.8rem", color: "var(--crm-text-muted)" }}>{l.source}</td>
                  <td style={{ fontSize: "0.8rem" }}>{l.city ?? "—"}</td>
                  <td style={{ fontSize: "0.8rem" }}>{l.owner}</td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--crm-text-muted)" }}>
                    {format(new Date(l.leadDate), "dd MMM")}
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--crm-primary)", fontSize: "0.875rem" }}>
                    {l.closureProbability != null ? `${l.closureProbability}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
