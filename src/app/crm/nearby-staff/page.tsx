"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
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

const MENU_W = 320;
const MENU_MAX_H = 320;
const PAGE_SIZE = 50;

export default function NearbyStaffPage() {
  const [rows, setRows] = useState<NearbyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<LeadStage | "">("");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showStaffLocations, setShowStaffLocations] = useState(false);
  const [staffUnavailable, setStaffUnavailable] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Open ranking popover, anchored to the button that opened it. Position is
  // captured at click time and the panel is fixed-positioned, so it floats above
  // the table instead of being clipped by its horizontal scroll container.
  const [menu, setMenu] = useState<{ id: string; x: number; y: number; above: boolean } | null>(null);
  const [page, setPage] = useState(1);

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

  // The panel is fixed-positioned against coordinates taken when it opened, so
  // any scroll or resize would leave it detached from its button. Close instead
  // of trying to track the anchor.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    if (menu?.id === id) { setMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    // Flip above the button when there isn't room below, and keep the panel
    // inside the viewport horizontally.
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < MENU_MAX_H + 16 && rect.top > spaceBelow;
    setMenu({
      id,
      x: Math.max(12, Math.min(rect.left, window.innerWidth - MENU_W - 12)),
      y: above ? rect.top - 6 : rect.bottom + 6,
      above,
    });
  };

  const filtered = useMemo(
    () => (stageFilter ? rows.filter(r => r.stage === stageFilter) : rows),
    [rows, stageFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const tableScroll = useHScroll<HTMLDivElement>(paginated.length);

  // Filtering can shrink the list under the current page, and a popover anchored
  // to a row that just scrolled away would hang over unrelated rows.
  useEffect(() => { setPage(1); }, [stageFilter]);
  useEffect(() => { setMenu(null); }, [safePage]);

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
              {paginated.map(r => {
                const open = menu?.id === r.id;
                const nearest = r.nurses[0];
                return (
                    <tr key={r.id} onClick={() => setSelectedLead(r.id)} style={{ cursor: "pointer" }}>
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
                            onClick={e => openMenu(e, r.id)}
                            aria-expanded={open}
                            aria-haspopup="listbox"
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <HScrollButtons ctrl={tableScroll} />

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

      {/* Ranking popover — floats above the table so a long roster scrolls inside
          the panel instead of stretching the row. */}
      {menu && (() => {
        const row = filtered.find(r => r.id === menu.id);
        if (!row) return null;
        return (
          <>
            <div onClick={() => setMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 1070 }} />
            <div
              role="listbox"
              aria-label={`Staff by distance from ${row.name}`}
              style={{
                position: "fixed",
                left: menu.x,
                ...(menu.above ? { bottom: window.innerHeight - menu.y } : { top: menu.y }),
                width: MENU_W,
                maxHeight: MENU_MAX_H,
                zIndex: 1071,
                display: "flex",
                flexDirection: "column",
                background: "var(--crm-surface)",
                border: "1px solid var(--crm-border)",
                borderRadius: "var(--crm-radius)",
                boxShadow: "0 12px 32px rgba(17,17,16,0.16)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--crm-border)", background: "var(--crm-bg)" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--crm-text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Staff by distance
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--crm-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.name}
                </div>
              </div>
              <div style={{ overflowY: "auto", padding: "0.35rem" }}>
                {row.nurses.map((n, i) => (
                  <div
                    key={n.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "6px 8px", borderRadius: 6,
                      background: i === 0 ? "#EEF9F2" : "transparent",
                    }}
                  >
                    <span className="crm-tabular" style={{ fontSize: "0.72rem", color: "var(--crm-text-3)", minWidth: 18 }}>{i + 1}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: i === 0 ? 600 : 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.name}
                    </span>
                    <span className="crm-tabular" style={{ fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap", color: i === 0 ? "#128C7E" : "var(--crm-text-muted)" }}>
                      {fmtKm(n.km)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
}
