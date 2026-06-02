"use client";
import { useState, useEffect, useMemo } from "react";
import { Filter, RefreshCw } from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  phone?: string;
  location?: string;
  area?: string;
}

interface AssignmentInfo {
  customerId: string;
  customerName: string;
}

interface AvailabilityData {
  staff: StaffMember[];
  assignments: Record<string, Record<string, AssignmentInfo | null>>;
  dates: string[];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
  });
}

export default function StaffAvailabilityPage() {
  const today = todayISO();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [areaFilter, setAreaFilter] = useState("All");
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = (f = from, t = to) => {
    setLoading(true);
    setError(null);
    fetch(`/api/crm/staff-availability?from=${f}&to=${t}`)
      .then(r => { if (!r.ok) throw new Error("Failed to load"); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchData(from, to); }, [from, to]);

  const areas = useMemo(() => {
    if (!data) return ["All"];
    const s = new Set<string>(["All"]);
    for (const staff of data.staff) if (staff.area) s.add(staff.area);
    return Array.from(s);
  }, [data]);

  const filteredStaff = useMemo(() => {
    if (!data) return [];
    return data.staff.filter(s => areaFilter === "All" || s.area === areaFilter);
  }, [data, areaFilter]);

  const isSingleDay = from === to;

  const stats = useMemo(() => {
    if (!data || !isSingleDay) return null;
    let available = 0, assigned = 0;
    for (const s of filteredStaff) {
      if (data.assignments[s.id]?.[from]) assigned++;
      else available++;
    }
    return { total: filteredStaff.length, available, assigned };
  }, [data, filteredStaff, from, isSingleDay]);

  return (
    <>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Staff Availability</h1>
          <p className="crm-page-subtitle">
            {stats
              ? `${stats.total} staff · ${stats.available} available · ${stats.assigned} on assignment`
              : "Check who is free and where"}
          </p>
        </div>
        <button
          className="crm-btn crm-btn-ghost"
          onClick={() => fetchData(from, to)}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={14} style={{ animation: loading ? "crm-spin 0.7s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)", fontWeight: 600 }}>From</label>
          <input
            type="date"
            className="crm-input"
            value={from}
            onChange={e => {
              const v = e.target.value;
              setFrom(v);
              if (v > to) setTo(v);
            }}
            style={{ padding: "5px 10px", fontSize: "0.82rem", width: 148 }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)", fontWeight: 600 }}>To</label>
          <input
            type="date"
            className="crm-input"
            value={to}
            min={from}
            onChange={e => setTo(e.target.value)}
            style={{ padding: "5px 10px", fontSize: "0.82rem", width: 148 }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Filter size={13} color="var(--crm-text-muted)" />
          <select
            className="crm-input"
            value={areaFilter}
            onChange={e => setAreaFilter(e.target.value)}
            style={{ padding: "5px 10px", fontSize: "0.82rem", width: 140 }}
          >
            {areas.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        {!isSingleDay && (
          <button
            className="crm-btn crm-btn-ghost"
            onClick={() => { setFrom(today); setTo(today); }}
            style={{ fontSize: "0.78rem", padding: "5px 12px" }}
          >
            Back to Today
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--crm-text-muted)" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "3px solid var(--crm-border)", borderTopColor: "var(--crm-primary)",
            animation: "crm-spin 0.7s linear infinite",
            margin: "0 auto 12px",
          }} />
          Loading staff availability…
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#DC2626", fontSize: "0.85rem" }}>
          {error}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--crm-text-muted)", fontSize: "0.85rem" }}>
          No staff found. Add staff in the Operations dashboard.
        </div>
      ) : isSingleDay ? (
        <SingleDayView
          staff={filteredStaff}
          assignments={data?.assignments ?? {}}
          date={from}
          today={today}
        />
      ) : (
        <RangeView
          staff={filteredStaff}
          assignments={data?.assignments ?? {}}
          dates={data?.dates ?? []}
          today={today}
        />
      )}
    </>
  );
}

