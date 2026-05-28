import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { haversineKm, fmtKm as fmtKmLib } from "@/lib/geo-utils";

const OpsMap = dynamic(() => import("./OpsMap"), { ssr: false, loading: () => <div style={{ height: 320, borderRadius: 12, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", color: "#94a3b8", fontSize: 13 }}>Loading map…</div> });

// ─── Types (as JSDoc) ──────────────────────────────────────────────────────────

const PALETTE = [
  "#5F47FF", "#5F47FF", "#22c55e", "#f59e0b", "#a855f7",
  "#ec4899", "#06b6d4", "#f43f5e", "#84cc16", "#eab308",
];


const ZONE_ORDER = ["Central", "North", "East", "South", "West"];

const ZONE_COLORS = {
  Central: "#5F47FF",
  North:   "#22c55e",
  East:    "#f59e0b",
  South:   "#06b6d4",
  West:    "#ec4899",
};

const ZONE_AREAS = {
  Central: ["Central Bangalore", "MG Road", "Brigade Road", "Cunningham Road", "Lavelle Road", "Richmond Road", "Shivajinagar", "Vasanth Nagar", "Seshadripuram", "Gandhinagar", "Rajbhavan Road", "Jayamahal", "Ulsoor", "Cleveland Town", "Fraser Town", "Benson Town", "Cox Town", "Murphy Town", "Lingarajapuram"],
  North:   ["Hebbal", "Yelahanka", "Jakkur", "Thanisandra", "Nagawara", "Manyata Tech Park", "Hennur", "HBR Layout", "Banaswadi", "Kalyan Nagar", "Kammanahalli", "RT Nagar", "Sahakara Nagar", "Sanjay Nagar", "Vidyaranyapura", "Kodigehalli", "Jalahalli", "Peenya", "Abbigere", "Dasarahalli", "Yeshwanthpur", "Mathikere", "Nagasandra", "Bagaluru", "Kattigenahalli", "Byrathi", "Hegde Nagar", "Virupakshapura", "RMV Extension", "Devanahalli", "Kempegowda"],
  East:    ["Whitefield", "Kadugodi", "Hoodi", "Mahadevapura", "KR Puram", "Ramamurthi Nagar", "Dooravani Nagar", "Kaggadasapura", "CV Raman Nagar", "Vibhutipura", "Marathahalli", "Bellandur", "Doddanekundi", "Brookefield", "Varthur", "Panathur", "Balagere", "Bhoganahalli", "Kadubeesanahalli", "Indiranagar", "Domlur", "HAL", "Old Airport Road", "New Tippasandra", "Kasturi Nagar", "ITPL", "Sarjapur Road", "Choodasandra", "Kodathi", "Kasavanahalli", "Carmelaram", "Hadosiddapura"],
  South:   ["Jayanagar", "JP Nagar", "BTM Layout", "HSR Layout", "Koramangala", "Bannerghatta", "Basavanagudi", "Kumaraswamy Layout", "Uttarahalli", "Banashankari", "Konanakunte", "Kanakapura Road", "Subramanyapura", "Padmanabhanagar", "Bilekahalli", "Arakere", "Gottigere", "Kalena Agrahara", "Hulimavu", "Begur", "Bommanahalli", "Hongasandra", "Kudlu", "Parappana Agrahara", "Singasandra", "Electronic City", "Chandapura", "Hosur Road", "Adugodi", "Neelasandra", "Shanti Nagar", "Mavalli", "Bikasipura", "Hosakerehalli", "Sarjapur"],
  West:    ["Vijayanagar", "Rajajinagar", "Basaveshwara Nagar", "Nagarabhavi", "RR Nagar", "Kengeri", "Mysuru Road", "Magadi Road", "Chandra Layout", "Mahalakshmi Layout", "Nandini Layout", "Kamakshipalya", "Annapurneshwari Nagar", "Nagdevanahalli", "Binnipete", "Raja Rajeshwari Nagar", "Sunkadakatte", "Peenya Industrial"],
};

const TRIP_TYPES = ["Client Visit", "Hospital Pickup", "Training", "Other"];
const TRANSPORT_MODES = ["Two-Wheeler", "Auto Rickshaw", "Cab (Ola/Uber)", "Bus", "Metro", "Own Car"];
const MODE_RATE = {
  "Two-Wheeler": { perKm: 4 },
  "Auto Rickshaw": { perKm: 12 },
  "Cab (Ola/Uber)": { perKm: 14 },
  "Bus": { perKm: 0, flat: 15 },
  "Metro": { perKm: 0, flat: 20 },
  "Own Car": { perKm: 6 },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmtKm = fmtKmLib;

function displayName(name) {
  return name.replace(/\s+Family\s*$/i, "").trim();
}

function cardStatus(c) {
  const paused = /paus|break/i.test(c.badge) || c.status === "idle";
  if (paused) return { label: "Paused", color: "#f59e0b" };
  if (c.staff.length === 0) return { label: "Attention", color: "#ef4444" };
  return { label: "Active", color: "#22c55e" };
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysISO(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtLongDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function formatDateDMY(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function suggestAmount(mode, distance) {
  const r = MODE_RATE[mode];
  if (r.flat !== undefined) return r.flat;
  return Math.round(r.perKm * distance);
}

function fyOfDate(iso) {
  const [y, m] = iso.split("-").map(Number);
  const startY = m >= 4 ? y : y - 1;
  return `${startY}-${startY + 1}`;
}

function monthsOfFy(fy) {
  const startY = Number(fy.split("-")[0]);
  const out = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(startY, 3 + i, 1);
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
    });
  }
  return out;
}

function buildRota(c, roster) {
  if (!c.packageDays || !c.startDate) return [];
  const pool = c.staff;
  const time = c.shiftTime ?? "8am - 6pm";
  const pausedSet = new Set(c.pausedDates ?? []);
  const leaveSet = new Set(c.leaveDates ?? []);
  const out = [];
  let workIdx = 0, consumed = 0, offset = 0;
  const cap = c.packageDays + 120;
  while (consumed < c.packageDays && offset < cap) {
    const date = addDaysISO(c.startDate, offset);
    const wouldBe = pool.length > 0 ? pool[workIdx % pool.length] : null;
    const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
    const sundayOverrideId = c.rota?.[date];
    if (leaveSet.has(date)) {
      out.push({ date, time, staff: null, paused: false, leave: true, weeklyOff: false, wouldBe });
    } else if (pausedSet.has(date)) {
      out.push({ date, time, staff: null, paused: true, leave: false, weeklyOff: false, wouldBe });
    } else if (isSunday && !sundayOverrideId) {
      out.push({ date, time, staff: null, paused: false, leave: false, weeklyOff: true, wouldBe });
      consumed++;
    } else {
      const overrideId = c.rota?.[date];
      const override = overrideId ? roster.find(s => s.id === overrideId) ?? null : null;
      out.push({ date, time, staff: override ?? wouldBe, paused: false, leave: false, weeklyOff: false, wouldBe });
      workIdx++;
      consumed++;
    }
    offset++;
  }
  return out;
}

// Triggers a re-render when the calendar date changes (midnight rollover).
// 1-minute polling is enough — "today" only changes once per day.
function useClientNow() {
  const [today, setToday] = useState(null);
  useEffect(() => {
    setToday(todayISO());
    const i = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(i);
  }, []);
  return today;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ s, size = 28, ring }) {
  return (
    <div title={`${s.name} · ${s.role}`}
      style={{
        width: size, height: size, backgroundColor: s.color, fontSize: size * 0.42,
        borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 600, flexShrink: 0,
        boxShadow: ring ? "0 0 0 2px #ffffff, 0 1px 2px rgba(15,17,21,0.08)" : undefined,
      }}>
      {s.initials}
    </div>
  );
}

function StatTile({ value, label, accent, icon }) {
  const isAccent = !!accent;
  return (
    <div style={{
      background: "#FFFFFF",
      border: `1px solid ${isAccent ? "rgba(229,72,77,0.18)" : "rgba(0,0,0,0.07)"}`,
      borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 1px 3px rgba(17,17,16,0.04)",
      minWidth: 144,
    }}>
      {icon && (
        <div style={{
          width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: isAccent ? "rgba(229,72,77,0.08)" : "rgba(95,71,255,0.07)", flexShrink: 0,
          color: isAccent ? "#E5484D" : "#5F47FF",
        }}>{icon}</div>
      )}
      <div>
        <div className="ops-stat-value" style={{ fontSize: 21, fontWeight: 700, color: isAccent ? "#E5484D" : "#111110", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, marginTop: 5, fontWeight: 500, color: isAccent ? "#E5484D" : "#9E9E9C", letterSpacing: "0.01em" }}>{label}</div>
      </div>
    </div>
  );
}

function CustomerCard({ c, selected, onSelect }) {
  const cs = cardStatus(c);
  return (
    <button onClick={onSelect} className="ops-customer-card" style={{
      position: "relative", textAlign: "left", display: "flex", overflow: "hidden",
      borderRadius: 14, minHeight: 126, cursor: "pointer",
      background: selected ? "#FDFCFF" : "#FFFFFF",
      border: selected ? "1.5px solid #5F47FF" : "1px solid rgba(0,0,0,0.08)",
      boxShadow: selected
        ? "0 0 0 3px rgba(95,71,255,0.10), 0 4px 16px rgba(95,71,255,0.08)"
        : "0 1px 3px rgba(17,17,16,0.04)",
      fontFamily: "inherit",
    }}>
      <div style={{ width: 4, flexShrink: 0, backgroundColor: cs.color }} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "16px" }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: selected ? "#5F47FF" : "#111110", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {displayName(c.name)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
            <svg width="8" height="8" viewBox="0 0 10 13" fill="#C0C0BE"><path d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 8 5 8s5-4.25 5-8c0-2.76-2.24-5-5-5zm0 6.8A1.8 1.8 0 1 1 5 3.2a1.8 1.8 0 0 1 0 3.6z" /></svg>
            <span style={{ fontSize: 11, fontWeight: 400, color: "#A8A8A6" }}>{c.area}</span>
          </div>
          {c.badge && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 500, padding: "2px 10px", borderRadius: 999, backgroundColor: "#f1f5f9", color: "#64748b", border: "1px solid #e8edf2", display: "inline-block" }}>
                {c.badge}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", marginLeft: 6 }}>
            {c.staff.length === 0
              ? <span style={{ fontSize: 10, fontWeight: 500, color: "#c8d3df" }}>No staff</span>
              : c.staff.slice(0, 3).map((s, i) => (
                <div key={s.id} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                  <Avatar s={s} size={24} ring />
                </div>
              ))
            }
            {c.staff.length > 3 && (
              <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "#f1f5f9", color: "#64748b", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginLeft: -6, boxShadow: "0 0 0 2px #fff" }}>
                +{c.staff.length - 3}
              </div>
            )}
          </div>
          <span style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 999,
            backgroundColor: `${cs.color}15`, color: cs.color, border: `1px solid ${cs.color}30`, flexShrink: 0,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: cs.color, flexShrink: 0 }} />
            {cs.label}
          </span>
        </div>
      </div>
    </button>
  );
}

function ZoneSection({ zone, customers, selectedId, onSelect }) {
  if (customers.length === 0) return null;
  const zoneColor = ZONE_COLORS[zone];
  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: zoneColor, flexShrink: 0 }} />
        <h2 style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B6B6A", margin: 0 }}>{zone}</h2>
        <div style={{ flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.07)" }} />
        <span style={{ fontSize: 10.5, fontWeight: 500, padding: "3px 10px", borderRadius: 999, backgroundColor: `${zoneColor}10`, color: zoneColor, border: `1px solid ${zoneColor}22` }}>
          {customers.length}
        </span>
      </div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {customers.map(c => (
          <CustomerCard key={c.id} c={c} selected={selectedId === c.id} onSelect={() => onSelect(c.id)} />
        ))}
      </div>
    </section>
  );
}

// ─── Detail Dialog ─────────────────────────────────────────────────────────────

