"use client";
import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { RefreshCw, MapPin, ChevronRight, ChevronDown } from "lucide-react";
import StageBadge from "@/components/crm/StageBadge";
import LeadDrawer from "@/components/crm/LeadDrawer";
import StaffLocationModal from "@/components/crm/StaffLocationModal";
import { EmptyState } from "@/components/ui/empty-state";
import { useHScroll, HScrollButtons } from "@/components/crm/HScrollControls";
import { fmtKm } from "@/lib/geo-utils";
import type { LeadStage } from "@/lib/crm-types";

interface Nurse { id: string; name: string; km: number; }
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
  const [showStaffLocations, setShowStaffLocations] = useState(false);
  const [staffUnavailable, setStaffUnavailable] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Single open row — one expanded ranking at a time keeps the board readable.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const tableScroll = useHScroll<HTMLDivElement>(rows.length);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/nearby-staff", { cache: "no-store" });
      // A failed request previously fell through to `data.rows ?? []`, rendering
      // the "no leads in these stages" empty state — indistinguishable from a
      // genuinely empty board. Surface the failure instead.
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setRows(data.rows ?? []);
      setStaffUnavailable(!!data.staffUnavailable);
      setLoadError(false);
    } catch {
      setRows([]);
      setLoadError(true);
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
      <StaffLocationModal
        open={showStaffLocations}
        onClose={() => setShowStaffLocations(false)}
        // Distances are derived from staff coordinates, so any roster change
        // has to re-run the server-side ranking rather than patch local rows.
        onChanged={load}
      />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Nearby Staff</h1>
          <p className="crm-page-subtitle">
            {filtered.length} lead{filtered.length === 1 ? "" : "s"} in active stages · nearest care staff by distance
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={load} title="Refresh">
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => setShowStaffLocations(true)}>
            <MapPin size={15} /> Update the location of staff
          </button>
        </div>
      </div>

      {/* Stage filter */}
      <div className="crm-filter-bar">
        <select className="crm-select" style={{ flex: "0 0 auto", width: "auto" }} value={stageFilter} onChange={e => setStageFilter(e.target.value as LeadStage | "")}>
          <option value="">All stages</option>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {staffUnavailable && !loading && (
        <div className="crm-card" style={{ padding: "0.75rem 1rem", marginBottom: "0.75rem", background: "#FFFBEB", borderColor: "#FDE68A" }}>
          <span style={{ fontSize: "0.8rem", color: "#B45309" }}>
            Staff roster unavailable — leads are listed without distances. If this is the first run, create the
            <code style={{ margin: "0 4px" }}>crm_staff</code>
            table using <code>migrations/crm-staff.sql</code>.
          </span>
        </div>
      )}

      <div className="crm-table-wrap" ref={tableScroll.ref}>
        {loading ? (
          <div className="crm-empty" style={{ padding: "2rem" }}>Loading…</div>
        ) : loadError ? (
          <EmptyState
            icon={<MapPin size={40} />}
            title="Could not load the board"
            description="The request failed. Check your connection and try Refresh."
          />
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
              {filtered.map(r => {
                const open = expandedId === r.id;
                const nearest = r.nurses[0];
                return (
                  <Fragment key={r.id}>
                    <tr onClick={() => setSelectedLead(r.id)} style={{ cursor: "pointer" }}>
                      <td className="sticky-col" style={{ minWidth: 150 }}>
                        <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{r.name}</span>
                      </td>
                      <td style={{ fontSize: "0.8rem", maxWidth: 260 }}>
                        {r.address || <span style={{ color: "var(--crm-text-3)" }}>—</span>}
                      </td>
                      <td><StageBadge stage={r.stage} /></td>
                      {/* The row opens the lead drawer, so the disclosure control
                          must not bubble — clicking it should only expand. */}
                      <td style={{ minWidth: 260 }} onClick={e => e.stopPropagation()}>
                        {!r.hasLocation ? (
                          <span style={{ fontSize: "0.78rem", color: "var(--crm-text-3)" }}>No location shared</span>
                        ) : r.nurses.length === 0 ? (
                          <span style={{ fontSize: "0.78rem", color: "var(--crm-text-3)" }}>No staff with location</span>
                        ) : (
                          <button
                            type="button"
                            className="crm-btn crm-btn-ghost crm-btn-sm"
                            onClick={() => setExpandedId(open ? null : r.id)}
                            aria-expanded={open}
                            title={open ? "Hide all staff" : "Show all staff, nearest first"}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%" }}
                          >
                            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span className="crm-badge" style={{ background: "#EEF9F2", color: "#128C7E", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                              {nearest.name} · {fmtKm(nearest.km)}
                            </span>
                            {r.nurses.length > 1 && (
                              <span style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)", whiteSpace: "nowrap" }}>
                                +{r.nurses.length - 1} more
                              </span>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>

                    {open && (
                      <tr>
                        <td colSpan={4} style={{ background: "var(--crm-bg)", padding: "0.75rem 1rem" }}>
                          <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--crm-text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                            All staff by distance from {r.name}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
                            {r.nurses.map((n, i) => (
                              <div
                                key={n.id}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10,
                                  padding: "5px 10px", borderRadius: 6,
                                  background: i === 0 ? "#EEF9F2" : "var(--crm-surface)",
                                  border: "1px solid var(--crm-border)",
                                }}
                              >
                                <span className="crm-tabular" style={{ fontSize: "0.72rem", color: "var(--crm-text-3)", minWidth: 20 }}>
                                  {i + 1}
                                </span>
                                <span style={{ fontSize: "0.82rem", fontWeight: i === 0 ? 600 : 500, flex: 1 }}>
                                  {n.name}
                                </span>
                                <span className="crm-tabular" style={{ fontSize: "0.8rem", color: i === 0 ? "#128C7E" : "var(--crm-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                                  {fmtKm(n.km)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <HScrollButtons ctrl={tableScroll} />
    </>
  );
}