function SingleDayView({
  staff, assignments, date, today,
}: {
  staff: StaffMember[];
  assignments: Record<string, Record<string, AssignmentInfo | null>>;
  date: string;
  today: string;
}) {
  const isToday = date === today;
  const available = staff.filter(s => !assignments[s.id]?.[date]);
  const assigned = staff.filter(s => !!assignments[s.id]?.[date]);

  const headerCols: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "36px 1.8fr 1fr 1fr 1fr auto",
    gap: 12,
    padding: "0 16px 8px",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "var(--crm-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <div>
      {/* Available */}
      <SectionHeader
        color="#16A34A"
        label={`Available ${isToday ? "Today" : `on ${formatDate(date)}`}`}
        count={available.length}
      />
      {available.length === 0 ? (
        <EmptyState text="No staff available for this date" />
      ) : (
        <div style={{ marginBottom: 28 }}>
          <div style={headerCols}>
            <div />
            <div>Name</div>
            <div>Phone</div>
            <div>Location</div>
            <div>Area</div>
            <div>Status</div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {available.map(s => (
              <StaffRow key={s.id} staff={s} assignment={null} />
            ))}
          </div>
        </div>
      )}

      {/* On Assignment */}
      <SectionHeader color="#D97706" label="On Assignment" count={assigned.length} />
      {assigned.length === 0 ? (
        <EmptyState text="No staff currently on assignment" />
      ) : (
        <div>
          <div style={headerCols}>
            <div />
            <div>Name</div>
            <div>Phone</div>
            <div>Location</div>
            <div>Area</div>
            <div>Assigned To</div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {assigned.map(s => (
              <StaffRow key={s.id} staff={s} assignment={assignments[s.id]?.[date] ?? null} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--crm-text)" }}>
        {label}
      </span>
      <span style={{
        fontSize: "0.72rem", fontWeight: 700,
        background: "var(--crm-border)", color: "var(--crm-text-muted)",
        borderRadius: 999, padding: "1px 7px",
      }}>
        {count}
      </span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      padding: "14px 20px", marginBottom: 28,
      background: "var(--crm-surface)", borderRadius: 8,
      border: "1px solid var(--crm-border)",
      fontSize: "0.82rem", color: "var(--crm-text-muted)",
    }}>
      {text}
    </div>
  );
}

function StaffRow({ staff, assignment }: { staff: StaffMember; assignment: AssignmentInfo | null }) {
  const isAvailable = !assignment;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "36px 1.8fr 1fr 1fr 1fr auto",
      alignItems: "center",
      gap: 12,
      padding: "10px 16px",
      background: "var(--crm-surface)",
      borderRadius: 8,
      border: "1px solid var(--crm-border)",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        background: staff.color ?? "var(--crm-primary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.72rem", fontWeight: 700, color: "#fff", flexShrink: 0,
      }}>
        {staff.initials ?? staff.name.slice(0, 2).toUpperCase()}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.83rem", color: "var(--crm-text)" }}>{staff.name}</div>
        <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)" }}>{staff.role}</div>
      </div>
      <div style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)" }}>{staff.phone ?? "—"}</div>
      <div style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)" }}>{staff.location ?? "—"}</div>
      <div style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)" }}>{staff.area ?? "—"}</div>
      <span style={{
        padding: "3px 11px",
        borderRadius: 999,
        fontSize: "0.74rem",
        fontWeight: 600,
        background: isAvailable ? "#DCFCE7" : "#FEF3C7",
        color: isAvailable ? "#15803D" : "#92400E",
        whiteSpace: "nowrap",
      }}>
        {isAvailable ? "Available" : assignment?.customerName ?? "On Assignment"}
      </span>
    </div>
  );
}

function RangeView({
  staff, assignments, dates, today,
}: {
  staff: StaffMember[];
  assignments: Record<string, Record<string, AssignmentInfo | null>>;
  dates: string[];
  today: string;
}) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--crm-border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
        <thead>
          <tr>
            <th style={{
              textAlign: "left", padding: "10px 14px",
              background: "var(--crm-surface)",
              borderBottom: "2px solid var(--crm-border)",
              fontWeight: 700, color: "var(--crm-text-muted)",
              position: "sticky", left: 0, zIndex: 2,
              minWidth: 180,
            }}>
              Staff
            </th>
            {dates.map(d => (
              <th key={d} style={{
                textAlign: "center", padding: "8px 10px",
                background: d === today ? "rgba(95,71,255,0.07)" : "var(--crm-surface)",
                borderBottom: d === today ? "2px solid var(--crm-primary)" : "2px solid var(--crm-border)",
                fontWeight: d === today ? 700 : 600,
                color: d === today ? "var(--crm-primary)" : "var(--crm-text-muted)",
                whiteSpace: "nowrap", minWidth: 100,
              }}>
                {formatDateShort(d)}
                {d === today && <div style={{ fontSize: "0.63rem", letterSpacing: "0.04em" }}>TODAY</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staff.map((s, i) => {
            const rowBg = i % 2 === 0 ? "var(--crm-surface)" : "var(--crm-bg)";
            return (
              <tr key={s.id}>
                <td style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--crm-border)",
                  position: "sticky", left: 0, background: rowBg, zIndex: 1,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: s.color ?? "var(--crm-primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.65rem", fontWeight: 700, color: "#fff", flexShrink: 0,
                    }}>
                      {s.initials ?? s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--crm-text)", lineHeight: 1.3 }}>{s.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--crm-text-muted)" }}>
                        {s.role}{s.area ? ` · ${s.area}` : ""}
                      </div>
                    </div>
                  </div>
                </td>
                {dates.map(d => {
                  const a = assignments[s.id]?.[d];
                  return (
                    <td key={d} style={{
                      textAlign: "center", padding: "8px 6px",
                      borderBottom: "1px solid var(--crm-border)",
                      background: d === today ? "rgba(95,71,255,0.04)" : rowBg,
                    }}>
                      {a ? (
                        <span title={a.customerName} style={{
                          display: "inline-block",
                          padding: "2px 8px", borderRadius: 999,
                          fontSize: "0.7rem", fontWeight: 600,
                          background: "#FEF3C7", color: "#92400E",
                          maxWidth: 88, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                          verticalAlign: "middle",
                        }}>
                          {a.customerName}
                        </span>
                      ) : (
                        <span
                          title="Available"
                          style={{
                            display: "inline-block",
                            width: 10, height: 10, borderRadius: "50%",
                            background: "#86EFAC", verticalAlign: "middle",
                          }}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