function DetailDialog({ customer, onClose, onAddStaff, onRemoveStaff, onSetRotaDay, onCreateRota, onClearRota, allStaff, assignedElsewhereIds, onTogglePauseDay, onToggleLeaveDay, onExtendRota, onDeleteCustomer, conflictMap }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [editDay, setEditDay] = useState(null);
  const editDayRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const todayRowRef = useRef(null);
  const [newPackage, setNewPackage] = useState(() => String(customer?.serviceDays ?? "30"));
  const [newStart, setNewStart] = useState(() => customer?.careStartDate ?? todayISO());
  const [newShift, setNewShift] = useState(() => customer?.shiftTime ?? "8am - 6pm");

  useEffect(() => {
    setNewPackage(String(customer?.serviceDays ?? "30"));
    setNewStart(customer?.careStartDate ?? todayISO());
    setNewShift(customer?.shiftTime ?? "8am - 6pm");
  }, [customer?.id]);

  useEffect(() => {
    if (todayRowRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const row = todayRowRef.current;
      const offset = row.offsetTop - container.clientHeight / 2 + row.clientHeight / 2;
      container.scrollTop = Math.max(0, offset);
    }
  }, [customer?.id]);
  const [pendingChange, setPendingChange] = useState(null);
  const [reasonText, setReasonText] = useState("");
  const [extendDays, setExtendDays] = useState("7");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!editDay) return;
    const handler = (e) => {
      if (editDayRef.current && !editDayRef.current.contains(e.target)) setEditDay(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editDay]);

  if (!customer) return null;

  const assignedIds = new Set(customer.staff.map(s => s.id));
  const hasCustomerCoords = customer.homeLat != null && customer.homeLng != null;
  const available = allStaff
    .filter(s => !assignedIds.has(s.id) && (s.role === "Nurse" || !assignedElsewhereIds.has(s.id)))
    .map(s => ({
      ...s,
      distKm: (hasCustomerCoords && s.home_lat != null && s.home_lng != null)
        ? haversineKm(customer.homeLat, customer.homeLng, s.home_lat, s.home_lng)
        : null,
    }))
    .sort((a, b) => {
      if (a.distKm == null && b.distKm == null) return 0;
      if (a.distKm == null) return 1;
      if (b.distKm == null) return -1;
      return a.distKm - b.distKm;
    });
  const rotaPickList = allStaff.filter(s => !assignedElsewhereIds.has(s.id));
  const rota = buildRota(customer, allStaff);
  const today = todayISO();
  const hasRota = !!(customer.packageDays && customer.startDate);

  const downloadRota = () => {
    if (!hasRota) return;
    const rows = [["Day", "Date", "Time", "Caregiver", "Reason"]];
    rota.forEach((r, idx) => {
      rows.push([String(idx + 1), r.date, r.time,
      r.paused ? "— Paused —" : r.leave ? "— Leave —" : r.staff?.name ?? "Unassigned",
      customer.rotaReasons?.[r.date] ?? ""]);
    });
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rota-${displayName(customer.name).replace(/\s+/g, "-")}-${customer.startDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const inp = { backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0f1115", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(15,17,21,0.32)", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 880, maxHeight: "92vh", overflowY: "auto", padding: 28, borderRadius: 16, backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 20px 60px rgba(17,17,16,0.14), 0 0 0 1px rgba(0,0,0,0.04)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", padding: "4px 10px", borderRadius: 999, backgroundColor: `${ZONE_COLORS[customer.zone]}14`, color: ZONE_COLORS[customer.zone] }}>{customer.zone}</span>
              {(() => {
                const cs = cardStatus(customer); return (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 999, backgroundColor: `${cs.color}12`, color: cs.color }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: cs.color }} />{cs.label}
                  </span>
                );
              })()}
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0f1115", letterSpacing: "-0.02em", margin: 0 }}>{displayName(customer.name)}</h3>
            <div style={{ fontSize: 12, color: "#7a7a86", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="9" height="9" viewBox="0 0 10 13" fill="#c8d3df"><path d="M5 0C2.24 0 0 2.24 0 5c0 3.75 5 8 5 8s5-4.25 5-8c0-2.76-2.24-5-5-5zm0 6.8A1.8 1.8 0 1 1 5 3.2a1.8 1.8 0 0 1 0 3.6z" /></svg>
              {customer.area}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(customer.homeLat != null || allStaff.some(s => s.home_lat != null)) && (
              <button onClick={() => setMapOpen(v => !v)} title="Toggle map view"
                style={{ height: 32, padding: "0 12px", borderRadius: 8, border: `1px solid ${mapOpen ? "#5F47FF" : "rgba(0,0,0,0.1)"}`, background: mapOpen ? "#5F47FF" : "#fff", cursor: "pointer", color: mapOpen ? "#fff" : "#5F47FF", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4l4-2 6 2 4-2v10l-4 2-6-2-4 2V4z" /><path d="M5 2v10M11 4v10" /></svg>
                Map
              </button>
            )}
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 1l12 12M13 1L1 13" /></svg>
            </button>
          </div>
        </div>

        {/* Info strip */}
        <div style={{ borderRadius: 10, padding: 16, marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, backgroundColor: "#F9F8F6", border: "1px solid rgba(0,0,0,0.07)" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, color: "#94a3b8" }}>Phone</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f1115" }}>
              {customer.phone ? <a href={`tel:${customer.phone}`} style={{ color: "#5F47FF", textDecoration: "none" }}>{customer.phone}</a> : "—"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, color: "#94a3b8" }}>Location</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f1115" }}>{customer.area || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, color: "#94a3b8" }}>Service</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f1115" }}>{customer.serviceRequired || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, color: "#94a3b8" }}>Shift Type</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f1115" }}>{customer.preferredShift ? `${customer.preferredShift} · ${customer.shiftHoursCount ?? ""}hrs`.trim() : "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, color: "#94a3b8" }}>Shift Time</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f1115" }}>{customer.shiftTime ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, color: "#94a3b8" }}>Package</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f1115" }}>{customer.badge}</div>
          </div>
        </div>

        {/* Map view */}
        {mapOpen && (
          <div style={{ marginBottom: 20 }}>
            <OpsMap customer={customer} allStaff={allStaff} />
          </div>
        )}

        {/* Staff section */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7a7a86" }}>Assigned Staff ({customer.staff.length})</span>
          <button onClick={() => setPickerOpen(v => !v)} style={{ fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 6, backgroundColor: "#5F47FF", color: "#fff", border: "none", cursor: "pointer" }}>
            {pickerOpen ? "Cancel" : "+ Add Staff"}
          </button>
        </div>

        {/* Auto-suggest: top 3 nearest available staff */}
        {hasCustomerCoords && available.filter(s => s.distKm != null).length > 0 && customer.staff.length === 0 && (
          <div style={{ borderRadius: 10, marginBottom: 12, padding: 12, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#16a34a", marginBottom: 8 }}>Nearest Available</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {available.filter(s => s.distKm != null).slice(0, 3).map(s => (
                <button key={s.id} onClick={() => { onAddStaff(customer.id, s.id); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, border: "1px solid #bbf7d0", background: "#fff", cursor: "pointer", textAlign: "left" }}>
                  <Avatar s={s} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f1115" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#7a7a86" }}>{s.role}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.distKm <= 5 ? "#16a34a" : s.distKm <= 12 ? "#d97706" : "#dc2626", background: s.distKm <= 5 ? "#f0fdf4" : s.distKm <= 12 ? "#fffbeb" : "#fef2f2", borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}>
                    {fmtKm(s.distKm)}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a" }}>Assign</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {pickerOpen && (
          <div style={{ borderRadius: 10, marginBottom: 12, padding: 8, maxHeight: 220, overflowY: "auto", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
            {available.length === 0 && <div style={{ fontSize: 11, textAlign: "center", padding: 12, color: "#7a7a86" }}>All caregivers already assigned</div>}
            {available.map(s => (
              <button key={s.id} onClick={() => { onAddStaff(customer.id, s.id); setPickerOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}>
                <Avatar s={s} size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#0f1115" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "#7a7a86" }}>{s.role}</div>
                </div>
                {s.distKm != null && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.distKm <= 5 ? "#16a34a" : s.distKm <= 12 ? "#d97706" : "#dc2626", background: s.distKm <= 5 ? "#f0fdf4" : s.distKm <= 12 ? "#fffbeb" : "#fef2f2", borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap" }}>
                    {fmtKm(s.distKm)}
                  </span>
                )}
                <span style={{ color: "#22c55e", fontSize: 16 }}>+</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {customer.staff.length === 0 && (
            <div style={{ fontSize: 12, padding: 12, textAlign: "center", borderRadius: 10, color: "#7a7a86", border: "1px dashed #e2e8f0" }}>No staff assigned yet</div>
          )}
          {customer.staff.map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 10, padding: 10, backgroundColor: "#fff", border: "1px solid #e2e8f0" }}>
              <Avatar s={s} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#0f1115" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "#7a7a86" }}>{s.role}</div>
              </div>
              <button onClick={() => onRemoveStaff(customer.id, s.id)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11" /></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Rota section */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7a7a86" }}>
              Rota Schedule{hasRota ? ` · ${customer.packageDays}-day package` : ""}
            </span>
            {hasRota && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={downloadRota} style={{ fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 6, backgroundColor: "#5F47FF", color: "#fff", border: "none", cursor: "pointer" }}>↓ Download CSV</button>
                <button onClick={() => onClearRota(customer.id)} style={{ fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 6, backgroundColor: "transparent", color: "#ef4444", border: "1px solid #ef444466", cursor: "pointer" }}>Reset Rota</button>
              </div>
            )}
          </div>

          {hasRota && (
            <div style={{ borderRadius: 10, padding: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0f1115" }}>Extend rota</span>
              <span style={{ fontSize: 11, color: "#7a7a86" }}>Add more days</span>
              <input type="number" min={1} value={extendDays} onChange={e => setExtendDays(e.target.value)} style={{ ...inp, width: 80, marginLeft: "auto" }} />
              <span style={{ fontSize: 11, color: "#7a7a86" }}>days</span>
              <button onClick={() => { const n = Math.max(1, Math.floor(Number(extendDays) || 0)); if (n >= 1) onExtendRota(customer.id, n); }}
                style={{ fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, backgroundColor: "#22c55e", color: "#fff", border: "none", cursor: "pointer" }}>
                + Extend
              </button>
            </div>
          )}

          {!hasRota && (
            <div style={{ borderRadius: 10, padding: 12, backgroundColor: "#fff", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 11, color: "#7a7a86", margin: 0 }}>No rota set. Configure a package to generate a day-by-day schedule.</p>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, color: "#7a7a86" }}>Package length (days)</div>
                <input type="number" min={1} value={newPackage} onChange={e => setNewPackage(e.target.value)} placeholder="e.g. 30" style={inp} />
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, color: "#7a7a86" }}>Start date</div>
                <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} style={inp} />
              </div>
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, color: "#7a7a86" }}>Shift time</div>
                <input type="text" value={newShift} onChange={e => setNewShift(e.target.value)} placeholder="e.g. 10:00 AM - 6:00 PM" style={inp} />
              </div>
              <button onClick={() => { const n = Math.max(1, Math.floor(Number(newPackage) || 0)); if (n >= 1) onCreateRota(customer.id, n, newStart, newShift); }}
                disabled={customer.staff.length === 0 || !(Number(newPackage) >= 1)}
                style={{ fontSize: 12, fontWeight: 600, padding: "8px", borderRadius: 8, backgroundColor: "#5F47FF", color: "#fff", border: "none", cursor: "pointer", opacity: (customer.staff.length === 0) ? 0.5 : 1 }}>
                {customer.staff.length === 0 ? "Assign staff first" : "Create Rota"}
              </button>
            </div>
          )}

          {hasRota && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, fontSize: 11, color: "#7a7a86" }}>
                <span><b style={{ color: "#0f1115" }}>Starts</b> · {fmtLongDate(customer.startDate).split(",")[0]} <span style={{ margin: "0 8px", color: "#cbd5e1" }}>•</span> <b style={{ color: "#0f1115" }}>{customer.shiftTime}</b></span>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", padding: "2px 8px", borderRadius: 999, backgroundColor: "#f1f5f9", color: "#5F47FF", fontWeight: 600 }}>{rota.length} days</span>
              </div>
              <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 1.1fr 1.2fr", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", padding: "12px 16px", backgroundColor: "#F9F8F6", color: "#A8A8A6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
                  <span>Date</span><span>Time</span><span>Caregiver</span><span>Reason</span>
                </div>
                <div ref={scrollContainerRef} style={{ maxHeight: 360, overflowY: "auto" }}>
                  {rota.map((r, idx) => {
                    const isStart = r.date === customer.startDate;
                    const isToday = r.date === today;
                    const isPast = r.date < today;
                    const rowBg = isToday ? "rgba(99,136,255,0.07)" : isPast ? "#fafafa" : "#fff";
                    return (
                      <div key={r.date} ref={isToday ? todayRowRef : undefined} style={{
                        display: "grid", gridTemplateColumns: "1.5fr 0.9fr 1.1fr 1.2fr", alignItems: "center", gap: 8,
                        padding: "12px 16px", fontSize: 13, borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
                        backgroundColor: rowBg,
                        opacity: isPast && !isToday ? 0.55 : 1,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ width: 26, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, borderRadius: 6, backgroundColor: isToday ? "#5F47FF" : isPast ? "#e2e8f0" : "#f1f5f9", color: isToday ? "#fff" : isPast ? "#9a9aa6" : "#7a7a86", flexShrink: 0 }}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                            {isToday && <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 6px", borderRadius: 4, backgroundColor: "#5F47FF", color: "#fff" }}>TODAY</span>}
                            <span style={{ color: isToday ? "#5F47FF" : isPast ? "#9a9aa6" : "#0f1115", fontWeight: isToday ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isPast && !isToday ? "line-through" : "none" }}>
                              {fmtLongDate(r.date)}
                            </span>
                          </div>
                        </div>
                        <span style={{ color: "#7a7a86" }}>{r.time}</span>
                        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }} ref={editDay === r.date ? editDayRef : undefined}>
                          <button onClick={() => { if (!r.paused && !r.leave) setEditDay(editDay === r.date ? null : r.date); }}
                            disabled={r.paused || r.leave}
                            style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, textAlign: "left", borderRadius: 6, padding: "4px 6px", border: "none", background: "transparent", cursor: r.paused || r.leave ? "default" : "pointer" }}>
                            {r.paused ? <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.10)" }}>PAUSED</span>
                              : r.leave ? <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, color: "#a855f7", backgroundColor: "rgba(168,85,247,0.10)" }}>LEAVE</span>
                                : r.weeklyOff ? <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, color: "#0ea5e9", backgroundColor: "rgba(14,165,233,0.10)" }}>WEEKLY OFF</span>
                                  : r.staff ? <><Avatar s={r.staff} size={22} /><span style={{ fontSize: 13, fontWeight: 500, color: "#0f1115" }}>{r.staff.name.split(" ")[0]}</span></>
                                    : <span style={{ fontSize: 11, fontWeight: 500, color: "#ef4444" }}>Unassigned</span>
                            }
                            {!r.paused && !r.leave && <span style={{ marginLeft: "auto", fontSize: 11, color: "#7a7a86", opacity: 0.6 }}>▾</span>}
                          </button>
                          {r.paused ? (
                            <button onClick={() => onTogglePauseDay(customer.id, r.date)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, color: "#22c55e", backgroundColor: "rgba(34,197,94,0.10)", border: "none", cursor: "pointer" }}>Resume</button>
                          ) : r.leave ? (
                            <button onClick={() => onToggleLeaveDay(customer.id, r.date)} style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, color: "#22c55e", backgroundColor: "rgba(34,197,94,0.10)", border: "none", cursor: "pointer" }}>Resume</button>
                          ) : !r.weeklyOff ? (
                            <>
                              <button onClick={() => { setReasonText(""); setPendingChange({ date: r.date, action: "pause" }); }} style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, color: "#7a7a86", backgroundColor: "#f1f5f9", border: "none", cursor: "pointer", flexShrink: 0 }}>Pause</button>
                              <button onClick={() => { setReasonText(""); setPendingChange({ date: r.date, action: "leave" }); }} style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, color: "#a855f7", backgroundColor: "rgba(168,85,247,0.10)", border: "none", cursor: "pointer", flexShrink: 0 }}>Leave</button>
                            </>
                          ) : null}
                          {!r.paused && !r.leave && editDay === r.date && (
                            <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 6, zIndex: 10, width: 200, maxHeight: 220, overflowY: "auto", borderRadius: 10, padding: 6, backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 16px 36px -12px rgba(15,17,21,0.18)" }}>
                              {(r.weeklyOff ? available : rotaPickList).map(s => (
                                <button key={s.id} onClick={() => { setEditDay(null); if (r.staff && r.staff.id === s.id) return; setReasonText(""); setPendingChange({ date: r.date, action: "change", staffId: s.id }); }}
                                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}>
                                  <Avatar s={s} size={20} />
                                  <span style={{ fontSize: 13, fontWeight: 500, color: "#0f1115" }}>{s.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {customer.rotaReasons?.[r.date] && (
                            <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, color: "#5F47FF", backgroundColor: "rgba(95,71,255,0.08)", fontWeight: 500, display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={customer.rotaReasons[r.date]}>
                              {customer.rotaReasons[r.date]}
                            </span>
                          )}
                          {(() => {
                            if (!r.staff || r.paused || r.leave || r.weeklyOff) return null;
                            const entries = conflictMap?.get(r.staff.id)?.get(r.date) ?? [];
                            const others = entries.filter(e => e.customerId !== customer.id);
                            if (others.length === 0) return null;
                            return others.map((o, i) => {
                              const dist = (customer.homeLat != null && customer.homeLng != null && o.homeLat != null && o.homeLng != null)
                                ? haversineKm(customer.homeLat, customer.homeLng, o.homeLat, o.homeLng)
                                : null;
                              const label = dist != null
                                ? `Also at ${o.customerName.replace(/\s+Family\s*$/i,"").trim()} · ${fmtKm(dist)} away`
                                : `Also at ${o.customerName.replace(/\s+Family\s*$/i,"").trim()}`;
                              return (
                                <span key={i} title={label} style={{ fontSize: 11, padding: "3px 7px", borderRadius: 6, color: "#ea580c", backgroundColor: "#fff7ed", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                                  ⚠ {label}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
          <button onClick={() => setConfirmDelete(true)} style={{ fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer" }}>Delete client</button>
        </div>

        {/* Pending change modal */}
        {pendingChange && (
          <div onClick={() => setPendingChange(null)} style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(15,17,21,0.45)", backdropFilter: "blur(4px)" }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, borderRadius: 14, padding: 20, backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 20px 40px rgba(15,17,21,0.18)" }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "#0f1115", margin: "0 0 4px" }}>Reason</h4>
              <p style={{ fontSize: 11, color: "#7a7a86", margin: "0 0 12px" }}>
                {fmtLongDate(pendingChange.date)} — {pendingChange.action === "pause" ? "please record why this day is being paused." : pendingChange.action === "leave" ? "please record why the caregiver is on leave." : "please record why this change is being made."}
              </p>
              <textarea autoFocus value={reasonText} onChange={e => setReasonText(e.target.value)}
                placeholder={pendingChange.action === "pause" ? "e.g. Client travelling, family event…" : pendingChange.action === "leave" ? "e.g. Sick leave, planned leave…" : "e.g. Original caregiver on leave, client request…"}
                rows={3} style={{ ...inp, resize: "vertical" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button onClick={() => setPendingChange(null)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#7a7a86", cursor: "pointer" }}>Cancel</button>
                <button disabled={!reasonText.trim()} onClick={() => {
                  if (pendingChange.action === "change") onSetRotaDay(customer.id, pendingChange.date, pendingChange.staffId, reasonText.trim());
                  else if (pendingChange.action === "pause") onTogglePauseDay(customer.id, pendingChange.date, reasonText.trim());
                  else onToggleLeaveDay(customer.id, pendingChange.date, reasonText.trim());
                  setPendingChange(null); setReasonText("");
                }} style={{ fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 6, border: "none", backgroundColor: "#5F47FF", color: "#fff", cursor: "pointer", opacity: reasonText.trim() ? 1 : 0.5 }}>
                  {pendingChange.action === "pause" ? "Pause day" : pendingChange.action === "leave" ? "Mark leave" : "Save Change"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {confirmDelete && (
          <div onClick={() => setConfirmDelete(false)} style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(15,17,21,0.45)", backdropFilter: "blur(4px)" }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, borderRadius: 14, padding: 20, backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 20px 40px rgba(15,17,21,0.18)" }}>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "#0f1115", margin: "0 0 4px" }}>Delete this client?</h4>
              <p style={{ fontSize: 12, color: "#7a7a86", margin: "0 0 16px" }}>{displayName(customer.name)} will be removed along with their rota and staff assignments. This cannot be undone.</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "transparent", color: "#7a7a86", cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { setConfirmDelete(false); onDeleteCustomer(customer.id); }} style={{ fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 6, border: "none", backgroundColor: "#ef4444", color: "#fff", cursor: "pointer" }}>Delete client</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Staff View ────────────────────────────────────────────────────────────────

function StaffView({ roster, customers, onAdd, onRemove, onUpdate }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("MOBA");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [languages, setLanguages] = useState("");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");

  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState({});

  const assignmentsByStaff = useMemo(() => {
    const m = new Map();
    for (const c of customers) for (const s of c.staff) { const arr = m.get(s.id) ?? []; arr.push(c); m.set(s.id, arr); }
    return m;
  }, [customers]);

  const inp = { backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#0f1115", outline: "none", width: "100%", boxSizing: "border-box" };
  const lbl = { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86", display: "block", marginBottom: 4 };

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), role, phone: phone.trim() || null, location: location.trim() || null, languages: languages.trim() || null, area: area.trim() || null, notes: notes.trim() || null });
    setName(""); setRole("MOBA"); setPhone(""); setLocation(""); setLanguages(""); setArea(""); setNotes("");
  };

  const openEdit = (s) => {
    setEditingStaff(s);
    setEditForm({ name: s.name, role: s.role, phone: s.phone ?? "", location: s.location ?? "", languages: s.languages ?? "", area: s.area ?? "", notes: s.notes ?? "" });
  };

  const handleEditSave = () => {
    if (!editForm.name?.trim()) return;
    onUpdate({ ...editingStaff, name: editForm.name.trim(), role: editForm.role, phone: editForm.phone.trim() || null, location: editForm.location?.trim() || null, languages: editForm.languages.trim() || null, area: editForm.area.trim() || null, notes: editForm.notes.trim() || null });
    setEditingStaff(null);
  };

  const ef = (k) => ({ value: editForm[k] ?? "", onChange: e => setEditForm(prev => ({ ...prev, [k]: e.target.value })) });

  return (
    <div>
      {editingStaff && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,17,21,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setEditingStaff(null)}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: 28, width: 400, boxShadow: "0 24px 64px -16px rgba(15,17,21,0.32)", display: "flex", flexDirection: "column", gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#0f1115" }}>Edit Staff</span>
              <button onClick={() => setEditingStaff(null)} style={{ background: "none", border: "none", fontSize: 20, color: "#9a9aa6", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div><label style={lbl}>Full name</label><input {...ef("name")} placeholder="e.g. Anjali Krishnan" style={inp} /></div>
            <div><label style={lbl}>Role</label>
              <select {...ef("role")} style={inp}><option value="MOBA">MOBA</option><option value="Nurse">Nurse</option></select>
            </div>
            <div><label style={lbl}>Phone Number</label><input {...ef("phone")} placeholder="e.g. +91 98765 43210" style={inp} /></div>
            <div><label style={lbl}>Location</label><input {...ef("location")} placeholder="e.g. Bangalore, Karnataka" style={inp} /></div>
            <div><label style={lbl}>Languages Known</label><input {...ef("languages")} placeholder="e.g. Kannada, Hindi, English" style={inp} /></div>
            <div><label style={lbl}>Area / Coverage Zone</label><input {...ef("area")} placeholder="e.g. HSR Layout, Koramangala" style={inp} /></div>
            <div><label style={lbl}>Notes</label><textarea rows={3} {...ef("notes")} placeholder="Any important details…" style={{ ...inp, resize: "vertical" }} /></div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => setEditingStaff(null)} style={{ flex: 1, fontSize: 13, fontWeight: 600, padding: 10, borderRadius: 8, backgroundColor: "#f1f5f9", color: "#7a7a86", border: "none", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleEditSave} disabled={!editForm.name?.trim()} style={{ flex: 2, fontSize: 13, fontWeight: 600, padding: 10, borderRadius: 8, backgroundColor: "#5F47FF", color: "#fff", border: "none", cursor: "pointer", opacity: editForm.name?.trim() ? 1 : 0.5 }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#5F47FF", boxShadow: "0 0 8px #5F47FF" }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5F47FF" }}>Roster</span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111110", letterSpacing: "-0.025em", lineHeight: 1, margin: 0 }}>Staff</h1>
        <p style={{ fontSize: 12, marginTop: 8, color: "#7a7a86" }}>{roster.length} caregivers · Manage your team</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>
        <div style={{ borderRadius: 14, padding: 20, backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 12px 32px -20px rgba(15,17,21,0.18)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "#7a7a86" }}>Add Staff</div>
          <div><label style={lbl}>Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); }} placeholder="e.g. Anjali Krishnan" style={inp} />
          </div>
          <div><label style={lbl}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={inp}>
              <option value="MOBA">MOBA</option><option value="Nurse">Nurse</option>
            </select>
          </div>
          <div><label style={lbl}>Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +91 98765 43210" style={inp} />
          </div>
          <div><label style={lbl}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Bangalore, Karnataka" style={inp} />
          </div>
          <div><label style={lbl}>Languages Known</label>
            <input value={languages} onChange={e => setLanguages(e.target.value)} placeholder="e.g. Kannada, Hindi, English" style={inp} />
          </div>
          <div><label style={lbl}>Area / Coverage Zone</label>
            <input value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. HSR Layout, Koramangala" style={inp} />
          </div>
          <div><label style={lbl}>Notes</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any important details before adding to roster…" style={{ ...inp, resize: "vertical" }} />
          </div>
          <button onClick={handleAdd} disabled={!name.trim()} style={{ width: "100%", fontSize: 13, fontWeight: 600, padding: 10, borderRadius: 8, backgroundColor: "#5F47FF", color: "#fff", border: "none", cursor: "pointer", opacity: name.trim() ? 1 : 0.5, marginTop: 4 }}>+ Add to Roster</button>
        </div>
        <div style={{ borderRadius: 14, overflow: "hidden", backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 12px 32px -20px rgba(15,17,21,0.18)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.5fr 1fr 1fr 1fr 1.2fr 110px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", padding: "12px 16px", backgroundColor: "#F9F8F6", color: "#A8A8A6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
            <span>Caregiver</span><span>Role</span><span>Phone</span><span>Location</span><span>Languages</span><span>Active assignments</span><span></span>
          </div>
          {roster.map((s, idx) => {
            const assigned = assignmentsByStaff.get(s.id) ?? [];
            return (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.5fr 1fr 1fr 1fr 1.2fr 110px", alignItems: "center", gap: 8, padding: "12px 16px", fontSize: 13, borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar s={s} size={32} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0f1115" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#9a9aa6" }}>{s.area ? s.area : (assigned.length === 0 ? "Available" : `${assigned.length} client${assigned.length > 1 ? "s" : ""}`)}</div>
                    {s.notes && <div style={{ fontSize: 11, color: "#7a7a86", marginTop: 2, fontStyle: "italic" }}>{s.notes}</div>}
                  </div>
                </div>
                <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 8px", borderRadius: 6, backgroundColor: "#f1f5f9", color: "#5F47FF", fontWeight: 600, display: "inline-block" }}>{s.role}</span>
                <div style={{ fontSize: 12, color: "#4b5563" }}>{s.phone ?? <span style={{ color: "#c9c6bc" }}>—</span>}</div>
                <div style={{ fontSize: 12, color: "#4b5563" }}>{s.location ?? <span style={{ color: "#c9c6bc" }}>—</span>}</div>
                <div style={{ fontSize: 11, color: "#7a7a86" }}>{s.languages ?? "—"}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                  {assigned.length === 0 ? <span style={{ fontSize: 12, color: "#c9c6bc" }}>—</span> : assigned.map(c => <span key={c.id} style={{ fontSize: 13, fontWeight: 500, color: "#0f1115" }}>{displayName(c.name)}</span>)}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => openEdit(s)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#5F47FF", cursor: "pointer", fontWeight: 600 }}>Edit</button>
                  <button onClick={() => onRemove(s.id)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "none", background: "transparent", color: "#ef4444", cursor: "pointer" }}>Remove</button>
                </div>
              </div>
            );
          })}
          {roster.length === 0 && <div style={{ textAlign: "center", padding: 48, fontSize: 13, color: "#7a7a86" }}>No staff yet — add your first caregiver →</div>}
        </div>
      </div>
    </div>
  );
}

// ─── CSV Download Helper ───────────────────────────────────────────────────────

function downloadCSV(filename, headers, rows) {
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Utilisation View ──────────────────────────────────────────────────────────

function UtilisationView({ roster, customers, travelEntries = [] }) {
  const [roleFilter, setRoleFilter] = useState("All");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [fyFilter, setFyFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");

  const fyList = useMemo(() => {
    const set = new Set();
    for (const c of customers) {
      if (!c.startDate || !c.packageDays) continue;
      const span = c.packageDays + 60;
      for (let i = 0; i < span; i += 15) set.add(fyOfDate(addDaysISO(c.startDate, i)));
      set.add(fyOfDate(addDaysISO(c.startDate, span)));
    }
    const currentFy = fyOfDate(todayISO());
    const currentStart = Number(currentFy.split("-")[0]);
    for (let i = 0; i < 10; i++) { const y = currentStart + i; set.add(`${y}-${y + 1}`); }
    return Array.from(set).filter(fy => Number(fy.split("-")[0]) >= currentStart).sort();
  }, [customers]);

  const monthOptions = useMemo(() => fyFilter === "All" ? [] : monthsOfFy(fyFilter), [fyFilter]);

  useEffect(() => {
    if (fyFilter === "All") { setMonthFilter("All"); return; }
    if (monthFilter !== "All" && !monthOptions.some(m => m.value === monthFilter)) setMonthFilter("All");
  }, [fyFilter, monthOptions, monthFilter]);

  const dateInScope = (date) => {
    if (monthFilter !== "All") return date.startsWith(monthFilter);
    if (fyFilter !== "All") return fyOfDate(date) === fyFilter;
    return true;
  };

  const rows = useMemo(() => {
    const today = todayISO();
    return roster.map(staff => {
      const assigned = customers.filter(c => c.staff.some(x => x.id === staff.id));
      let planned = 0, completed = 0, leaveDays = 0;
      for (const c of assigned) {
        if (!c.packageDays || !c.startDate) continue;
        const pool = c.staff;
        if (pool.length === 0) continue;
        const pausedSet = new Set(c.pausedDates ?? []);
        const leaveSet = new Set(c.leaveDates ?? []);
        let workIdx = 0, consumed = 0, offset = 0;
        const cap = c.packageDays + 120;
        while (consumed < c.packageDays && offset < cap) {
          const date = addDaysISO(c.startDate, offset);
          const wouldBe = pool[workIdx % pool.length];
          const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
          const sundayOverrideId = c.rota?.[date];
          const inScope = dateInScope(date);
          if (isSunday && !sundayOverrideId) { consumed++; }
          else if (leaveSet.has(date)) { if (inScope && wouldBe?.id === staff.id) { planned++; leaveDays++; } consumed++; }
          else if (pausedSet.has(date)) { /* skip */ }
          else {
            const overrideId = c.rota?.[date];
            const actual = overrideId ? (roster.find(s => s.id === overrideId) ?? wouldBe) : wouldBe;
            if (inScope && actual?.id === staff.id) { planned++; if (date <= today) completed++; }
            workIdx++; consumed++;
          }
          offset++;
        }
      }
      const travelAmount = travelEntries.filter(e => e.staffId === staff.id && dateInScope(e.date)).reduce((s, e) => s + (e.amount ?? 0), 0);
      const utilisation = planned === 0 ? 0 : Math.round((completed / planned) * 1000) / 10;
      const leaveRate = planned === 0 ? 0 : Math.round((leaveDays / planned) * 1000) / 10;
      const status = planned === 0 ? "Idle" : utilisation >= 85 ? "Healthy" : utilisation >= 70 ? "Watch" : "At Risk";
      return { staff, clients: assigned.length, planned, completed, leaveDays, travelAmount, utilisation, leaveRate, status };
    }).sort((a, b) => b.utilisation - a.utilisation);
  }, [roster, customers, travelEntries, fyFilter, monthFilter]);

  const filteredRows = useMemo(() => roleFilter === "All" ? rows : rows.filter(r => r.staff.role === roleFilter), [rows, roleFilter]);
  const utilisedCount = filteredRows.filter(r => r.planned > 0).length;
  const avgUtil = utilisedCount === 0 ? 0 : Math.round(filteredRows.filter(r => r.planned > 0).reduce((s, r) => s + r.utilisation, 0) / utilisedCount);
  const idleCount = filteredRows.length - utilisedCount;

  const selectedStaff = roster.find(s => s.id === selectedStaffId) ?? null;
  const monthlyRows = useMemo(() => {
    if (!selectedStaff) return [];
    const today = todayISO();
    const buckets = new Map();
    const assigned = customers.filter(c => c.staff.some(x => x.id === selectedStaff.id));
    for (const c of assigned) {
      if (!c.packageDays || !c.startDate) continue;
      const pool = c.staff;
      if (pool.length === 0) continue;
      const pausedSet = new Set(c.pausedDates ?? []);
      const leaveSet = new Set(c.leaveDates ?? []);
      let workIdx = 0, consumed = 0, offset = 0;
      const cap = c.packageDays + 120;
      while (consumed < c.packageDays && offset < cap) {
        const date = addDaysISO(c.startDate, offset);
        const ym = date.slice(0, 7);
        const wouldBe = pool[workIdx % pool.length];
        const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
        const sundayOverrideId = c.rota?.[date];
        const get = () => { let b = buckets.get(ym); if (!b) { b = { planned: 0, completed: 0, leave: 0, travelAmount: 0 }; buckets.set(ym, b); } return b; };
        if (isSunday && !sundayOverrideId) { consumed++; }
        else if (leaveSet.has(date)) { if (wouldBe?.id === selectedStaff.id) { const b = get(); b.planned++; b.leave++; } consumed++; }
        else if (pausedSet.has(date)) { /* skip */ }
        else {
          const overrideId = c.rota?.[date];
          const actual = overrideId ? (roster.find(s => s.id === overrideId) ?? wouldBe) : wouldBe;
          if (actual?.id === selectedStaff.id) { const b = get(); b.planned++; if (date <= today) b.completed++; }
          workIdx++; consumed++;
        }
        offset++;
      }
    }
    for (const e of travelEntries) {
      if (e.staffId !== selectedStaff.id) continue;
      const ym = e.date.slice(0, 7);
      const b = buckets.get(ym);
      if (b) b.travelAmount += (e.amount ?? 0);
    }
    return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([ym, v]) => ({
      ym, label: new Date(`${ym}-01T00:00:00`).toLocaleString("default", { month: "long", year: "numeric" }),
      ...v, util: v.planned === 0 ? 0 : Math.round((v.completed / v.planned) * 1000) / 10,
      leaveRate: v.planned === 0 ? 0 : Math.round((v.leave / v.planned) * 1000) / 10,
    }));
  }, [selectedStaff, customers, roster, travelEntries]);

  const selStyle = { backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#0f1115", fontWeight: 500, cursor: "pointer" };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e" }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5F47FF" }}>Insights</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111110", letterSpacing: "-0.025em", lineHeight: 1, margin: 0 }}>Utilisation Report</h1>
          <p style={{ fontSize: 12, marginTop: 8, color: "#7a7a86" }}>Planned vs completed service days (Sundays are weekly off)</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatTile value={utilisedCount} label="Utilised" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 13V9M6 13V5M10 13V7M14 13V3" /></svg>} />
          <StatTile value={idleCount} label="Idle" accent={idleCount > 0 ? "#f59e0b" : undefined} icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><path d="M5.5 8h5" /></svg>} />
          <StatTile value={`${avgUtil}%`} label="Avg utilisation" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" /></svg>} />
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        {[["Role", <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={selStyle}><option value="All">All staff</option><option value="Nurse">Nurses</option><option value="MOBA">MOBA</option></select>],
        ["Financial Year", <select value={fyFilter} onChange={e => setFyFilter(e.target.value)} style={selStyle}><option value="All">All FY</option>{fyList.map(fy => <option key={fy} value={fy}>FY {fy}</option>)}</select>],
        ["Month", <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} disabled={fyFilter === "All"} style={{ ...selStyle, opacity: fyFilter === "All" ? 0.5 : 1 }}><option value="All">All months</option>{monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>],
        ].map(([label, ctl]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "#7a7a86", fontWeight: 600 }}>{label}</span>
            {ctl}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "#7a7a86", fontWeight: 600 }}>Monthly view</span>
          <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} style={{ ...selStyle, minWidth: 220 }}>
            <option value="">Select a caregiver…</option>
            {roster.filter(s => roleFilter === "All" || s.role === roleFilter).map(s => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
          </select>
          {selectedStaff && <button onClick={() => setSelectedStaffId("")} style={{ ...selStyle, padding: "6px 10px" }}>Clear</button>}
        </div>
        <button onClick={() => downloadCSV(
          `utilisation-report-${todayISO()}.csv`,
          ["Caregiver", "Role", "Planned", "Completed", "Travel (₹)", "Utilisation %", "Leave Rate %", "Status"],
          filteredRows.map(r => [r.staff.name, r.staff.role, r.planned, r.completed, r.travelAmount, r.planned > 0 ? `${r.utilisation}%` : "—", r.planned > 0 ? `${r.leaveRate}%` : "—", r.status])
        )} style={{ ...selStyle, backgroundColor: "#5F47FF", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v9M5 8l3 3 3-3M2 13h12" /></svg>
          Download CSV
        </button>
      </div>

      {selectedStaff && (
        <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 24, backgroundColor: "#fff", border: "1px solid #e2e8f0" }}>
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <Avatar s={selectedStaff} size={32} />
            <div><div style={{ fontSize: 14, fontWeight: 600, color: "#0f1115" }}>{selectedStaff.name}</div><div style={{ fontSize: 11, color: "#7a7a86" }}>Monthly utilisation · {selectedStaff.role}</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr 0.7fr 0.9fr 0.9fr 0.9fr", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", padding: "12px 16px", backgroundColor: "#F9F8F6", color: "#A8A8A6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
            <span>Month</span><span>Planned</span><span>Completed</span><span>Travel (₹)</span><span>Utilisation %</span><span>Leave Rate %</span>
          </div>
          {monthlyRows.map((m, i) => (
            <div key={m.ym} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.7fr 0.7fr 0.9fr 0.9fr 0.9fr", alignItems: "center", gap: 8, padding: "12px 16px", fontSize: 13, borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
              <span style={{ fontWeight: 500, color: "#0f1115" }}>{m.label}</span>
              <span style={{ fontWeight: 600, color: "#0f1115" }}>{m.planned}</span>
              <span style={{ fontWeight: 600, color: m.completed > 0 ? "#16a34a" : "#c9c6bc" }}>{m.completed || "—"}</span>
              <span style={{ fontWeight: 600, color: m.travelAmount > 0 ? "#0f1115" : "#c9c6bc" }}>{m.travelAmount > 0 ? `₹${m.travelAmount.toLocaleString("en-IN")}` : "—"}</span>
              <span style={{ fontWeight: 600, color: "#0f1115" }}>{m.planned > 0 ? `${m.util}%` : "—"}</span>
              <span style={{ fontWeight: 600, color: m.leaveRate > 0 ? "#0f1115" : "#c9c6bc" }}>{m.planned > 0 ? `${m.leaveRate}%` : "—"}</span>
            </div>
          ))}
          {monthlyRows.length === 0 && <div style={{ textAlign: "center", padding: 32, fontSize: 13, color: "#7a7a86" }}>No scheduled days for this caregiver yet.</div>}
        </div>
      )}

      <div style={{ borderRadius: 14, overflow: "hidden", backgroundColor: "#fff", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.6fr 0.7fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", padding: "12px 16px", backgroundColor: "#F9F8F6", color: "#A8A8A6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
          <span>Caregiver</span><span>Role</span><span>Planned</span><span>Completed</span><span>Travel (₹)</span><span>Utilisation %</span><span>Leave Rate %</span><span>Status</span>
        </div>
        {filteredRows.map((r, idx) => {
          const sc = r.status === "Healthy" ? "#16a34a" : r.status === "Watch" ? "#f59e0b" : r.status === "At Risk" ? "#ef4444" : "#7a7a86";
          const sb = r.status === "Healthy" ? "rgba(34,197,94,0.10)" : r.status === "Watch" ? "rgba(245,158,11,0.10)" : r.status === "At Risk" ? "rgba(239,68,68,0.10)" : "#f1f5f9";
          return (
            <div key={r.staff.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.6fr 0.7fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr", alignItems: "center", gap: 8, padding: "12px 16px", fontSize: 13, borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar s={r.staff} size={32} />
                <div style={{ fontSize: 13, fontWeight: 500, color: "#0f1115" }}>{r.staff.name}</div>
              </div>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 8px", borderRadius: 6, backgroundColor: "#f1f5f9", color: "#5F47FF", fontWeight: 600, display: "inline-block" }}>{r.staff.role}</span>
              <span style={{ fontWeight: 600, color: "#0f1115" }}>{r.planned || "—"}</span>
              <span style={{ fontWeight: 600, color: r.completed > 0 ? "#16a34a" : "#c9c6bc" }}>{r.completed || "—"}</span>
              <span style={{ fontWeight: 600, color: r.travelAmount > 0 ? "#0f1115" : "#c9c6bc" }}>{r.travelAmount > 0 ? `₹${r.travelAmount.toLocaleString("en-IN")}` : "—"}</span>
              <span style={{ fontWeight: 600, color: "#0f1115" }}>{r.planned > 0 ? `${r.utilisation}%` : "—"}</span>
              <span style={{ fontWeight: 600, color: r.leaveRate > 0 ? "#0f1115" : "#c9c6bc" }}>{r.planned > 0 ? `${r.leaveRate}%` : "—"}</span>
              <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 8px", borderRadius: 6, backgroundColor: sb, color: sc, fontWeight: 600, display: "inline-block" }}>{r.status}</span>
            </div>
          );
        })}
        {filteredRows.length === 0 && <div style={{ textAlign: "center", padding: 48, fontSize: 13, color: "#7a7a86" }}>No staff to report on yet.</div>}
      </div>
    </div>
  );
}

// ─── Travel Expenses View ──────────────────────────────────────────────────────

function TravelExpensesView({ roster, customers, entries, onAdd, onDelete }) {
  const [staffId, setStaffId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [distance, setDistance] = useState("");
  const [mode, setMode] = useState("Two-Wheeler");
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState(false);
  const [notes, setNotes] = useState("");

  const { assignedCustomers, otherCustomers } = useMemo(() => {
    if (!staffId) return { assignedCustomers: [], otherCustomers: customers };
    const assigned = customers.filter(c => c.staff.some(s => s.id === staffId));
    const assignedIds = new Set(assigned.map(c => c.id));
    const others = customers.filter(c => !assignedIds.has(c.id));
    return { assignedCustomers: assigned, otherCustomers: others };
  }, [staffId, customers]);

  const distanceNum = parseFloat(distance) || 0;
  const suggested = distanceNum > 0 || MODE_RATE[mode].flat !== undefined ? suggestAmount(mode, distanceNum) : 0;
  const reset = () => { setStaffId(""); setCustomerId(""); setDate(todayISO()); setFrom(""); setTo(""); setDistance(""); setMode("Two-Wheeler"); setAmount(""); setReceipt(false); setNotes(""); };

  const handleStaffChange = (id) => { setStaffId(id); setCustomerId(""); };

  const submit = (e) => {
    e.preventDefault();
    if (!staffId || !date || !from.trim() || !to.trim()) return;
    const dist = parseFloat(distance);
    const amt = parseFloat(amount);
    if (isNaN(dist) || dist < 0 || isNaN(amt) || amt < 0) return;
    const customerName = customers.find(c => c.id === customerId)?.name ?? "";
    onAdd({ id: crypto.randomUUID(), staffId, date, tripType: customerName, customerId: customerId || undefined, from: from.trim(), to: to.trim(), distance: dist, mode, amount: amt, receipt, notes: notes.trim() || undefined });
    reset();
  };

  const grandTotal = entries.reduce((s, e) => s + e.amount, 0);
  const totalKm = entries.reduce((s, e) => s + e.distance, 0);
  const inp = { backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#0f1115", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5F47FF" }}>Finance</span>
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 700, color: "#0f1115", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>Travel Expenses</h1>
          <p style={{ fontSize: 12, marginTop: 8, color: "#7a7a86" }}>Log caregiver trips and track travel reimbursements</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatTile value={`₹${grandTotal.toLocaleString("en-IN")}`} label="Total logged" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12M2 8h8M5 12h4M8 1v14" /></svg>} />
          <StatTile value={entries.length} label="Entries" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 6h6M5 9h4" /></svg>} />
          <StatTile value={`${totalKm.toFixed(1)} km`} label="Distance" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2C5.79 2 4 3.79 4 6c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4z" /><circle cx="8" cy="6" r="1.5" /></svg>} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 24 }}>
        <form onSubmit={submit} style={{ borderRadius: 14, padding: 20, backgroundColor: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 12px 32px -20px rgba(15,17,21,0.18)", display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "#0f1115", margin: 0 }}>Log new expense</h3>
          <div><label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86", display: "block", marginBottom: 6 }}>Caregiver Name</label>
            <select value={staffId} onChange={e => handleStaffChange(e.target.value)} style={inp}><option value="">Select caregiver</option>{roster.map(s => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}</select>
          </div>
          <div><label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86", display: "block", marginBottom: 6 }}>Customer</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={inp}>
              <option value="">Select customer</option>
              {assignedCustomers.length > 0 && <optgroup label="Assigned to caregiver">{assignedCustomers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.area}</option>)}</optgroup>}
              {otherCustomers.length > 0 && <optgroup label="Other customers">{otherCustomers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.area}</option>)}</optgroup>}
            </select>
          </div>
          <div><label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86", display: "block", marginBottom: 6 }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
            {date && <div style={{ fontSize: 11, color: "#7a7a86", marginTop: 4 }}>{formatDateDMY(date)}</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86", display: "block", marginBottom: 6 }}>From</label><input value={from} onChange={e => setFrom(e.target.value)} placeholder="e.g. HSR Layout" style={inp} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86", display: "block", marginBottom: 6 }}>To</label><input value={to} onChange={e => setTo(e.target.value)} placeholder="e.g. Indiranagar" style={inp} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86", display: "block", marginBottom: 6 }}>Distance (km)</label><input type="number" min={0} step={0.1} value={distance} onChange={e => setDistance(e.target.value)} placeholder="e.g. 8.5" style={inp} /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86", display: "block", marginBottom: 6 }}>Mode</label><select value={mode} onChange={e => setMode(e.target.value)} style={inp}>{TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          </div>
          <div><label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86", display: "block", marginBottom: 6 }}>Amount (₹)</label>
            <input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 120" style={inp} />
            {suggested > 0 && <div style={{ fontSize: 11, color: "#7a7a86", marginTop: 4, display: "flex", gap: 8 }}>
              <span>Suggested: ₹{suggested}{MODE_RATE[mode].flat !== undefined ? " (flat)" : ` for ${distanceNum}km`}</span>
              <button type="button" onClick={() => setAmount(String(suggested))} style={{ fontSize: 11, color: "#5F47FF", textDecoration: "underline", border: "none", background: "transparent", cursor: "pointer" }}>Use</button>
            </div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86" }}>Receipt Uploaded</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button" onClick={() => setReceipt(!receipt)} style={{ position: "relative", display: "inline-flex", height: 24, width: 44, alignItems: "center", borderRadius: 999, border: "none", backgroundColor: receipt ? "#22c55e" : "#d4d2c8", cursor: "pointer" }}>
                <span style={{ display: "inline-block", height: 20, width: 20, borderRadius: "50%", backgroundColor: "#fff", transform: receipt ? "translateX(22px)" : "translateX(2px)", transition: "transform 0.2s" }} />
              </button>
              <span style={{ fontSize: 12, color: "#0f1115" }}>{receipt ? "Yes" : "No"}</span>
            </div>
          </div>
          <div><label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a7a86", display: "block", marginBottom: 6 }}>Notes</label><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional details..." style={{ ...inp, resize: "vertical" }} /></div>
          <button type="submit" style={{ width: "100%", fontWeight: 600, fontSize: 14, padding: "12px", borderRadius: 8, backgroundColor: "#5F47FF", color: "#fff", border: "none", cursor: "pointer" }}>Log Expense</button>
        </form>

        <div style={{ borderRadius: 14, overflow: "hidden", backgroundColor: "#fff", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.8fr 1fr 1.2fr 0.6fr 0.9fr 0.4fr 32px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", padding: "12px 16px", backgroundColor: "#F9F8F6", color: "#A8A8A6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
            <span>Caregiver</span><span>Date</span><span>Customer</span><span>Route</span><span>Km</span><span>Amount</span><span>Rcpt</span><span />
          </div>
          {entries.length === 0 && <div style={{ textAlign: "center", padding: 48, fontSize: 13, color: "#7a7a86" }}>No expenses logged yet.</div>}
          {entries.map((e, idx) => {
            const staff = roster.find(s => s.id === e.staffId);
            const customer = e.customerId ? customers.find(c => c.id === e.customerId) : null;
            const customerLabel = customer?.name ?? e.tripType ?? "—";
            return (
              <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 0.8fr 1fr 1.2fr 0.6fr 0.9fr 0.4fr 32px", alignItems: "center", gap: 8, padding: "12px 16px", fontSize: 13, borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{staff && <Avatar s={staff} size={28} />}<div><div style={{ fontSize: 13, fontWeight: 500, color: "#0f1115" }}>{staff?.name ?? "—"}</div><div style={{ fontSize: 11, color: "#7a7a86" }}>{staff?.role}</div></div></div>
                <div style={{ fontSize: 12, color: "#0f1115" }}>{formatDateDMY(e.date)}</div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, backgroundColor: "rgba(99,136,255,0.10)", color: "#5F47FF", fontWeight: 600, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customerLabel}</span>
                <div><div style={{ fontSize: 12, color: "#0f1115" }}>{e.from} → {e.to}</div><div style={{ fontSize: 11, color: "#7a7a86" }}>{e.mode}</div></div>
                <div style={{ color: "#0f1115" }}>{e.distance}</div>
                <div style={{ fontWeight: 600, color: "#0f1115" }}>₹{e.amount.toLocaleString("en-IN")}</div>
                <div>{e.receipt ? <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span> : <span style={{ color: "#c4c2b8" }}>—</span>}</div>
                <button onClick={() => onDelete(e.id)} title="Delete" style={{ border: "none", background: "transparent", cursor: "pointer", color: "#c4c2b8", padding: 4, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={ev => ev.currentTarget.style.color = "#ef4444"} onMouseLeave={ev => ev.currentTarget.style.color = "#c4c2b8"}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5l.5-9" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Attendance View ───────────────────────────────────────────────────────────

function AttendanceView({ roster, customers }) {
  const [roleFilter, setRoleFilter] = useState("All");
  const [fyFilter, setFyFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");

  const fyList = useMemo(() => {
    const set = new Set();
    for (const c of customers) {
      if (!c.startDate || !c.packageDays) continue;
      const span = c.packageDays + 60;
      for (let i = 0; i < span; i += 15) set.add(fyOfDate(addDaysISO(c.startDate, i)));
      set.add(fyOfDate(addDaysISO(c.startDate, span)));
    }
    const currentFy = fyOfDate(todayISO());
    const currentStart = Number(currentFy.split("-")[0]);
    for (let i = 0; i < 10; i++) { const y = currentStart + i; set.add(`${y}-${y + 1}`); }
    return Array.from(set).filter(fy => Number(fy.split("-")[0]) >= currentStart).sort();
  }, [customers]);

  const monthOptions = useMemo(() => fyFilter === "All" ? [] : monthsOfFy(fyFilter), [fyFilter]);

  useEffect(() => {
    if (fyFilter === "All") { setMonthFilter("All"); return; }
    if (monthFilter !== "All" && !monthOptions.some(m => m.value === monthFilter)) setMonthFilter("All");
  }, [fyFilter, monthOptions, monthFilter]);

  const dateInScope = (date) => {
    if (monthFilter !== "All") return date.startsWith(monthFilter);
    if (fyFilter !== "All") return fyOfDate(date) === fyFilter;
    return true;
  };

  const rows = useMemo(() => {
    const today = todayISO();
    return roster.map(staff => {
      const assigned = customers.filter(c => c.staff.some(x => x.id === staff.id));
      let present = 0, leave = 0;
      for (const c of assigned) {
        if (!c.packageDays || !c.startDate) continue;
        const pool = c.staff;
        if (pool.length === 0) continue;
        const pausedSet = new Set(c.pausedDates ?? []);
        const leaveSet = new Set(c.leaveDates ?? []);
        let workIdx = 0, consumed = 0, offset = 0;
        const cap = c.packageDays + 120;
        while (consumed < c.packageDays && offset < cap) {
          const date = addDaysISO(c.startDate, offset);
          const wouldBe = pool[workIdx % pool.length];
          const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
          const sundayOverrideId = c.rota?.[date];
          const inScope = dateInScope(date);
          if (leaveSet.has(date)) { if (inScope && wouldBe?.id === staff.id && date <= today) leave++; consumed++; }
          else if (pausedSet.has(date)) { /* skip */ }
          else if (isSunday && !sundayOverrideId) { consumed++; }
          else {
            const overrideId = c.rota?.[date];
            const actual = overrideId ? (roster.find(s => s.id === overrideId) ?? wouldBe) : wouldBe;
            if (inScope && actual?.id === staff.id && date <= today) present++;
            workIdx++; consumed++;
          }
          offset++;
        }
      }
      const scheduled = present + leave;
      const attendance = scheduled === 0 ? 0 : Math.round((present / scheduled) * 100);
      return { staff, clients: assigned.length, scheduled, present, leave, attendance };
    }).sort((a, b) => b.attendance - a.attendance);
  }, [roster, customers, fyFilter, monthFilter]);

  const filteredRows = useMemo(() => roleFilter === "All" ? rows : rows.filter(r => r.staff.role === roleFilter), [rows, roleFilter]);

  const totalScheduled = filteredRows.reduce((s, r) => s + r.scheduled, 0);
  const totalPresent = filteredRows.reduce((s, r) => s + r.present, 0);
  const overall = totalScheduled === 0 ? 0 : Math.round((totalPresent / totalScheduled) * 100);
  const onLeave = filteredRows.filter(r => r.leave > 0).length;

  const selStyle = { backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#0f1115", fontWeight: 500, cursor: "pointer" };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e" }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5F47FF" }}>Workforce</span>
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 700, color: "#0f1115", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>Attendance Report</h1>
          <p style={{ fontSize: 12, marginTop: 8, color: "#7a7a86" }}>Present and leave days across all caregivers</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatTile value={`${overall}%`} label="Overall attendance" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M5 1v4M11 1v4M2 7h12" /><path d="M5.5 10.5l2 2 3-3" /></svg>} />
          <StatTile value={totalPresent} label="Present days" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><path d="M5.5 8.5l2 2 3-3.5" /></svg>} />
          <StatTile value={onLeave} label="On leave" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6.5" cy="5" r="2.5" /><path d="M1.5 14c0-2.76 2.24-5 5-5M11 10v4M13 12h-4" /></svg>} />
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        {[["Role", <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={selStyle}><option value="All">All staff</option><option value="Nurse">Nurses</option><option value="MOBA">MOBA</option></select>],
          ["Financial Year", <select value={fyFilter} onChange={e => setFyFilter(e.target.value)} style={selStyle}><option value="All">All FY</option>{fyList.map(fy => <option key={fy} value={fy}>FY {fy}</option>)}</select>],
          ["Month", <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} disabled={fyFilter === "All"} style={{ ...selStyle, opacity: fyFilter === "All" ? 0.5 : 1 }}><option value="All">All months</option>{monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>],
        ].map(([label, ctl]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: "#7a7a86", fontWeight: 600 }}>{label}</span>
            {ctl}
          </div>
        ))}
        <button onClick={() => downloadCSV(
          `attendance-report-${todayISO()}.csv`,
          ["Caregiver", "Role", "Clients", "Scheduled", "Present", "Leave", "Attendance %"],
          filteredRows.map(r => [r.staff.name, r.staff.role, r.clients, r.scheduled, r.present, r.leave, `${r.attendance}%`])
        )} style={{ ...selStyle, backgroundColor: "#5F47FF", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v9M5 8l3 3 3-3M2 13h12" /></svg>
          Download CSV
        </button>
      </div>
      <div style={{ borderRadius: 14, overflow: "hidden", backgroundColor: "#fff", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.7fr 0.7fr 1fr", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", padding: "12px 16px", backgroundColor: "#F9F8F6", color: "#A8A8A6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
          <span>Caregiver</span><span>Clients</span><span>Scheduled</span><span>Present</span><span>Leave</span><span>Attendance</span>
        </div>
        {filteredRows.map((r, idx) => {
          const barColor = r.attendance >= 90 ? "#22c55e" : r.attendance >= 75 ? "#f59e0b" : "#ef4444";
          return (
            <div key={r.staff.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.7fr 0.7fr 0.7fr 0.7fr 1fr", alignItems: "center", gap: 8, padding: "12px 16px", fontSize: 13, borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar s={r.staff} size={32} />
                <div><div style={{ fontSize: 13, fontWeight: 500, color: "#0f1115" }}>{r.staff.name}</div><div style={{ fontSize: 11, color: "#7a7a86" }}>{r.staff.role}</div></div>
              </div>
              <div style={{ color: "#0f1115" }}>{r.clients}</div>
              <div style={{ color: "#0f1115" }}>{r.scheduled || "—"}</div>
              <div style={{ fontWeight: 600, color: "#16a34a" }}>{r.present}</div>
              <div style={{ fontWeight: 600, color: "#f59e0b" }}>{r.leave}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 999, overflow: "hidden", backgroundColor: "#f1f5f9" }}>
                  <div style={{ height: "100%", borderRadius: 999, width: `${r.attendance}%`, backgroundColor: barColor }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0f1115", minWidth: 36, textAlign: "right" }}>{r.attendance}%</span>
              </div>
            </div>
          );
        })}
        {filteredRows.length === 0 && <div style={{ textAlign: "center", padding: 48, fontSize: 13, color: "#7a7a86" }}>No caregivers yet.</div>}
      </div>
    </div>
  );
}

// ─── Requirements View ────────────────────────────────────────────────────────

const REQ_PAGE_SIZE = 20;

function RequirementsView({ requirements, loading }) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requirements.filter(r => {
      if (stageFilter !== "All" && r.stage !== stageFilter) return false;
      if (q) {
        const haystack = [r.name, r.address, r.city, r.area, r.owner, r.phone].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [requirements, search, stageFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REQ_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * REQ_PAGE_SIZE, safePage * REQ_PAGE_SIZE);

  const nurse = paginated.filter(r => r.stage === "Nurse Required");
  const moba  = paginated.filter(r => r.stage === "Moba Required");
  const nurseTotal = filtered.filter(r => r.stage === "Nurse Required").length;
  const mobaTotal  = filtered.filter(r => r.stage === "Moba Required").length;

  // reset to page 1 when filters change
  const resetPage = () => setPage(1);

  function ReqCard({ r }) {
    return (
      <div style={{
        background: "#fff", borderRadius: 14, border: "1px solid #e8edf2",
        padding: "16px 18px",
        boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
      }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{r.name}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{r.address ?? r.city ?? r.area ?? "—"}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 12 }}>
          {r.service_required && (
            <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>Service </span><span style={{ color: "#1e293b" }}>{r.service_required}</span></div>
          )}
          {r.preferred_shift && (
            <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>Shift </span><span style={{ color: "#1e293b" }}>{r.preferred_shift}{r.shift_hours_count ? ` · ${r.shift_hours_count}h` : ""}</span></div>
          )}
          {r.shift_time && (
            <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>Time </span><span style={{ color: "#1e293b" }}>{r.shift_time}</span></div>
          )}
          {r.care_start_date && (
            <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>Start </span><span style={{ color: "#1e293b" }}>{r.care_start_date}</span></div>
          )}
          {r.service_days && (
            <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>Days </span><span style={{ color: "#1e293b" }}>{r.service_days}</span></div>
          )}
          {r.budget && (
            <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>Budget </span><span style={{ color: "#1e293b" }}>₹{r.budget.toLocaleString("en-IN")}</span></div>
          )}
          {r.baby_status && (
            <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>Baby </span><span style={{ color: "#1e293b" }}>{r.baby_status}{r.baby_age_or_month ? ` · ${r.baby_age_or_month}` : ""}</span></div>
          )}
          {r.phone && (
            <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>Phone </span><span style={{ color: "#1e293b" }}>{r.phone}</span></div>
          )}
        </div>

        {r.notes && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", borderTop: "1px solid #f1f5f9", paddingTop: 8, fontStyle: "italic" }}>
            {r.notes}
          </div>
        )}

        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Owner: {r.owner ?? "—"}</span>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            {r.last_activity_at ? new Date(r.last_activity_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
          </span>
        </div>
      </div>
    );
  }

  function Section({ label, color, items, total }) {
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, background: "#f1f5f9", color: "#64748b", borderRadius: 999, padding: "1px 8px" }}>{total}</span>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: "24px 20px", borderRadius: 12, background: "#fafafa", border: "1px dashed #e2e8f0", textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
            No open requirements
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map(r => <ReqCard key={r.id} r={r} />)}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "96px 0", gap: 12, color: "#94a3b8", fontSize: 14 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
          </path>
        </svg>
        Loading requirements…
      </div>
    );
  }

  const btnStyle = (active) => ({
    padding: "5px 13px", borderRadius: 8, border: "1px solid #e2e8f0",
    background: active ? "#6388FF" : "#fff", color: active ? "#fff" : "#64748b",
    fontWeight: 600, fontSize: 12, cursor: "pointer",
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em", margin: 0 }}>Requirements</h2>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
          {filtered.length} of {requirements.length} · {nurseTotal} nurse · {mobaTotal} moba
        </p>
      </div>

      {/* Search + Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by name, address, owner, phone…"
          value={search}
          onChange={e => { setSearch(e.target.value); resetPage(); }}
          style={{
            flex: "1 1 220px", padding: "8px 14px", borderRadius: 10,
            border: "1px solid #e2e8f0", fontSize: 13, outline: "none",
            background: "#fff", color: "#0f172a",
          }}
        />
        <select
          value={stageFilter}
          onChange={e => { setStageFilter(e.target.value); resetPage(); }}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff", color: "#0f172a", cursor: "pointer" }}
        >
          <option value="All">All Types</option>
          <option value="Nurse Required">Nurse Required</option>
          <option value="Moba Required">Moba Required</option>
        </select>
        {(search || stageFilter !== "All") && (
          <button
            onClick={() => { setSearch(""); setStageFilter("All"); resetPage(); }}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Section label="Nurse Required" color="#6388FF" items={nurse} total={nurseTotal} />
        <Section label="Moba Required"  color="#a855f7" items={moba}  total={mobaTotal} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 32 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={{ ...btnStyle(false), opacity: safePage === 1 ? 0.4 : 1 }}
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={btnStyle(p === safePage)}>
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            style={{ ...btnStyle(false), opacity: safePage === totalPages ? 0.4 : 1 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export function OpsBoard({ onLogout }) {
  useClientNow();
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/ops/staff").then(r => r.json()).catch(() => []),
      fetch("/api/ops/customers").then(r => r.json()).catch(() => []),
      fetch("/api/ops/state").then(r => r.json()).catch(() => []),
    ]).then(([staffData, customersData, stateData]) => {
      const staffList = Array.isArray(staffData) ? staffData : [];
      const customerList = Array.isArray(customersData) ? customersData : [];
      const stateList = Array.isArray(stateData) ? stateData : [];
      setRoster(staffList);
      const staffMap = Object.fromEntries(staffList.map(s => [s.id, s]));
      const stateMap = Object.fromEntries(stateList.map(s => [s.lead_id, s]));
      const merged = customerList.map(c => {
        const st = stateMap[c.id];
        if (!st) return c;
        const staff = (st.staff_ids ?? []).map(id => staffMap[id]).filter(Boolean);
        return {
          ...c,
          staff,
          packageDays: st.package_days ?? undefined,
          startDate: st.start_date ?? undefined,
          shiftTime: st.shift_time ?? undefined,
          rota: st.rota ?? undefined,
          rotaReasons: st.rota_reasons ?? undefined,
          pausedDates: st.paused_dates ?? undefined,
          leaveDates: st.leave_dates ?? undefined,
          status: staff.length > 0 ? "active" : (c.status ?? "attention"),
        };
      });
      setCustomers(merged);
    }).finally(() => setCustomersLoading(false));
  }, []);
  const [travelEntries, setTravelEntries] = useState([]);

  useEffect(() => {
    fetch("/api/ops/travel").then(r => r.json()).then(data => {
      if (!Array.isArray(data)) return;
      setTravelEntries(data.map(e => ({
        id: e.id, staffId: e.staff_id, date: e.date, tripType: e.trip_type,
        from: e.from_location, to: e.to_location, distance: e.distance,
        mode: e.mode, amount: e.amount, receipt: e.receipt, notes: e.notes,
      })));
    }).catch(() => {});
  }, []);
  const [requirements, setRequirements] = useState([]);
  const [requirementsLoading, setRequirementsLoading] = useState(false);

  const [view, setView] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("ops_view") : null) ?? "customers");
  useEffect(() => { localStorage.setItem("ops_view", view); }, [view]);

  useEffect(() => {
    if (view !== "requirements") return;
    setRequirementsLoading(true);
    fetch("/api/ops/requirements")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setRequirements(d); })
      .catch(() => {})
      .finally(() => setRequirementsLoading(false));
  }, [view]);
  const [zoneFilter, setZoneFilter] = useState("All");
  const [areaFilter, setAreaFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const areasForZone = useMemo(() => {
    const staticAreas = zoneFilter === "All"
      ? Object.values(ZONE_AREAS).flat()
      : (ZONE_AREAS[zoneFilter] ?? []);
    const customerAreas = (zoneFilter === "All" ? customers : customers.filter(c => c.zone === zoneFilter)).map(c => c.area).filter(Boolean);
    return Array.from(new Set([...staticAreas, ...customerAreas])).sort();
  }, [customers, zoneFilter]);

  useEffect(() => {
    if (areaFilter !== "All" && !areasForZone.includes(areaFilter)) setAreaFilter("All");
  }, [areaFilter, areasForZone]);

  const filtered = useMemo(() => {
    let list = customers;
    if (zoneFilter !== "All") list = list.filter(c => c.zone === zoneFilter);
    if (areaFilter !== "All") list = list.filter(c => c.area === areaFilter);
    return list;
  }, [customers, zoneFilter, areaFilter]);

  const stats = useMemo(() => ({
    activeStations: customers.filter(c => c.status === "active").length,
    operators: new Set(customers.flatMap(c => c.staff.map(s => s.id))).size,
    attention: customers.filter(c => c.status === "attention" || c.staff.length === 0).length,
  }), [customers]);

  // staffId → Map<date, [{customerId, customerName, homeLat, homeLng}]>
  const conflictMap = useMemo(() => {
    const map = new Map();
    for (const c of customers) {
      const rota = buildRota(c, roster);
      for (const row of rota) {
        if (!row.staff || row.paused || row.leave || row.weeklyOff) continue;
        const sid = row.staff.id;
        if (!map.has(sid)) map.set(sid, new Map());
        const dateMap = map.get(sid);
        if (!dateMap.has(row.date)) dateMap.set(row.date, []);
        dateMap.get(row.date).push({ customerId: c.id, customerName: c.name, homeLat: c.homeLat, homeLng: c.homeLng });
      }
    }
    return map;
  }, [customers, roster]);

  const conflictCount = useMemo(() => {
    let n = 0;
    for (const dateMap of conflictMap.values()) {
      for (const entries of dateMap.values()) {
        if (entries.length > 1) n++;
      }
    }
    return n;
  }, [conflictMap]);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const c of filtered) { const arr = m.get(c.zone) ?? []; arr.push(c); m.set(c.zone, arr); }
    return m;
  }, [filtered]);

  const selected = selectedId ? customers.find(c => c.id === selectedId) ?? null : null;

  // Persist customer ops-state to Supabase
  const persistState = (c) => {
    fetch("/api/ops/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_id: c.id,
        staff_ids: (c.staff ?? []).map(s => s.id),
        package_days: c.packageDays ?? null,
        start_date: c.startDate ?? null,
        shift_time: c.shiftTime ?? null,
        rota: c.rota ?? {},
        rota_reasons: c.rotaReasons ?? {},
        paused_dates: c.pausedDates ?? [],
        leave_dates: c.leaveDates ?? [],
      }),
    }).catch(() => {});
  };

  // Operations
  const addStaff = (cid, sid) => {
    const s = roster.find(x => x.id === sid); if (!s) return;
    setCustomers(prev => prev.map(c => {
      if (c.id !== cid || c.staff.some(x => x.id === sid)) return c;
      const up = { ...c, staff: [...c.staff, s], status: "active", badge: /paus|break|unassigned|awaiting/i.test(c.badge) ? "Active" : c.badge };
      persistState(up);
      return up;
    }));
  };
  const removeStaff = (cid, sid) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== cid) return c;
      const nextStaff = c.staff.filter(x => x.id !== sid);
      const nextRota = {}, nextReasons = {};
      for (const [d, sId] of Object.entries(c.rota ?? {})) { if (sId !== sid) { nextRota[d] = sId; if (c.rotaReasons?.[d]) nextReasons[d] = c.rotaReasons[d]; } }
      const up = nextStaff.length === 0
        ? { ...c, staff: [], packageDays: undefined, startDate: undefined, shiftTime: undefined, rota: undefined, rotaReasons: undefined, pausedDates: undefined, status: "attention", badge: "Unassigned" }
        : { ...c, staff: nextStaff, rota: nextRota, rotaReasons: nextReasons };
      persistState(up);
      return up;
    }));
  };
  const setRotaDay = (cid, date, sid, reason) => setCustomers(prev => prev.map(c => {
    if (c.id !== cid) return c;
    const up = { ...c, rota: { ...(c.rota ?? {}), [date]: sid }, rotaReasons: { ...(c.rotaReasons ?? {}), [date]: reason } };
    persistState(up);
    return up;
  }));
  const createRota = (cid, packageDays, startDate, shiftTime) => setCustomers(prev => prev.map(c => {
    if (c.id !== cid) return c;
    const up = { ...c, packageDays, startDate, shiftTime, rota: {} };
    persistState(up);
    return up;
  }));
  const clearRota = (cid) => setCustomers(prev => prev.map(c => {
    if (c.id !== cid) return c;
    const up = { ...c, packageDays: undefined, startDate: undefined, shiftTime: undefined, rota: undefined };
    persistState(up);
    return up;
  }));
  const toggleRotaPause = (cid, date, reason) => setCustomers(prev => prev.map(c => {
    if (c.id !== cid) return c;
    const cur = new Set(c.pausedDates ?? []);
    const was = cur.has(date);
    if (was) cur.delete(date); else cur.add(date);
    const nextR = { ...(c.rotaReasons ?? {}) };
    if (was) delete nextR[date]; else if (reason) nextR[date] = reason;
    const up = { ...c, pausedDates: Array.from(cur), rotaReasons: nextR };
    persistState(up);
    return up;
  }));
  const toggleRotaLeave = (cid, date, reason) => setCustomers(prev => prev.map(c => {
    if (c.id !== cid) return c;
    const cur = new Set(c.leaveDates ?? []);
    const was = cur.has(date);
    if (was) cur.delete(date); else cur.add(date);
    const nextR = { ...(c.rotaReasons ?? {}) };
    if (was) delete nextR[date]; else if (reason) nextR[date] = reason;
    const up = { ...c, leaveDates: Array.from(cur), rotaReasons: nextR };
    persistState(up);
    return up;
  }));
  const extendRota = (cid, extra) => setCustomers(prev => prev.map(c => {
    if (c.id !== cid || !c.packageDays) return c;
    const up = { ...c, packageDays: c.packageDays + extra };
    persistState(up);
    return up;
  }));
  const deleteCustomer = (cid) => {
    setSelectedId(null);
    setCustomers(prev => prev.filter(c => c.id !== cid));
    fetch(`/api/ops/customers?id=${cid}`, { method: "DELETE" }).catch(() => {});
  };
  const addToRoster = ({ name, role, phone, location, languages, area, notes }) => {
    const initials = name.split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase();
    const color = PALETTE[roster.length % PALETTE.length];
    const member = { id: `s-${Date.now()}`, name, role, initials, color, phone: phone || null, location: location || null, languages: languages || null, area: area || null, notes: notes || null };
    setRoster(prev => [...prev, member]);
    fetch("/api/ops/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(member) }).catch(() => {});
  };
  const updateRoster = (updated) => {
    const initials = updated.name.split(/\s+/).map(p => p[0]).join("").slice(0, 2).toUpperCase();
    const member = { ...updated, initials };
    setRoster(prev => prev.map(s => s.id === member.id ? member : s));
    fetch("/api/ops/staff", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(member) }).catch(() => {});
  };
  const removeFromRoster = (sid) => {
    setRoster(prev => prev.filter(s => s.id !== sid));
    setCustomers(prev => prev.map(c => ({ ...c, staff: c.staff.filter(s => s.id !== sid) })));
    fetch(`/api/ops/staff?id=${sid}`, { method: "DELETE" }).catch(() => {});
  };

  const navTabs = [
    { id: "customers", label: "Customers", count: customers.length, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="5" r="2.5" /><path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" /><circle cx="12.5" cy="5" r="2" /><path d="M15 14c0-2.21-1.57-4-3.5-4" /></svg> },
    { id: "staff", label: "Staff", count: roster.length, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="3" /><path d="M2 15c0-3.31 2.69-6 6-6s6 2.69 6 6" /></svg> },
    { id: "requirements", label: "Requirements", count: requirements.length, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="10" height="12" rx="1.5" /><path d="M6 5h4M6 8h4M6 11h2" /></svg> },
    { id: "utilisation", label: "Utilisation Report", count: roster.filter(s => customers.some(c => c.staff.some(x => x.id === s.id))).length, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 13V9M6 13V5M10 13V7M14 13V3" /></svg> },
    { id: "travel", label: "Travel Expenses", count: travelEntries.length, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2C5.79 2 4 3.79 4 6c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4z" /><circle cx="8" cy="6" r="1.5" /></svg> },
    { id: "attendance", label: "Attendance Report", count: roster.length, icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2" /><path d="M5 1v4M11 1v4M2 7h12" /><path d="M5.5 10.5l2 2 3-3" /></svg> },
  ];

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#F9F8F6", fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30, backgroundColor: "rgba(15,17,21,0.4)", backdropFilter: "blur(2px)" }} />}

      {/* Sidebar */}
      <aside style={{
        width: 256, height: "100vh", display: "flex", flexDirection: "column", zIndex: 40,
        backgroundColor: "#FFFFFF", borderRight: "1px solid rgba(0,0,0,0.07)",
        position: "fixed", top: 0, left: 0,
      }}>
        <div style={{ padding: "24px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ height: 28, width: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#5F47FF", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" /><circle cx="7" cy="7" r="2" fill="rgba(255,255,255,0.85)" /></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111110", letterSpacing: "-0.01em" }}>Cradlewell</span>
          </div>
          <p style={{ margin: "6px 0 0 37px", fontSize: 10.5, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A8A8A6" }}>Operations</p>
        </div>

        <nav style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navTabs.map(tab => {
            const active = view === tab.id;
            return (
              <button key={tab.id} onClick={() => { setView(tab.id); setSidebarOpen(false); }}
                className={`ops-nav-tab${active ? " ops-nav-active" : ""}`}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 10, border: "none", textAlign: "left", cursor: "pointer", backgroundColor: active ? "rgba(95,71,255,0.08)" : "transparent", color: active ? "#5F47FF" : "#5C5C5A", fontWeight: active ? 600 : 400, fontFamily: "inherit" }}>
                <span style={{ color: active ? "#5F47FF" : "#9E9E9C", display: "flex", flexShrink: 0 }}>{tab.icon}</span>
                <span style={{ fontSize: 13, flex: 1, letterSpacing: "-0.005em" }}>{tab.label}</span>
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, fontWeight: 600, minWidth: 22, textAlign: "center", backgroundColor: active ? "#5F47FF" : "rgba(0,0,0,0.06)", color: active ? "#fff" : "#6B6B6A" }}>{tab.count}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", padding: "12px 14px 18px", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 10 }}>
            <div style={{ height: 30, width: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11.5, fontWeight: 700, background: "#5F47FF", flexShrink: 0, letterSpacing: "0.02em" }}>A</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Admin</div>
              <div style={{ fontSize: 11, color: "#A8A8A6" }}>Cradlewell</div>
            </div>
            <button onClick={onLogout} title="Sign out" style={{ padding: 6, borderRadius: 7, border: "none", background: "transparent", color: "#C0C0BE", cursor: "pointer", display: "flex", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.color = "#E5484D"} onMouseLeave={e => e.currentTarget.style.color = "#C0C0BE"}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l4-3-4-3M14 8H6" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ marginLeft: 256, padding: "28px 36px 48px", minWidth: 0 }}>
        {view === "attendance" ? <AttendanceView roster={roster} customers={customers} />
          : view === "travel" ? <TravelExpensesView roster={roster} customers={customers} entries={travelEntries} onAdd={e => {
              setTravelEntries(prev => [e, ...prev]);
              fetch("/api/ops/travel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) }).catch(() => {});
            }} onDelete={id => {
              const snapshot = travelEntries;
              setTravelEntries(prev => prev.filter(e => e.id !== id));
              fetch(`/api/ops/travel/${id}`, { method: "DELETE" })
                .then(r => {
                  if (!r.ok) throw new Error("delete failed");
                  // Re-fetch to confirm DB sync and update utilisation report
                  return fetch("/api/ops/travel").then(r2 => r2.json()).then(data => {
                    if (Array.isArray(data)) setTravelEntries(data.map(e => ({
                      id: e.id, staffId: e.staff_id, date: e.date, tripType: e.trip_type,
                      from: e.from_location, to: e.to_location, distance: e.distance,
                      mode: e.mode, amount: e.amount, receipt: e.receipt, notes: e.notes,
                    })));
                  });
                })
                .catch(() => setTravelEntries(snapshot));
            }} />
            : view === "requirements" ? <RequirementsView requirements={requirements} loading={requirementsLoading} />
              : view === "utilisation" ? <UtilisationView roster={roster} customers={customers} travelEntries={travelEntries} />
              : view === "staff" ? <StaffView roster={roster} customers={customers} onAdd={addToRoster} onRemove={removeFromRoster} onUpdate={updateRoster} />
                : (
                  <>
                    {/* Header */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 36, paddingBottom: 24, borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#30A46C" }} />
                          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#30A46C" }}>Live</span>
                        </div>
                        <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111110", letterSpacing: "-0.025em", lineHeight: 1, margin: 0 }}>Customers</h1>
                        <p style={{ fontSize: 13, marginTop: 7, color: "#9E9E9C" }}>{customers.length} clients · All zones</p>
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <StatTile value={stats.activeStations} label="Active clients" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="5" r="2.5" /><path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" /><circle cx="12.5" cy="5" r="2" /><path d="M15 14c0-2.21-1.57-4-3.5-4" /></svg>} />
                        <StatTile value={stats.operators} label="Caregivers on duty" icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="3" /><path d="M2 15c0-3.31 2.69-6 6-6s6 2.69 6 6" /></svg>} />
                        <StatTile value={stats.attention} label="Needs attention" accent={stats.attention > 0 ? "#ef4444" : undefined} icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2L1.5 13h13L8 2z" /><path d="M8 6.5v3M8 11.5v.5" /></svg>} />
                      </div>
                    </div>

                    {/* Conflict banner */}
                    {conflictCount > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "11px 16px", borderRadius: 10, backgroundColor: "#FFF5E9", border: "1px solid rgba(214,103,37,0.2)" }}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#C94010" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2L1.5 13h13L8 2z" /><path d="M8 6.5v3M8 11.5v.5" /></svg>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#C94010" }}>
                          {conflictCount} scheduling {conflictCount > 1 ? "conflicts" : "conflict"}
                        </span>
                        <span style={{ fontSize: 12, color: "#A03A0C" }}>— A caregiver is double-booked. Open a client card to review.</span>
                      </div>
                    )}

                    {/* Filters */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 16, marginBottom: 32, padding: "14px 18px", borderRadius: 12, backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(17,17,16,0.04)" }}>
                      {[["Zone", zoneFilter, v => { setZoneFilter(v); setAreaFilter("All"); }, ["All", ...ZONE_ORDER]],
                      ["Area", areaFilter, setAreaFilter, ["All", ...areasForZone]]].map(([label, val, onChange, opts]) => (
                        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 200 }}>
                          <label style={{ fontSize: 10.5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: "#A8A8A6" }}>{label}</label>
                          <div style={{ position: "relative" }}>
                            <select value={val} onChange={e => onChange(e.target.value)} style={{ fontSize: 13, fontWeight: 500, borderRadius: 9, padding: "9px 32px 9px 14px", outline: "none", cursor: "pointer", width: "100%", backgroundColor: "#F9F8F6", color: "#111110", border: "1px solid rgba(0,0,0,0.09)", appearance: "none", WebkitAppearance: "none", fontFamily: "inherit" }}>
                              {opts.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#A8A8A6" }}>
                              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5l4 4 4-4" /></svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Zone sections */}
                    <div>
                      {customersLoading && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "96px 0", gap: 12, color: "#94a3b8", fontSize: 14 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" /></path></svg>
                          Loading customers…
                        </div>
                      )}
                      {!customersLoading && ZONE_ORDER.map(z => <ZoneSection key={z} zone={z} customers={grouped.get(z) ?? []} selectedId={selectedId} onSelect={setSelectedId} />)}
                      {!customersLoading && filtered.length === 0 && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "96px 0", gap: 16 }}>
                          <div style={{ width: 56, height: 56, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9" }}>
                            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="6" /><path d="M15 15l3 3" /></svg>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>No clients found</p>
                            <p style={{ fontSize: 12, marginTop: 4, color: "#94a3b8" }}>Try adjusting your zone or area filter</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#C0C0BE" }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#30A46C", display: "inline-block" }} />
                      <span>All data live</span>
                    </div>
                  </>
                )}
      </div>

      <DetailDialog
        customer={selected}
        onClose={() => setSelectedId(null)}
        onAddStaff={addStaff}
        onRemoveStaff={removeStaff}
        onSetRotaDay={setRotaDay}
        onCreateRota={createRota}
        onClearRota={clearRota}
        allStaff={roster}
        assignedElsewhereIds={new Set(customers.filter(c => c.id !== selected?.id && cardStatus(c).label !== "Paused").flatMap(c => c.staff.map(s => s.id)))}
        onTogglePauseDay={toggleRotaPause}
        onToggleLeaveDay={toggleRotaLeave}
        onExtendRota={extendRota}
        onDeleteCustomer={deleteCustomer}
        conflictMap={conflictMap}
      />
    </div>
  );
}
