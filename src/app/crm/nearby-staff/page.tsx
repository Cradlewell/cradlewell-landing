"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, MapPin } from "lucide-react";
import StageBadge from "@/components/crm/StageBadge";
import LeadDrawer from "@/components/crm/LeadDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { useHScroll, HScrollButtons } from "@/components/crm/HScrollControls";
import { fmtKm } from "@/lib/geo-utils";
import type { LeadStage } from "@/lib/crm-types";

interface Nurse { id: string; name: string; role: string | null; km: number; }
interface NearbyRow {
  id: string;
  name: string;
  address: string | null;
  stage: LeadStage;
  hasLocation: boolean;
  nurses: Nurse[];
}

const STAGES: LeadStage[] = ["Nurse Required", "Due date soon", "Deferred Hot Lead", "Follow-up", "Negotiation"];

export default function NearbyStaffPage() {
  const [rows, setRows] = useState<NearbyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<LeadStage | "">("");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const tableScroll = useHScroll<HTMLDivElement>(rows.length);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/nearby-staff");
      const data = await res.json();
      setRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => (stageFilter ? rows.filter(r => r.stage === stageFilter) : rows),
    [rows, stageFilter]
  );

  return (
    <>
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Nearby Staff</h1>
          <p className="crm-page-subtitle">
            {filtered.length} lead{filtered.length === 1 ? "" : "s"} in active stages · nearest care staff by distance
          </p>
        </div>
        <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={load} title="Refresh">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stage filter */}
      <div className="crm-filter-bar">
        <select className="crm-select" style={{ flex: "0 0 auto", width: "auto" }} value={stageFilter} onChange={e => setStageFilter(e.target.value as LeadStage | "")}>
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="crm-table-wrap" ref={tableScroll.ref}>
        {loading ? (
          <div className="crm-empty" style={{ padding: "2rem" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<MapPin size={40} />}
            title="No leads in these stages"
            description="Leads in Nurse Required, Due date soon, Deferred Hot Lead, Follow-up, or Negotiation will appear here."
          />
        ) : (
          <table className="crm-table">
            <thead>
              <tr>
                <th className="sticky-col">Name</th>
                <th>Address</th>
                <th>Pipeline Stage</th>
                <th>Nearby Staff (distance)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => setSelectedLead(r.id)} style={{ cursor: "pointer" }}>
                  <td className="sticky-col" style={{ minWidth: 150 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{r.name}</span>
                  </td>
                  <td style={{ fontSize: "0.8rem", maxWidth: 260 }}>
                    {r.address || <span style={{ color: "var(--crm-text-3)" }}>—</span>}
                  </td>
                  <td><StageBadge stage={r.stage} /></td>
                  <td style={{ minWidth: 260 }}>
                    {!r.hasLocation ? (
                      <span style={{ fontSize: "0.78rem", color: "var(--crm-text-3)" }}>No location shared</span>
                    ) : r.nurses.length === 0 ? (
                      <span style={{ fontSize: "0.78rem", color: "var(--crm-text-3)" }}>No staff with location</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {r.nurses.map((n, i) => (
                          <span
                            key={n.id}
                            className="crm-badge"
                            title={n.role ?? undefined}
                            style={{
                              background: i === 0 ? "#EEF9F2" : "var(--crm-bg)",
                              color: i === 0 ? "#128C7E" : "var(--crm-text)",
                              fontSize: "0.72rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {n.name} · {fmtKm(n.km)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <HScrollButtons ctrl={tableScroll} />
    </>
  );
}
