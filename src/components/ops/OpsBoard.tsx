import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Role = "MOBA" | "Nurse";
type Status = "active" | "attention" | "idle" | "transit";
type Zone = "Central" | "South" | "East" | "North";

interface Staff {
  id: string;
  name: string;
  role: Role;
  initials: string;
  color: string; // avatar color
}

interface Customer {
  id: string;
  name: string;
  zone: Zone;
  area: string; // sub-area
  staff: Staff[];
  status: Status;
  badge: string; // e.g., "Day 5 · Postnatal", "ETA 12m"
  shiftEndsInMin?: number; // if active, used to derive countdown after mount
  span?: boolean; // wide card (multi-staff)
  packageDays?: number; // e.g., 7 / 14 / 30
  startDate?: string; // ISO date YYYY-MM-DD; rota begins here
  shiftTime?: string; // display like "8am - 6pm"
  rota?: Record<string, string>; // dateISO -> staffId override
  rotaReasons?: Record<string, string>; // dateISO -> reason for staff change
  pausedDates?: string[]; // ISO dates within the rota that are paused (extend the schedule)
  leaveDates?: string[]; // ISO dates within the rota marked as caregiver leave (extend the schedule)
}

const PALETTE = [
  "#5F47FF", "#5F47FF", "#22c55e", "#f59e0b", "#a855f7",
  "#ec4899", "#06b6d4", "#f43f5e", "#84cc16", "#eab308",
];

const STAFF: Record<string, Staff> = {
  KR: { id: "1", name: "Kavitha R", role: "MOBA", initials: "K", color: PALETTE[1] },
  PS: { id: "2", name: "Priya S", role: "Nurse", initials: "P", color: PALETTE[0] },
  AM: { id: "3", name: "Anitha M", role: "MOBA", initials: "A", color: PALETTE[5] },
  RD: { id: "4", name: "Rekha D", role: "Nurse", initials: "R", color: PALETTE[3] },
  SB: { id: "5", name: "Sunita B", role: "MOBA", initials: "S", color: PALETTE[6] },
  MK: { id: "6", name: "Meena K", role: "Nurse", initials: "M", color: PALETTE[4] },
  LP: { id: "7", name: "Lakshmi P", role: "MOBA", initials: "L", color: PALETTE[2] },
  DN: { id: "8", name: "Divya N", role: "Nurse", initials: "D", color: PALETTE[7] },
  SV: { id: "9", name: "Saritha V", role: "Nurse", initials: "S", color: PALETTE[8] },
  NT: { id: "10", name: "Nirmala T", role: "MOBA", initials: "N", color: PALETTE[1] },
  UR: { id: "11", name: "Usha R", role: "Nurse", initials: "U", color: PALETTE[3] },
  PL: { id: "12", name: "Padma L", role: "MOBA", initials: "P", color: PALETTE[5] },
  GA: { id: "13", name: "Geetha A", role: "Nurse", initials: "G", color: PALETTE[2] },
  RS: { id: "14", name: "Ranjitha S", role: "MOBA", initials: "R", color: PALETTE[9] },
  VK: { id: "15", name: "Vijaya K", role: "Nurse", initials: "V", color: PALETTE[0] },
  SM: { id: "16", name: "Shobha M", role: "MOBA", initials: "S", color: PALETTE[4] },
};

const ALL_STAFF: Staff[] = Object.values(STAFF);

const INITIAL_CUSTOMERS: Customer[] = [
  // Central
  { id: "c1", name: "Sharma Family", zone: "Central", area: "Indiranagar", staff: [STAFF.KR], status: "active", badge: "Day 5 · Postnatal · 30d", shiftEndsInMin: 150 },
  { id: "c2", name: "Iyer Family", zone: "Central", area: "Malleshwaram", staff: [STAFF.RS], status: "active", badge: "Day 12 · Newborn · 30d", shiftEndsInMin: 320 },
  { id: "c3", name: "Bhat Family", zone: "Central", area: "Rajajinagar", staff: [], status: "idle", badge: "Awaiting" },

  // South
  { id: "c4", name: "Reddy Family", zone: "South", area: "Koramangala", staff: [STAFF.PS, STAFF.RD], status: "active", badge: "Day 3 · Postnatal · 30d", shiftEndsInMin: 250 },
  { id: "c5", name: "Nair Family", zone: "South", area: "Jayanagar", staff: [STAFF.RD], status: "transit", badge: "ETA 12 min" },
  { id: "c6", name: "Kapoor Family", zone: "South", area: "HSR Layout", staff: [STAFF.SB], status: "idle", badge: "On Break" },
  { id: "c7", name: "Menon Family", zone: "South", area: "JP Nagar", staff: [STAFF.NT], status: "active", badge: "Day 8 · Newborn", shiftEndsInMin: 180 },
  { id: "c8", name: "Rao Family", zone: "South", area: "Banashankari", staff: [STAFF.UR], status: "transit", badge: "ETA 8 min" },

  // East
  { id: "c9", name: "Gupta Family", zone: "East", area: "Whitefield", staff: [STAFF.AM, STAFF.MK], status: "active", badge: "Day 2 · Postnatal · 30d", shiftEndsInMin: 410 },
  { id: "c10", name: "Pillai Family", zone: "East", area: "Bellandur", staff: [STAFF.MK], status: "active", badge: "Day 7 · Newborn", shiftEndsInMin: 105 },
  { id: "c11", name: "Joshi Family", zone: "East", area: "Marathahalli", staff: [STAFF.LP], status: "active", badge: "Day 14 · Newborn", shiftEndsInMin: 240 },
  { id: "c12", name: "Verma Family", zone: "East", area: "Electronic City", staff: [STAFF.PL], status: "idle", badge: "On Break" },

  // North
  { id: "c13", name: "Singh Family", zone: "North", area: "Yelahanka", staff: [STAFF.GA], status: "active", badge: "Day 4 · Postnatal", shiftEndsInMin: 360 },
  { id: "c14", name: "Hegde Family", zone: "North", area: "Hebbal", staff: [], status: "attention", badge: "Unassigned" },

];

const ZONE_ORDER: Zone[] = ["Central", "South", "East", "North"];

const ZONE_COLORS: Record<Zone, string> = {
  Central: "#5F47FF",
  South: "#06b6d4",
  East: "#f59e0b",
  North: "#22c55e",
};

const STATUS_DOT: Record<Status, string> = {
  active: "#22c55e",
  attention: "#ef4444",
  idle: "#f59e0b",
  transit: "#06b6d4",
};

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  attention: "Attention",
  idle: "Paused",
  transit: "Active",
};

// Display name without trailing "Family"
function displayName(name: string) {
  return name.replace(/\s+Family\s*$/i, "").trim();
}

// Derive a simplified card status:
// - no staff assigned -> Attention
// - paused / on break / idle -> Paused
// - otherwise -> Active
function cardStatus(c: Customer): { label: "Active" | "Attention" | "Paused"; color: string } {
  const paused = /paus|break/i.test(c.badge) || c.status === "idle";
  if (paused) return { label: "Paused", color: "#f59e0b" };
  if (c.staff.length === 0) return { label: "Attention", color: "#ef4444" };
  return { label: "Active", color: "#22c55e" };
}

function fmtCountdown(totalSec: number) {
  const s = Math.max(0, totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function addDaysISO(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtLongDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Build rota: cycle assigned staff across packageDays, allow per-day overrides.
function buildRota(
  c: Customer,
  roster: Staff[]
): { date: string; time: string; staff: Staff | null; paused: boolean; leave: boolean; weeklyOff: boolean; wouldBe: Staff | null }[] {
  if (!c.packageDays || !c.startDate) return [];
  const pool = c.staff;
  const time = c.shiftTime ?? "8am - 6pm";
  const pausedSet = new Set(c.pausedDates ?? []);
  const leaveSet = new Set(c.leaveDates ?? []);
  const out: { date: string; time: string; staff: Staff | null; paused: boolean; leave: boolean; weeklyOff: boolean; wouldBe: Staff | null }[] = [];
  let workIdx = 0;
  // Calendar window: consume `packageDays` calendar slots from startDate.
  // Paused days AND leave days DO extend the window (caregiver did not serve, so the package day is not consumed).
  // Sunday does NOT extend it.
  let consumed = 0;
  let offset = 0;
  const cap = c.packageDays + 120;
  while (consumed < c.packageDays && offset < cap) {
    const date = addDaysISO(c.startDate, offset);
    const wouldBe = pool.length > 0 ? pool[workIdx % pool.length] : null;
    const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
    const sundayOverrideId = c.rota?.[date];
    if (leaveSet.has(date)) {
      out.push({ date, time, staff: null, paused: false, leave: true, weeklyOff: false, wouldBe });
      // leave does not consume a package day -> extends rota
    } else if (pausedSet.has(date)) {
      out.push({ date, time, staff: null, paused: true, leave: false, weeklyOff: false, wouldBe });
      // pause does not consume a package day -> extends rota
    } else if (isSunday && !sundayOverrideId) {
      out.push({ date, time, staff: null, paused: false, leave: false, weeklyOff: true, wouldBe });
      consumed++;
    } else {
      const overrideId = c.rota?.[date];
      const override = overrideId ? roster.find((s) => s.id === overrideId) ?? null : null;
      out.push({ date, time, staff: override ?? wouldBe, paused: false, leave: false, weeklyOff: false, wouldBe });
      workIdx++;
      consumed++;
    }
    offset++;
  }
  return out;
}

function useClientNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  return now;
}

function Avatar({ s, size = 28, ring }: { s: Staff; size?: number; ring?: boolean }) {
  return (
    <div
      title={`${s.name} · ${s.role}`}
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: s.color,
        fontSize: size * 0.42,
        boxShadow: ring ? "0 0 0 2px #ffffff, 0 1px 2px rgba(15,17,21,0.08)" : undefined,
      }}
    >
      {s.initials}
    </div>
  );
}

function CustomerCard({ c, now, selected, onSelect }: { c: Customer; now: number | null; selected: boolean; onSelect: () => void }) {
  const cs = cardStatus(c);
  const dot = cs.color;
  const isWide = !!c.span;
  void now;

  return (
    <button
      onClick={onSelect}
      className={`group relative text-left rounded-[24px] p-6 transition-all flex flex-col justify-between min-h-[140px] hover:shadow-lg hover:-translate-y-0.5 ${isWide ? "sm:col-span-2" : ""}`}
      style={{
        backgroundColor: "#ffffff",
        border: selected ? "1.5px solid #5F47FF" : "1px solid #e2e8f0",
        boxShadow: selected
          ? "0 0 0 4px rgba(95,71,255,0.12), 0 4px 16px rgba(95,71,255,0.12)"
          : "0 2px 8px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="text-[#1e293b] font-bold text-[16px] leading-tight truncate">{displayName(c.name)}</div>
          <div className="text-[11px] mt-1 font-medium" style={{ color: "#94a3b8" }}>{c.area}</div>
        </div>
        <span
          className={`w-3 h-3 rounded-full mt-1 shrink-0${cs.label === "Active" ? " animate-pulse" : ""}`}
          style={{ backgroundColor: dot, boxShadow: `0 0 0 4px ${dot}1a` }}
        />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center -space-x-2">
          {c.staff.length === 0 ? (
            <span className="text-[11px] font-medium" style={{ color: "#94a3b8" }}>No staff assigned</span>
          ) : (
            c.staff.map((s) => <Avatar key={s.id} s={s} ring />)
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[11px] rounded-full px-3 py-1.5 font-bold uppercase tracking-[0.12em]"
            style={{
              backgroundColor: `${dot}14`,
              color: dot,
              border: `1px solid ${dot}33`,
            }}
          >
            {cs.label}
          </span>
        </div>
      </div>
    </button>
  );
}

function SelectField({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[220px]">
      <label className="text-[11px] font-bold uppercase tracking-[0.16em] px-1" style={{ color: "#94a3b8" }}>
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-[13px] font-medium rounded-xl px-4 py-3 outline-none cursor-pointer w-full pr-9"
          style={{
            backgroundColor: "#ffffff",
            color: "#1e293b",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
            minWidth: 220,
            appearance: "none",
            WebkitAppearance: "none",
          } as React.CSSProperties}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#94a3b8" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5l4 4 4-4"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

function StatTile({ value, label, accent }: { value: number | string; label: string; accent?: string }) {
  const isAccent = !!accent;
  return (
    <div
      className="rounded-2xl px-6 py-3 min-w-[140px] flex flex-col justify-center"
      style={{
        background: isAccent ? "linear-gradient(135deg,#fff1f2,#ffe4e6)" : "linear-gradient(135deg,#ffffff,#f8fafc)",
        border: `1px solid ${isAccent ? "#fecdd3" : "#e2e8f0"}`,
        boxShadow: "0 2px 8px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <div className="text-[24px] font-bold leading-none" style={{ color: isAccent ? "#e11d48" : "#0f172a" }}>{value}</div>
      <div className="text-[11px] mt-1.5 font-semibold uppercase tracking-wider" style={{ color: isAccent ? "#fb7185" : "#94a3b8" }}>{label}</div>
    </div>
  );
}

function ZoneSection({ zone, customers, now, selectedId, onSelect }: { zone: Zone; customers: Customer[]; now: number | null; selectedId: string | null; onSelect: (id: string) => void }) {
  if (customers.length === 0) return null;
  const zoneColor = ZONE_COLORS[zone];
  return (
    <section className="mb-12">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: zoneColor }} />
          <h2 className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: "#475569" }}>{zone}</h2>
        </div>
        <div className="flex-1 h-px" style={{ backgroundColor: "#e2e8f0" }} />
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider"
          style={{ backgroundColor: `${zoneColor}14`, color: zoneColor, border: `1px solid ${zoneColor}33` }}
        >
          {customers.length} {customers.length === 1 ? "Client" : "Clients"}
        </span>
      </div>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {customers.map((c) => (
          <CustomerCard key={c.id} c={c} now={now} selected={selectedId === c.id} onSelect={() => onSelect(c.id)} />
        ))}
      </div>
    </section>
  );
}

function DetailDialog({
  customer,
  onClose,
  onAddStaff,
  onRemoveStaff,
  onSetRotaDay,
  onCreateRota,
  onClearRota,
  allStaff,
  assignedElsewhereIds,
  onTogglePauseDay,
  onToggleLeaveDay,
  onExtendRota,
  onDeleteCustomer,
}: {
  customer: Customer | null;
  onClose: () => void;
  onAddStaff: (customerId: string, staffId: string) => void;
  onRemoveStaff: (customerId: string, staffId: string) => void;
  onSetRotaDay: (customerId: string, dateISO: string, staffId: string, reason: string) => void;
  onCreateRota: (customerId: string, packageDays: number, startDate: string, shiftTime: string) => void;
  onClearRota: (customerId: string) => void;
  allStaff: Staff[];
  assignedElsewhereIds: Set<string>;
  onTogglePauseDay: (customerId: string, dateISO: string, reason?: string) => void;
  onToggleLeaveDay: (customerId: string, dateISO: string, reason?: string) => void;
  onExtendRota: (customerId: string, extraDays: number) => void;
  onDeleteCustomer: (customerId: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editDay, setEditDay] = useState<string | null>(null);
  const editDayRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!editDay) return;
    const handler = (e: MouseEvent) => {
      if (editDayRef.current && !editDayRef.current.contains(e.target as Node)) {
        setEditDay(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editDay]);
  const [newPackage, setNewPackage] = useState<string>("30");
  const [newStart, setNewStart] = useState<string>(todayISO());
  const [newShift, setNewShift] = useState<string>("8am - 6pm");
  const [pendingChange, setPendingChange] = useState<
    | { date: string; action: "change"; staffId: string }
    | { date: string; action: "pause" | "leave" }
    | null
  >(null);
  const [reasonText, setReasonText] = useState("");
  const [extendDays, setExtendDays] = useState<string>("7");
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!customer) return null;
  const assignedIds = new Set(customer.staff.map((s) => s.id));
  const available = allStaff.filter((s) => !assignedIds.has(s.id) && !assignedElsewhereIds.has(s.id));
  const rotaPickList = allStaff.filter((s) => !assignedElsewhereIds.has(s.id));
  const rota = buildRota(customer, allStaff);
  const today = todayISO();
  const hasRota = !!(customer.packageDays && customer.startDate);

  const downloadRota = () => {
    if (!hasRota) return;
    const rows = [["Day", "Date", "Time", "Caregiver", "Reason"]];
    rota.forEach((r, idx) => {
      rows.push([
        String(idx + 1),
        r.date,
        r.time,
        r.paused ? "— Paused —" : r.leave ? "— Leave —" : r.staff?.name ?? "Unassigned",
        customer.rotaReasons?.[r.date] ?? "",
      ]);
    });
    const csv = rows
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rota-${displayName(customer.name).replace(/\s+/g, "-")}-${customer.startDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "rgba(15,17,21,0.32)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[880px] max-h-[92vh] overflow-y-auto p-7 rounded-[16px]"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 24px 60px rgba(15,17,21,0.12), 0 4px 12px rgba(15,17,21,0.04)",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: "#5F47FF" }}>{customer.zone}</div>
            <h3 className="text-[#0f1115] text-[18px] font-semibold mt-1">{displayName(customer.name)}</h3>
            <div className="text-[12px]" style={{ color: "#7a7a86" }}>{customer.area}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#94a3b8" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 1l12 12M13 1L1 13"/></svg>
            </button>
          </div>
        </div>

        <div
          className="rounded-[12px] p-3 mb-4 flex items-center justify-between"
          style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          <div>
            <div className="text-[11px]" style={{ color: "#7a7a86" }}>Status</div>
            <div className="text-[#0f1115] text-[13px] font-medium mt-0.5">{cardStatus(customer).label}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px]" style={{ color: "#7a7a86" }}>Service</div>
            <div className="text-[#0f1115] text-[13px] font-medium mt-0.5">{customer.badge}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[11px] uppercase tracking-wider" style={{ color: "#7a7a86" }}>
            Assigned Staff ({customer.staff.length})
          </h4>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="text-[11px] font-medium rounded-md px-2 py-1"
            style={{ backgroundColor: "#5F47FF", color: "#ffffff" }}
          >
            {pickerOpen ? "Cancel" : "+ Add Staff"}
          </button>
        </div>

        {pickerOpen && (
          <div className="rounded-[10px] mb-3 p-2 max-h-[220px] overflow-y-auto" style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
            {available.length === 0 && (
              <div className="text-[11px] text-center py-3" style={{ color: "#7a7a86" }}>
                All caregivers already assigned
              </div>
            )}
            {available.map((s) => (
              <button
                key={s.id}
                onClick={() => { onAddStaff(customer.id, s.id); setPickerOpen(false); }}
                className="w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-[#f1f5f9] transition"
              >
                <Avatar s={s} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-[#0f1115] text-[12px] font-medium truncate">{s.name}</div>
                  <div className="text-[11px]" style={{ color: "#7a7a86" }}>{s.role}</div>
                </div>
                <span className="text-[14px]" style={{ color: "#22c55e" }}>+</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {customer.staff.length === 0 && (
            <div className="text-[12px] py-3 text-center rounded-[10px]" style={{ color: "#7a7a86", border: "1px dashed #e2e8f0" }}>
              No staff assigned yet
            </div>
          )}
          {customer.staff.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-[10px] p-2.5" style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
              <Avatar s={s} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-[#0f1115] text-[13px] font-medium truncate">{s.name}</div>
                <div className="text-[11px]" style={{ color: "#7a7a86" }}>{s.role}</div>
              </div>
              <button
                onClick={() => onRemoveStaff(customer.id, s.id)}
                aria-label={`Remove ${s.name}`}
                title={`Remove ${s.name}`}
                className="w-7 h-7 flex items-center justify-center rounded-md text-[#94a3b8] hover:text-[#ef4444] hover:bg-red-50 transition"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 1l10 10M11 1L1 11"/></svg>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] uppercase tracking-wider" style={{ color: "#7a7a86" }}>
              Rota Schedule {hasRota ? `· ${customer.packageDays}-day package` : ""}
            </h4>
            {hasRota && (
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadRota}
                  className="text-[11px] font-medium rounded-md px-2 py-1"
                  style={{ backgroundColor: "#5F47FF", color: "#ffffff" }}
                >
                  ↓ Download CSV
                </button>
                <button
                  onClick={() => onClearRota(customer.id)}
                  className="text-[11px] font-medium rounded-md px-2 py-1"
                  style={{ backgroundColor: "transparent", color: "#ef4444", border: "1px solid #ef444466" }}
                >
                  Reset Rota
                </button>
              </div>
            )}
          </div>

          {hasRota && (
            <div className="rounded-[10px] p-3 mb-3 flex items-center gap-2 flex-wrap"
              style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <span className="text-[11px] font-semibold" style={{ color: "#0f1115" }}>Extend rota</span>
              <span className="text-[11px]" style={{ color: "#7a7a86" }}>Client wants to continue — add more days</span>
              <input
                type="number"
                min={1}
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                className="text-[12px] rounded-md px-2 py-[5px] outline-none w-[80px] ml-auto"
                style={{ backgroundColor: "#ffffff", color: "#0f1115", border: "1px solid #e2e8f0" }}
              />
              <span className="text-[11px]" style={{ color: "#7a7a86" }}>days</span>
              <button
                onClick={() => {
                  const n = Math.max(1, Math.floor(Number(extendDays) || 0));
                  if (n < 1) return;
                  onExtendRota(customer.id, n);
                }}
                className="text-[11px] font-semibold rounded-md px-3 py-[6px]"
                style={{ backgroundColor: "#22c55e", color: "#ffffff" }}
              >
                + Extend
              </button>
            </div>
          )}

          {!hasRota && (
            <div className="rounded-[10px] p-3 space-y-3" style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
              <p className="text-[11px]" style={{ color: "#7a7a86" }}>
                No rota set. Configure a package to generate a day-by-day schedule.
              </p>
              <div>
                <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "#7a7a86" }}>Package length (days)</div>
                <input
                  type="number"
                  min={1}
                  value={newPackage}
                  onChange={(e) => setNewPackage(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full text-[13px] rounded-md px-3 py-[8px] outline-none"
                  style={{ backgroundColor: "#ffffff", color: "#0f1115", border: "1px solid #e2e8f0" }}
                />
                <div className="text-[11px] mt-1" style={{ color: "#7a7a86" }}>Enter any number of days</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "#7a7a86" }}>Start date</div>
                <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)}
                  className="w-full text-[12px] rounded-md px-2 py-[6px] outline-none"
                  style={{ backgroundColor: "#ffffff", color: "#0f1115", border: "1px solid #e2e8f0" }} />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "#7a7a86" }}>Shift time</div>
                <select value={newShift} onChange={(e) => setNewShift(e.target.value)}
                  className="w-full text-[12px] rounded-md px-2 py-[6px] outline-none"
                  style={{ backgroundColor: "#ffffff", color: "#0f1115", border: "1px solid #e2e8f0" }}>
                  <option>8am - 6pm</option>
                  <option>6am - 6pm</option>
                  <option>6pm - 6am</option>
                  <option>9am - 9pm</option>
                  <option>24 hours</option>
                </select>
              </div>
              <button
                onClick={() => {
                  const n = Math.max(1, Math.floor(Number(newPackage) || 0));
                  if (n < 1) return;
                  onCreateRota(customer.id, n, newStart, newShift);
                }}
                disabled={customer.staff.length === 0 || !(Number(newPackage) >= 1)}
                className="w-full text-[12px] font-semibold rounded-md py-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#5F47FF", color: "#ffffff" }}>
                {customer.staff.length === 0 ? "Assign staff first" : "Create Rota"}
              </button>
            </div>
          )}

          {hasRota && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] tracking-wide" style={{ color: "#7a7a86" }}>
                  <span style={{ color: "#0f1115", fontWeight: 600 }}>Starts</span> · {fmtLongDate(customer.startDate!).split(",")[0]}
                  <span className="mx-2" style={{ color: "#cbd5e1" }}>•</span>
                  <span style={{ color: "#0f1115", fontWeight: 600 }}>{customer.shiftTime}</span>
                </div>
                <span className="text-[11px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#f1f5f9", color: "#5F47FF", fontWeight: 600, letterSpacing: "0.14em" }}>
                  {rota.length} days
                </span>
              </div>
              <div className="rounded-[14px] overflow-hidden"
                style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 0 rgba(15,17,21,0.02), 0 12px 32px -20px rgba(15,17,21,0.18)" }}>
                <div className="grid grid-cols-[1.5fr_0.9fr_1.1fr_1.2fr] text-[11px] uppercase tracking-[0.14em] px-4 py-3"
                  style={{ backgroundColor: "#f8fafc", color: "#9a9aa6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
                  <span>Date</span><span>Time</span><span>Caregiver</span><span>Reason</span>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {rota.map((r, idx) => {
                    const isStart = r.date === customer.startDate;
                    const isToday = r.date === today;
                    return (
                      <div key={r.date}
                        className="grid grid-cols-[1.5fr_0.9fr_1.1fr_1.2fr] items-center gap-2 px-4 py-3 text-[13px] transition-colors hover:bg-[#f8fafc]"
                        style={{
                          borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
                          backgroundColor: isStart
                            ? "rgba(95,71,255,0.06)"
                            : isToday
                              ? "rgba(99,136,255,0.05)"
                              : "#ffffff",
                        }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="inline-flex items-center justify-center text-[11px] font-semibold rounded-md shrink-0"
                            style={{
                              width: 26, height: 22,
                              backgroundColor: isStart ? "#5F47FF" : isToday ? "#5F47FF" : "#f1f5f9",
                              color: isStart || isToday ? "#ffffff" : "#7a7a86",
                              letterSpacing: "0.02em",
                            }}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="truncate" style={{
                            color: isStart ? "#5F47FF" : isToday ? "#5F47FF" : "#0f1115",
                            fontWeight: isStart || isToday ? 600 : 500,
                            letterSpacing: "-0.005em",
                          }}>
                            {fmtLongDate(r.date)}
                          </span>
                        </div>
                        <span style={{ color: "#7a7a86", fontVariantNumeric: "tabular-nums" }}>{r.time}</span>
                        <div className="relative flex items-center gap-1.5" ref={editDay === r.date ? editDayRef : undefined}>
                          <button
                            onClick={() => { if (!r.paused && !r.leave) setEditDay(editDay === r.date ? null : r.date); }}
                            disabled={r.paused || r.leave}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left rounded-md px-1.5 py-1 -mx-1.5 hover:bg-[#f1f5f9] transition-colors disabled:hover:bg-transparent"
                          >
                            {r.paused ? (
                              <span className="text-[11px] font-semibold inline-flex items-center px-2 py-1 rounded-md"
                                style={{ color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.10)", letterSpacing: "0.04em" }}>
                                PAUSED
                              </span>
                            ) : r.leave ? (
                              <span className="text-[11px] font-semibold inline-flex items-center px-2 py-1 rounded-md"
                                style={{ color: "#a855f7", backgroundColor: "rgba(168,85,247,0.10)", letterSpacing: "0.04em" }}>
                                LEAVE
                              </span>
                            ) : r.weeklyOff ? (
                              <span className="text-[11px] font-semibold inline-flex items-center px-2 py-1 rounded-md"
                                style={{ color: "#0ea5e9", backgroundColor: "rgba(14,165,233,0.10)", letterSpacing: "0.04em" }}>
                                WEEKLY OFF
                              </span>
                            ) : r.staff ? (
                              <>
                                <Avatar s={r.staff} size={22} />
                                <span className="text-[#0f1115] text-[13px] truncate" style={{ fontWeight: 500 }}>{r.staff.name.split(" ")[0]}</span>
                              </>
                            ) : (
                              <span className="text-[11px] font-medium" style={{ color: "#ef4444" }}>Unassigned</span>
                            )}
                            {!r.paused && !r.leave && (
                              <span className="ml-auto text-[11px] opacity-60" style={{ color: "#7a7a86" }}>▾</span>
                            )}
                          </button>
                          {r.paused ? (
                            <button
                              onClick={() => onTogglePauseDay(customer.id, r.date)}
                              title="Resume this day"
                              className="text-[11px] font-semibold uppercase tracking-[0.08em] px-2 py-1 rounded-md shrink-0 transition-colors"
                              style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.10)" }}
                            >
                              Resume
                            </button>
                          ) : r.leave ? (
                            <button
                              onClick={() => onToggleLeaveDay(customer.id, r.date)}
                              title="Cancel leave for this day"
                              className="text-[11px] font-semibold uppercase tracking-[0.08em] px-2 py-1 rounded-md shrink-0 transition-colors"
                              style={{ color: "#22c55e", backgroundColor: "rgba(34,197,94,0.10)" }}
                            >
                              Resume
                            </button>
                          ) : r.weeklyOff ? null : (
                            <>
                              <button
                                onClick={() => { setReasonText(""); setPendingChange({ date: r.date, action: "pause" }); }}
                                title="Pause this day (extends rota)"
                                className="text-[11px] font-semibold uppercase tracking-[0.08em] px-2 py-1 rounded-md shrink-0 transition-colors"
                                style={{ color: "#7a7a86", backgroundColor: "#f1f5f9" }}
                              >
                                Pause
                              </button>
                              <button
                                onClick={() => { setReasonText(""); setPendingChange({ date: r.date, action: "leave" }); }}
                                title="Mark caregiver leave for this day (extends rota)"
                                className="text-[11px] font-semibold uppercase tracking-[0.08em] px-2 py-1 rounded-md shrink-0 transition-colors"
                                style={{ color: "#a855f7", backgroundColor: "rgba(168,85,247,0.10)" }}
                              >
                                Leave
                              </button>
                            </>
                          )}
                          {!r.paused && !r.leave && editDay === r.date && (
                            <div className="absolute right-0 top-full mt-1.5 z-10 w-[200px] max-h-[220px] overflow-y-auto rounded-[10px] p-1.5"
                              style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 16px 36px -12px rgba(15,17,21,0.18)" }}>
                              {(r.weeklyOff ? available : rotaPickList).map((s) => (
                                <button key={s.id}
                                  onClick={() => {
                                    setEditDay(null);
                                    if (r.staff && r.staff.id === s.id) return;
                                    setReasonText("");
                                    setPendingChange({ date: r.date, action: "change", staffId: s.id });
                                  }}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#f8fafc] text-left transition-colors">
                                  <Avatar s={s} size={20} />
                                  <span className="text-[#0f1115] text-[13px] truncate" style={{ fontWeight: 500 }}>{s.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {customer.rotaReasons?.[r.date] ? (
                          <span className="text-[12px] truncate inline-flex items-center px-2 py-1 rounded-md w-fit"
                            style={{ color: "#5F47FF", backgroundColor: "rgba(95,71,255,0.08)", fontWeight: 500 }}
                            title={customer.rotaReasons?.[r.date]}>
                            {customer.rotaReasons?.[r.date]}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 pt-4 flex items-center justify-start" style={{ borderTop: "1px solid #f1f5f9" }}>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[12px] font-medium rounded-lg px-3 py-1.5 transition-colors hover:bg-red-50"
            style={{ color: "#ef4444" }}
          >
            Delete client
          </button>
        </div>

        {pendingChange && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(15,17,21,0.45)", backdropFilter: "blur(4px)" }}
            onClick={() => setPendingChange(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] rounded-[14px] p-5"
              style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 20px 40px rgba(15,17,21,0.18)" }}
            >
              <h4 className="text-[#0f1115] text-[15px] font-semibold mb-1">Reason</h4>
              <p className="text-[11px] mb-3" style={{ color: "#7a7a86" }}>
                {fmtLongDate(pendingChange.date)} — {
                  pendingChange.action === "pause"
                    ? "please record why this day is being paused."
                    : pendingChange.action === "leave"
                      ? "please record why the caregiver is on leave."
                      : "please record why this change is being made."
                }
              </p>
              <textarea
                autoFocus
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={
                  pendingChange.action === "pause"
                    ? "e.g. Client travelling, family event, hospitalisation…"
                    : pendingChange.action === "leave"
                      ? "e.g. Sick leave, personal emergency, planned leave…"
                      : "e.g. Original caregiver on leave, client request, emergency cover…"
                }
                rows={3}
                className="w-full text-[13px] rounded-md px-3 py-2 outline-none resize-none"
                style={{ backgroundColor: "#ffffff", color: "#0f1115", border: "1px solid #e2e8f0" }}
              />
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={() => setPendingChange(null)}
                  className="text-[12px] rounded-md px-3 py-1.5"
                  style={{ backgroundColor: "transparent", color: "#7a7a86", border: "1px solid #e2e8f0" }}
                >
                  Cancel
                </button>
                <button
                  disabled={!reasonText.trim()}
                  onClick={() => {
                    if (pendingChange.action === "change") {
                      onSetRotaDay(customer.id, pendingChange.date, pendingChange.staffId, reasonText.trim());
                    } else if (pendingChange.action === "pause") {
                      onTogglePauseDay(customer.id, pendingChange.date, reasonText.trim());
                    } else {
                      onToggleLeaveDay(customer.id, pendingChange.date, reasonText.trim());
                    }
                    setPendingChange(null);
                    setReasonText("");
                  }}
                  className="text-[12px] font-semibold rounded-md px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#5F47FF", color: "#ffffff" }}
                >
                  {pendingChange.action === "pause" ? "Pause day" : pendingChange.action === "leave" ? "Mark leave" : "Save Change"}
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(15,17,21,0.45)", backdropFilter: "blur(4px)" }}
            onClick={() => setConfirmDelete(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] rounded-[14px] p-5"
              style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 20px 40px rgba(15,17,21,0.18)" }}
            >
              <h4 className="text-[#0f1115] text-[15px] font-semibold mb-1">Delete this client?</h4>
              <p className="text-[12px] mb-4" style={{ color: "#7a7a86" }}>
                {displayName(customer.name)} will be removed from operations along with their rota and staff assignments. This cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-[12px] rounded-md px-3 py-1.5"
                  style={{ backgroundColor: "transparent", color: "#7a7a86", border: "1px solid #e2e8f0" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmDelete(false);
                    onDeleteCustomer(customer.id);
                  }}
                  className="text-[12px] font-semibold rounded-md px-3 py-1.5"
                  style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
                >
                  Delete client
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function OpsBoard() {
  return <OpsBoardInner />;
}

function StaffView({
  roster,
  customers,
  newStaffName,
  setNewStaffName,
  newStaffRole,
  setNewStaffRole,
  onAdd,
  onRemove,
}: {
  roster: Staff[];
  customers: Customer[];
  newStaffName: string;
  setNewStaffName: (v: string) => void;
  newStaffRole: Role;
  setNewStaffRole: (v: Role) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const assignmentsByStaff = useMemo(() => {
    const m = new Map<string, Customer[]>();
    for (const c of customers) {
      for (const s of c.staff) {
        const arr = m.get(s.id) ?? [];
        arr.push(c);
        m.set(s.id, arr);
      }
    }
    return m;
  }, [customers]);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#5F47FF", boxShadow: "0 0 8px #5F47FF" }} />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "#5F47FF" }}>Roster</span>
          </div>
          <h1 className="text-[#0f1115] text-[36px] sm:text-[44px] font-bold tracking-tight leading-none">Staff</h1>
          <p className="text-[12px] mt-2" style={{ color: "#7a7a86" }}>{roster.length} caregivers · Manage your team</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Add staff card */}
        <div className="rounded-[14px] p-5 h-fit"
          style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 1px 0 rgba(15,17,21,0.02), 0 12px 32px -20px rgba(15,17,21,0.18)" }}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: "#7a7a86" }}>Add Staff</div>
          <label className="block text-[11px] mb-1" style={{ color: "#7a7a86" }}>Full name</label>
          <input
            value={newStaffName}
            onChange={(e) => setNewStaffName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
            placeholder="e.g. Anjali Krishnan"
            className="w-full text-[13px] rounded-md px-3 py-2 outline-none mb-3"
            style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", color: "#0f1115" }}
          />
          <label className="block text-[11px] mb-1" style={{ color: "#7a7a86" }}>Role</label>
          <select
            value={newStaffRole}
            onChange={(e) => setNewStaffRole(e.target.value as Role)}
            className="w-full text-[13px] rounded-md px-3 py-2 outline-none mb-4 cursor-pointer"
            style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", color: "#0f1115" }}
          >
            <option value="MOBA">MOBA</option>
            <option value="Nurse">Nurse</option>
          </select>
          <button
            onClick={onAdd}
            disabled={!newStaffName.trim()}
            className="w-full text-[13px] font-semibold rounded-md py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#5F47FF", color: "#ffffff" }}
          >
            + Add to Roster
          </button>
        </div>

        {/* Roster list */}
        <div className="rounded-[14px] overflow-hidden"
          style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 1px 0 rgba(15,17,21,0.02), 0 12px 32px -20px rgba(15,17,21,0.18)" }}>
          <div className="grid grid-cols-[1.4fr_0.6fr_1.6fr_60px] text-[11px] uppercase tracking-[0.14em] px-4 py-3"
            style={{ backgroundColor: "#f8fafc", color: "#9a9aa6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
            <span>Caregiver</span><span>Role</span><span>Active assignments</span><span></span>
          </div>
          <div>
            {roster.map((s, idx) => {
              const assigned = assignmentsByStaff.get(s.id) ?? [];
              return (
                <div key={s.id}
                  className="grid grid-cols-[1.4fr_0.6fr_1.6fr_60px] items-start gap-2 px-4 py-3 text-[13px] hover:bg-[#f8fafc] transition-colors"
                  style={{ borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}>
                  <div className="flex items-center gap-3 min-w-0 pt-0.5">
                    <Avatar s={s} size={32} />
                    <div className="min-w-0">
                      <div className="text-[#0f1115] truncate" style={{ fontWeight: 500 }}>{s.name}</div>
                      <div className="text-[11px]" style={{ color: "#9a9aa6" }}>
                        {assigned.length === 0 ? "Available" : `${assigned.length} client${assigned.length > 1 ? "s" : ""}`}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.1em] inline-flex items-center px-2 py-1 rounded-md w-fit mt-1"
                    style={{ backgroundColor: "#f1f5f9", color: "#5F47FF", fontWeight: 600 }}>{s.role}</span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0 pt-1">
                    {assigned.length === 0 ? (
                      <span className="text-[12px]" style={{ color: "#c9c6bc" }}>—</span>
                    ) : (
                      assigned.map((c) => (
                        <span key={c.id} className="text-[#0f1115] text-[13px] truncate" style={{ fontWeight: 500 }}>
                          {displayName(c.name)}
                        </span>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => onRemove(s.id)}
                    className="text-[11px] px-2 py-1 rounded justify-self-end mt-1"
                    style={{ color: "#ef4444" }}
                    title="Remove"
                  >Remove</button>
                </div>
              );
            })}
            {roster.length === 0 && (
              <div className="text-center py-12 text-[13px]" style={{ color: "#7a7a86" }}>No staff yet — add your first caregiver →</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UtilisationView({ roster, customers }: { roster: Staff[]; customers: Customer[] }) {
  const [roleFilter, setRoleFilter] = useState<"All" | Role>("All");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [fyFilter, setFyFilter] = useState<string>("All"); // e.g. "2026-2027"
  const [monthFilter, setMonthFilter] = useState<string>("All"); // YYYY-MM

  // Indian financial year helpers (Apr-Mar)
  const fyOfDate = (iso: string) => {
    const [y, m] = iso.split("-").map(Number);
    const startY = m >= 4 ? y : y - 1;
    return `${startY}-${startY + 1}`;
  };
  const monthsOfFy = (fy: string) => {
    const startY = Number(fy.split("-")[0]);
    const out: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const monthIdx = 3 + i; // 3 = April (0-indexed)
      const d = new Date(startY, monthIdx, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({ value: ym, label: d.toLocaleString("default", { month: "long", year: "numeric" }) });
    }
    return out;
  };

  // Discover financial years that appear in any customer's rota window
  const fyList = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      if (!c.startDate || !c.packageDays) continue;
      const span = c.packageDays + 60;
      for (let i = 0; i < span; i += 15) {
        set.add(fyOfDate(addDaysISO(c.startDate, i)));
      }
      set.add(fyOfDate(addDaysISO(c.startDate, span)));
    }
    // Always include 10 FYs starting from the current FY going forward
    const currentFy = fyOfDate(new Date().toISOString().slice(0, 10));
    const currentStart = Number(currentFy.split("-")[0]);
    for (let i = 0; i < 10; i++) {
      const y = currentStart + i;
      set.add(`${y}-${y + 1}`);
    }
    // Only keep FYs from the current one onward
    return Array.from(set)
      .filter((fy) => Number(fy.split("-")[0]) >= currentStart)
      .sort();
  }, [customers]);

  const monthOptions = useMemo(() => (fyFilter === "All" ? [] : monthsOfFy(fyFilter)), [fyFilter]);

  // Reset month when FY changes if month no longer in range
  useEffect(() => {
    if (fyFilter === "All") { setMonthFilter("All"); return; }
    if (monthFilter !== "All" && !monthOptions.some((m) => m.value === monthFilter)) {
      setMonthFilter("All");
    }
  }, [fyFilter, monthOptions, monthFilter]);

  const dateInScope = (date: string) => {
    if (monthFilter !== "All") return date.startsWith(monthFilter);
    if (fyFilter !== "All") return fyOfDate(date) === fyFilter;
    return true;
  };

  const rows = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return roster.map((staff) => {
      const assigned = customers.filter((c) => c.staff.some((x) => x.id === staff.id));
      let planned = 0;   // present + absent + leave (working days this caregiver was scheduled)
      let completed = 0; // present
      let leaveDays = 0; // leave
      for (const c of assigned) {
        if (!c.packageDays || !c.startDate) continue;
        const pool = c.staff;
        if (pool.length === 0) continue;
        const pausedSet = new Set(c.pausedDates ?? []);
        const leaveSet = new Set(c.leaveDates ?? []);
        let workIdx = 0;
        let consumed = 0;
        let offset = 0;
        const cap = c.packageDays + 120;
        while (consumed < c.packageDays && offset < cap) {
          const date = addDaysISO(c.startDate, offset);
          const wouldBe = pool[workIdx % pool.length];
          const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
          const sundayOverrideId = c.rota?.[date];
          const inScope = dateInScope(date);
          if (isSunday && !sundayOverrideId) {
            // Sunday weekly off — excluded from planned unless explicitly assigned
            consumed++;
          } else if (leaveSet.has(date)) {
            // Leave — staff did not serve, but day was still scheduled
            if (inScope && wouldBe?.id === staff.id) { planned++; leaveDays++; }
            consumed++;
          } else if (pausedSet.has(date)) {
            // Pause extends the rota — does NOT consume a package day, not counted as planned
          } else {
            const overrideId = c.rota?.[date];
            const actual = overrideId
              ? (roster.find((s) => s.id === overrideId) ?? wouldBe)
              : wouldBe;
            if (inScope && actual?.id === staff.id) {
              planned++;
              if (date <= today) completed++;
            }
            workIdx++;
            consumed++;
          }
          offset++;
        }
      }
      const utilisation = planned === 0 ? 0 : Math.round((completed / planned) * 1000) / 10;
      const leaveRate = planned === 0 ? 0 : Math.round((leaveDays / planned) * 1000) / 10;
      const status = planned === 0 ? "Idle" : utilisation >= 85 ? "Healthy" : utilisation >= 70 ? "Watch" : "At Risk";
      return { staff, clients: assigned.length, planned, completed, leaveDays, utilisation, leaveRate, status };
    }).sort((a, b) => b.utilisation - a.utilisation);
  }, [roster, customers, fyFilter, monthFilter]);

  const filteredRows = useMemo(
    () => (roleFilter === "All" ? rows : rows.filter((r) => r.staff.role === roleFilter)),
    [rows, roleFilter]
  );
  const totalCaregivers = filteredRows.length;
  const utilisedCount = filteredRows.filter((r) => r.planned > 0).length;
  const avgUtil = utilisedCount === 0 ? 0 : Math.round(filteredRows.filter((r) => r.planned > 0).reduce((s, r) => s + r.utilisation, 0) / utilisedCount);
  const idleCount = totalCaregivers - utilisedCount;

  // Monthly breakdown for the selected staff
  const selectedStaff = roster.find((s) => s.id === selectedStaffId) ?? null;
  const monthlyRows = useMemo(() => {
    if (!selectedStaff) return [];
    const today = new Date().toISOString().slice(0, 10);
    const buckets = new Map<string, { planned: number; completed: number; leave: number }>();
    const assigned = customers.filter((c) => c.staff.some((x) => x.id === selectedStaff.id));
    for (const c of assigned) {
      if (!c.packageDays || !c.startDate) continue;
      const pool = c.staff;
      if (pool.length === 0) continue;
      const pausedSet = new Set(c.pausedDates ?? []);
      const leaveSet = new Set(c.leaveDates ?? []);
      let workIdx = 0;
      let consumed = 0;
      let offset = 0;
      const cap = c.packageDays + 120;
      while (consumed < c.packageDays && offset < cap) {
        const date = addDaysISO(c.startDate, offset);
        const ym = date.slice(0, 7);
        const wouldBe = pool[workIdx % pool.length];
        const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
        const sundayOverrideId = c.rota?.[date];
        const get = () => {
          let b = buckets.get(ym);
          if (!b) { b = { planned: 0, completed: 0, leave: 0 }; buckets.set(ym, b); }
          return b;
        };
        if (isSunday && !sundayOverrideId) {
          consumed++;
        } else if (leaveSet.has(date)) {
          if (wouldBe?.id === selectedStaff.id) { const b = get(); b.planned++; b.leave++; }
          consumed++;
        } else if (pausedSet.has(date)) {
          // pause extends — not counted
        } else {
          const overrideId = c.rota?.[date];
          const actual = overrideId ? (roster.find((s) => s.id === overrideId) ?? wouldBe) : wouldBe;
          if (actual?.id === selectedStaff.id) {
            const b = get();
            b.planned++;
            if (date <= today) b.completed++;
          }
          workIdx++;
          consumed++;
        }
        offset++;
      }
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, v]) => {
        const util = v.planned === 0 ? 0 : Math.round((v.completed / v.planned) * 1000) / 10;
        const leaveRate = v.planned === 0 ? 0 : Math.round((v.leave / v.planned) * 1000) / 10;
        const d = new Date(`${ym}-01T00:00:00`);
        const label = d.toLocaleString("default", { month: "long", year: "numeric" });
        return { ym, label, ...v, util, leaveRate };
      });
  }, [selectedStaff, customers, roster]);

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "#5F47FF" }}>Insights</span>
          </div>
          <h1 className="text-[#0f1115] text-[36px] sm:text-[44px] font-bold tracking-tight leading-none">Utilisation Report</h1>
          <p className="text-[12px] mt-2" style={{ color: "#7a7a86" }}>Planned vs completed service days across all caregivers (Sundays are weekly off)</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatTile value={utilisedCount} label="Utilised" />
          <StatTile value={idleCount} label="Idle" accent={idleCount > 0 ? "#f59e0b" : undefined} />
          <StatTile value={`${avgUtil}%`} label="Avg utilisation" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#7a7a86", fontWeight: 600 }}>Role</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "All" | Role)}
            className="text-[12px] rounded-md px-3 py-2 cursor-pointer"
            style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#0f1115", fontWeight: 500 }}
          >
            <option value="All">All staff</option>
            <option value="Nurse">Nurses</option>
            <option value="MOBA">MOBA</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#7a7a86", fontWeight: 600 }}>Financial Year</span>
          <select
            value={fyFilter}
            onChange={(e) => setFyFilter(e.target.value)}
            className="text-[12px] rounded-md px-3 py-2 cursor-pointer"
            style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#0f1115", fontWeight: 500 }}
          >
            <option value="All">All FY</option>
            {fyList.map((fy) => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#7a7a86", fontWeight: 600 }}>Month</span>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            disabled={fyFilter === "All"}
            className="text-[12px] rounded-md px-3 py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#0f1115", fontWeight: 500 }}
            title={fyFilter === "All" ? "Select a financial year first" : ""}
          >
            <option value="All">All months</option>
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em]" style={{ color: "#7a7a86", fontWeight: 600 }}>Monthly view</span>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="text-[12px] rounded-md px-3 py-2 cursor-pointer min-w-[220px]"
            style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", color: "#0f1115", fontWeight: 500 }}
          >
            <option value="">Select a caregiver…</option>
            {roster
              .filter((s) => roleFilter === "All" || s.role === roleFilter)
              .map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.role}</option>
              ))}
          </select>
          {selectedStaff && (
            <button
              onClick={() => setSelectedStaffId("")}
              className="text-[11px] px-2 py-1 rounded-md cursor-pointer"
              style={{ color: "#7a7a86", border: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}
            >Clear</button>
          )}
        </div>
      </div>

      {selectedStaff && (
        <div className="rounded-[14px] overflow-hidden mb-6"
          style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 1px 0 rgba(15,17,21,0.02), 0 12px 32px -20px rgba(15,17,21,0.18)" }}>
          <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
            <Avatar s={selectedStaff} size={32} />
            <div>
              <div className="text-[14px] text-[#0f1115]" style={{ fontWeight: 600 }}>{selectedStaff.name}</div>
              <div className="text-[11px]" style={{ color: "#7a7a86" }}>Monthly utilisation · {selectedStaff.role}</div>
            </div>
          </div>
          <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.6fr_0.8fr_0.8fr] text-[11px] uppercase tracking-[0.14em] px-4 py-3"
            style={{ backgroundColor: "#f8fafc", color: "#9a9aa6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
            <span>Month</span><span>Planned</span><span>Completed</span><span>Leave</span><span>Utilisation %</span><span>Leave Rate %</span>
          </div>
          <div>
            {monthlyRows.map((m, i) => (
              <div key={m.ym}
                className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.6fr_0.8fr_0.8fr] items-center gap-2 px-4 py-3 text-[13px]"
                style={{ borderTop: i === 0 ? "none" : "1px solid #f1f5f9" }}>
                <span className="text-[#0f1115]" style={{ fontWeight: 500 }}>{m.label}</span>
                <span className="tabular-nums text-[#0f1115]" style={{ fontWeight: 600 }}>{m.planned}</span>
                <span className="tabular-nums" style={{ color: m.completed > 0 ? "#16a34a" : "#c9c6bc", fontWeight: 600 }}>{m.completed || "—"}</span>
                <span className="tabular-nums" style={{ color: m.leave > 0 ? "#a855f7" : "#c9c6bc", fontWeight: 600 }}>{m.leave || "—"}</span>
                <span className="tabular-nums text-[#0f1115]" style={{ fontWeight: 600 }}>{m.planned > 0 ? `${m.util}%` : "—"}</span>
                <span className="tabular-nums" style={{ color: m.leaveRate > 0 ? "#0f1115" : "#c9c6bc", fontWeight: 600 }}>{m.planned > 0 ? `${m.leaveRate}%` : "—"}</span>
              </div>
            ))}
            {monthlyRows.length === 0 && (
              <div className="text-center py-8 text-[13px]" style={{ color: "#7a7a86" }}>No scheduled days for this caregiver yet.</div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-[14px] overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 1px 0 rgba(15,17,21,0.02), 0 12px 32px -20px rgba(15,17,21,0.18)" }}>
        <div className="grid grid-cols-[1.6fr_0.6fr_0.7fr_0.8fr_0.6fr_0.8fr_0.8fr_0.8fr] text-[11px] uppercase tracking-[0.14em] px-4 py-3"
          style={{ backgroundColor: "#f8fafc", color: "#9a9aa6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
          <span>Caregiver</span><span>Role</span><span>Planned</span><span>Completed</span><span>Leave</span><span>Utilisation %</span><span>Leave Rate %</span><span>Status</span>
        </div>
        <div>
          {filteredRows.map((r, idx) => {
            const statusColor = r.status === "Healthy" ? "#16a34a" : r.status === "Watch" ? "#f59e0b" : r.status === "At Risk" ? "#ef4444" : "#7a7a86";
            const statusBg = r.status === "Healthy" ? "rgba(34,197,94,0.10)" : r.status === "Watch" ? "rgba(245,158,11,0.10)" : r.status === "At Risk" ? "rgba(239,68,68,0.10)" : "#f1f5f9";
            return (
              <div key={r.staff.id}
                className="grid grid-cols-[1.6fr_0.6fr_0.7fr_0.8fr_0.6fr_0.8fr_0.8fr_0.8fr] items-center gap-2 px-4 py-3 text-[13px] hover:bg-[#f8fafc] transition-colors"
                style={{ borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar s={r.staff} size={32} />
                  <div className="text-[#0f1115] truncate" style={{ fontWeight: 500 }}>{r.staff.name}</div>
                </div>
                <span className="text-[11px] uppercase tracking-[0.1em] inline-flex items-center px-2 py-1 rounded-md w-fit"
                  style={{ backgroundColor: "#f1f5f9", color: "#5F47FF", fontWeight: 600 }}>{r.staff.role}</span>
                <span className="text-[#0f1115] tabular-nums" style={{ fontWeight: 600 }}>{r.planned || "—"}</span>
                <span className="tabular-nums" style={{ color: r.completed > 0 ? "#16a34a" : "#c9c6bc", fontWeight: 600 }}>{r.completed || "—"}</span>
                <span className="tabular-nums" style={{ color: r.leaveDays > 0 ? "#a855f7" : "#c9c6bc", fontWeight: 600 }}>{r.leaveDays || "—"}</span>
                <span className="tabular-nums text-[#0f1115]" style={{ fontWeight: 600 }}>{r.planned > 0 ? `${r.utilisation}%` : "—"}</span>
                <span className="tabular-nums" style={{ color: r.leaveRate > 0 ? "#0f1115" : "#c9c6bc", fontWeight: 600 }}>{r.planned > 0 ? `${r.leaveRate}%` : "—"}</span>
                <span className="text-[11px] uppercase tracking-[0.1em] inline-flex items-center px-2 py-1 rounded-md w-fit"
                  style={{ backgroundColor: statusBg, color: statusColor, fontWeight: 600 }}>{r.status}</span>
              </div>
            );
          })}
          {filteredRows.length === 0 && (
            <div className="text-center py-12 text-[13px]" style={{ color: "#7a7a86" }}>No staff to report on yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

type TripType = "Client Visit" | "Hospital Pickup" | "Training" | "Other";
type TransportMode = "Two-Wheeler" | "Auto Rickshaw" | "Cab (Ola/Uber)" | "Bus" | "Metro" | "Own Car";

interface TravelEntry {
  id: string;
  staffId: string;
  date: string; // ISO YYYY-MM-DD
  tripType: TripType;
  from: string;
  to: string;
  distance: number;
  mode: TransportMode;
  amount: number;
  receipt: boolean;
  notes?: string;
}

const TRIP_TYPES: TripType[] = ["Client Visit", "Hospital Pickup", "Training", "Other"];
const TRANSPORT_MODES: TransportMode[] = ["Two-Wheeler", "Auto Rickshaw", "Cab (Ola/Uber)", "Bus", "Metro", "Own Car"];
const MODE_RATE: Record<TransportMode, { perKm: number; flat?: number }> = {
  "Two-Wheeler": { perKm: 4 },
  "Auto Rickshaw": { perKm: 12 },
  "Cab (Ola/Uber)": { perKm: 14 },
  "Bus": { perKm: 0, flat: 15 },
  "Metro": { perKm: 0, flat: 20 },
  "Own Car": { perKm: 6 },
};

function suggestAmount(mode: TransportMode, distance: number): number {
  const r = MODE_RATE[mode];
  if (r.flat !== undefined) return r.flat;
  return Math.round(r.perKm * distance);
}

function formatDateDMY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function TravelExpensesView({
  roster,
  entries,
  onAdd,
}: {
  roster: Staff[];
  entries: TravelEntry[];
  onAdd: (e: TravelEntry) => void;
}) {
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [tripType, setTripType] = useState<TripType>("Client Visit");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [distance, setDistance] = useState("");
  const [mode, setMode] = useState<TransportMode>("Two-Wheeler");
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState(false);
  const [notes, setNotes] = useState("");

  const distanceNum = parseFloat(distance) || 0;
  const suggested = distanceNum > 0 || MODE_RATE[mode].flat !== undefined ? suggestAmount(mode, distanceNum) : 0;

  const reset = () => {
    setStaffId(""); setDate(todayISO()); setTripType("Client Visit");
    setFrom(""); setTo(""); setDistance(""); setMode("Two-Wheeler");
    setAmount(""); setReceipt(false); setNotes("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) { toast.error("Please select a caregiver"); return; }
    if (!date) { toast.error("Please pick a date"); return; }
    if (!from.trim() || !to.trim()) { toast.error("From and To locations are required"); return; }
    const dist = parseFloat(distance);
    if (isNaN(dist) || dist < 0) { toast.error("Enter a valid distance"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) { toast.error("Enter a valid amount"); return; }

    onAdd({
      id: `te-${Date.now()}`,
      staffId, date, tripType, from: from.trim(), to: to.trim(),
      distance: dist, mode, amount: amt, receipt,
      notes: notes.trim() || undefined,
    });
    toast.success("Expense logged successfully ✓", { duration: 3000 });
    reset();
  };

  const grandTotal = entries.reduce((s, e) => s + e.amount, 0);
  const totalKm = entries.reduce((s, e) => s + e.distance, 0);

  const inputBase: React.CSSProperties = {
    backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8,
    padding: "10px 12px", fontSize: 13, color: "#0f1115", width: "100%", outline: "none",
  };
  const labelCls = "text-[11px] font-semibold tracking-[0.08em] uppercase";
  const labelStyle: React.CSSProperties = { color: "#7a7a86" };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#f59e0b", boxShadow: "0 0 8px #f59e0b" }} />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "#5F47FF" }}>Finance</span>
          </div>
          <h1 className="text-[#0f1115] text-[36px] sm:text-[44px] font-bold tracking-tight leading-none">Travel Expenses</h1>
          <p className="text-[12px] mt-2" style={{ color: "#7a7a86" }}>Log caregiver trips and track travel reimbursements</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatTile value={`₹${grandTotal.toLocaleString("en-IN")}`} label="Total logged" />
          <StatTile value={entries.length} label="Entries" />
          <StatTile value={`${totalKm.toFixed(1)} km`} label="Distance" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <form onSubmit={submit} className="rounded-[14px] p-5 space-y-4 h-fit"
          style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 12px 32px -20px rgba(15,17,21,0.18)" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#0f1115]">Log new expense</h3>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls} style={labelStyle}>Caregiver Name</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} style={inputBase}>
              <option value="">Select caregiver</option>
              {roster.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls} style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputBase} />
            {date && <div className="text-[11px]" style={{ color: "#7a7a86" }}>{formatDateDMY(date)}</div>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls} style={labelStyle}>Trip Type</label>
            <div className="flex flex-wrap gap-2">
              {TRIP_TYPES.map((t) => {
                const active = tripType === t;
                return (
                  <button key={t} type="button" onClick={() => setTripType(t)}
                    className="px-3 py-1.5 rounded-full text-[12px] transition-colors"
                    style={{
                      backgroundColor: active ? "#5F47FF" : "transparent",
                      color: active ? "#ffffff" : "#0f1115",
                      border: active ? "1px solid #5F47FF" : "1px solid #2a2a3e",
                      fontWeight: active ? 600 : 500,
                    }}>{t}</button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls} style={labelStyle}>From</label>
              <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Starting point (e.g. HSR Layout)" style={inputBase} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls} style={labelStyle}>To</label>
              <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Destination (e.g. Indiranagar)" style={inputBase} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls} style={labelStyle}>Distance (km)</label>
              <input type="number" min={0} step={0.1} value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="e.g. 8.5" style={inputBase} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls} style={labelStyle}>Mode of Transport</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as TransportMode)} style={inputBase}>
                {TRANSPORT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls} style={labelStyle}>Amount (₹)</label>
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 120" style={inputBase} />
            {suggested > 0 && (
              <div className="text-[11px] flex items-center gap-2" style={{ color: "#7a7a86" }}>
                <span>Suggested: ₹{suggested}{MODE_RATE[mode].flat !== undefined ? " (flat)" : ` based on ${distanceNum}km`}</span>
                <button type="button" onClick={() => setAmount(String(suggested))}
                  className="text-[11px] underline" style={{ color: "#5F47FF" }}>Use</button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between py-1">
            <label className={labelCls} style={labelStyle}>Receipt Uploaded</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setReceipt(!receipt)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ backgroundColor: receipt ? "#22c55e" : "#d4d2c8" }}>
                <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                  style={{ transform: receipt ? "translateX(22px)" : "translateX(2px)" }} />
              </button>
              <span className="text-[12px]" style={{ color: "#0f1115" }}>{receipt ? "Yes" : "No"}</span>
              {receipt && (
                <span className="text-[11px] px-2 py-0.5 rounded font-semibold"
                  style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#15803d" }}>Receipt ✓</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls} style={labelStyle}>Notes</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..." style={{ ...inputBase, resize: "vertical" }} />
          </div>

          <button type="submit"
            className="w-full font-semibold text-[14px] transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#5F47FF", color: "#ffffff", borderRadius: 8, height: 44 }}>
            Log Expense
          </button>
        </form>

        <div className="rounded-[14px] overflow-hidden h-fit"
          style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 1px 0 rgba(15,17,21,0.02), 0 12px 32px -20px rgba(15,17,21,0.18)" }}>
          <div className="grid grid-cols-[1.3fr_0.8fr_1fr_1.2fr_0.6fr_0.9fr_0.4fr] text-[11px] uppercase tracking-[0.14em] px-4 py-3"
            style={{ backgroundColor: "#f8fafc", color: "#9a9aa6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
            <span>Caregiver</span><span>Date</span><span>Trip</span><span>Route</span><span>Km</span><span>Amount</span><span>Rcpt</span>
          </div>
          <div>
            {entries.length === 0 && (
              <div className="text-center py-12 text-[13px]" style={{ color: "#7a7a86" }}>No expenses logged yet.</div>
            )}
            {entries.map((e, idx) => {
              const staff = roster.find((s) => s.id === e.staffId);
              return (
                <div key={e.id}
                  className="grid grid-cols-[1.3fr_0.8fr_1fr_1.2fr_0.6fr_0.9fr_0.4fr] items-center gap-2 px-4 py-3 text-[13px] hover:bg-[#f8fafc] transition-colors"
                  style={{ borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    {staff && <Avatar s={staff} size={28} />}
                    <div className="min-w-0">
                      <div className="text-[#0f1115] truncate" style={{ fontWeight: 500 }}>{staff?.name ?? "—"}</div>
                      <div className="text-[11px]" style={{ color: "#7a7a86" }}>{staff?.role}</div>
                    </div>
                  </div>
                  <div className="text-[#0f1115] tabular-nums text-[12px]">{formatDateDMY(e.date)}</div>
                  <div>
                    <span className="text-[11px] px-2 py-0.5 rounded"
                      style={{ backgroundColor: "rgba(99,136,255,0.10)", color: "#5F47FF", fontWeight: 600 }}>{e.tripType}</span>
                  </div>
                  <div className="min-w-0 text-[12px]">
                    <div className="text-[#0f1115] truncate">{e.from} → {e.to}</div>
                    <div className="text-[11px]" style={{ color: "#7a7a86" }}>{e.mode}</div>
                  </div>
                  <div className="text-[#0f1115] tabular-nums">{e.distance}</div>
                  <div className="text-[#0f1115] tabular-nums" style={{ fontWeight: 600 }}>₹{e.amount.toLocaleString("en-IN")}</div>
                  <div>
                    {e.receipt
                      ? <span title="Receipt" style={{ color: "#22c55e", fontWeight: 700 }}>✓</span>
                      : <span style={{ color: "#c4c2b8" }}>—</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceView({ roster, customers }: { roster: Staff[]; customers: Customer[] }) {
  const rows = useMemo(() => {
    // Derive attendance directly from the rota: any paused day on a client
    // counts against the staff member who was scheduled that day.
    return roster.map((staff) => {
      const assigned = customers.filter((c) => c.staff.some((x) => x.id === staff.id));
      let present = 0;
      let absent = 0;
      let leave = 0;
      for (const c of assigned) {
        if (!c.packageDays || !c.startDate) continue;
        const pool = c.staff;
        if (pool.length === 0) continue;
        const pausedSet = new Set(c.pausedDates ?? []);
        const leaveSet = new Set(c.leaveDates ?? []);
        let workIdx = 0;
        let consumed = 0;
        let offset = 0;
        const cap = c.packageDays + 120;
        while (consumed < c.packageDays && offset < cap) {
          const date = addDaysISO(c.startDate, offset);
          const wouldBe = pool[workIdx % pool.length];
          const isSunday = new Date(`${date}T00:00:00`).getDay() === 0;
          const sundayOverrideId = c.rota?.[date];
          if (leaveSet.has(date)) {
            if (wouldBe?.id === staff.id) leave++;
            consumed++;
          } else if (pausedSet.has(date)) {
            // Pause extends rota — not counted as absent
          } else if (isSunday && !sundayOverrideId) {
            // Sunday weekly off — not counted
            consumed++;
          } else {
            const overrideId = c.rota?.[date];
            const actual = overrideId
              ? (roster.find((s) => s.id === overrideId) ?? wouldBe)
              : wouldBe;
            if (actual?.id === staff.id) present++;
            workIdx++;
            consumed++;
          }
          offset++;
        }
      }
      const scheduled = present + absent + leave;
      const attendance = scheduled === 0 ? 0 : Math.round((present / scheduled) * 100);
      return { staff, clients: assigned.length, scheduled, present, absent, leave, attendance };
    }).sort((a, b) => b.attendance - a.attendance);
  }, [roster, customers]);

  const totalScheduled = rows.reduce((s, r) => s + r.scheduled, 0);
  const totalPresent = rows.reduce((s, r) => s + r.present, 0);
  const overall = totalScheduled === 0 ? 0 : Math.round((totalPresent / totalScheduled) * 100);
  const onLeave = rows.filter((r) => r.leave > 0).length;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: "#5F47FF" }}>Workforce</span>
          </div>
          <h1 className="text-[#0f1115] text-[36px] sm:text-[44px] font-bold tracking-tight leading-none">Attendance Report</h1>
          <p className="text-[12px] mt-2" style={{ color: "#7a7a86" }}>Present, absent and leave days across all caregivers</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatTile value={`${overall}%`} label="Overall attendance" />
          <StatTile value={totalPresent} label="Present days" />
          <StatTile value={onLeave} label="On leave" />
        </div>
      </div>

      <div className="rounded-[14px] overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 1px 0 rgba(15,17,21,0.02), 0 12px 32px -20px rgba(15,17,21,0.18)" }}>
        <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_1fr] text-[11px] uppercase tracking-[0.14em] px-4 py-3"
          style={{ backgroundColor: "#f8fafc", color: "#9a9aa6", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}>
          <span>Caregiver</span><span>Clients</span><span>Scheduled</span><span>Present</span><span>Absent</span><span>Leave</span><span>Attendance</span>
        </div>
        <div>
          {rows.map((r, idx) => {
            const barColor = r.attendance >= 90 ? "#22c55e" : r.attendance >= 75 ? "#f59e0b" : "#ef4444";
            return (
              <div key={r.staff.id}
                className="grid grid-cols-[1.6fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_1fr] items-center gap-2 px-4 py-3 text-[13px] hover:bg-[#f8fafc] transition-colors"
                style={{ borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar s={r.staff} size={32} />
                  <div className="min-w-0">
                    <div className="text-[#0f1115] truncate" style={{ fontWeight: 500 }}>{r.staff.name}</div>
                    <div className="text-[11px]" style={{ color: "#7a7a86" }}>{r.staff.role}</div>
                  </div>
                </div>
                <div className="text-[#0f1115] tabular-nums">{r.clients}</div>
                <div className="text-[#0f1115] tabular-nums">{r.scheduled || "—"}</div>
                <div className="tabular-nums" style={{ color: "#16a34a", fontWeight: 600 }}>{r.present}</div>
                <div className="tabular-nums" style={{ color: "#ef4444", fontWeight: 600 }}>{r.absent}</div>
                <div className="tabular-nums" style={{ color: "#f59e0b", fontWeight: 600 }}>{r.leave}</div>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#f1f5f9" }}>
                    <div className="h-full rounded-full" style={{ width: `${r.attendance}%`, backgroundColor: barColor }} />
                  </div>
                  <span className="text-[12px] tabular-nums" style={{ color: "#0f1115", fontWeight: 600, minWidth: 36, textAlign: "right" }}>{r.attendance}%</span>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="text-center py-12 text-[13px]" style={{ color: "#7a7a86" }}>No caregivers yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function OpsBoardInner() {

  const now = useClientNow();
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [roster, setRoster] = useState<Staff[]>(ALL_STAFF);
  const [travelEntries, setTravelEntries] = useState<TravelEntry[]>([]);
  const [view, setView] = useState<"customers" | "staff" | "utilisation" | "travel" | "attendance">("customers");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<Role>("MOBA");
  const [zoneFilter, setZoneFilter] = useState<Zone | "All">("All");
  const [areaFilter, setAreaFilter] = useState<string>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Areas available given current zone filter
  const areasForZone = useMemo(() => {
    const src = zoneFilter === "All" ? customers : customers.filter((c) => c.zone === zoneFilter);
    return Array.from(new Set(src.map((c) => c.area))).sort();
  }, [customers, zoneFilter]);

  // Reset area filter if it no longer exists in current zone
  useEffect(() => {
    if (areaFilter !== "All" && !areasForZone.includes(areaFilter)) {
      setAreaFilter("All");
    }
  }, [areaFilter, areasForZone]);

  const filtered = useMemo(() => {
    let list = customers;
    if (zoneFilter !== "All") list = list.filter((c) => c.zone === zoneFilter);
    if (areaFilter !== "All") list = list.filter((c) => c.area === areaFilter);
    return list;
  }, [customers, zoneFilter, areaFilter]);

  const stats = useMemo(() => {
    const activeStations = customers.filter((c) => c.status === "active").length;
    const operators = new Set(customers.flatMap((c) => c.staff.map((s) => s.id))).size;
    const attention = customers.filter((c) => c.status === "attention" || c.staff.length === 0).length;
    return { activeStations, operators, attention };
  }, [customers]);

  const grouped = useMemo(() => {
    const m = new Map<Zone, Customer[]>();
    for (const c of filtered) {
      const arr = m.get(c.zone) ?? [];
      arr.push(c);
      m.set(c.zone, arr);
    }
    return m;
  }, [filtered]);

  const zones: ("All" | Zone)[] = ["All", ...ZONE_ORDER];
  const selected = selectedId ? customers.find((c) => c.id === selectedId) ?? null : null;

  const addStaff = (customerId: string, staffId: string) => {
    const s = roster.find((x) => x.id === staffId);
    if (!s) return;
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId && !c.staff.some((x) => x.id === staffId)
          ? {
            ...c,
            staff: [...c.staff, s],
            status: "active",
            badge: /paus|break|unassigned|awaiting/i.test(c.badge) ? "Active" : c.badge,
          }
          : c
      )
    );
  };

  const removeStaff = (customerId: string, staffId: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const nextStaff = c.staff.filter((x) => x.id !== staffId);
        // Strip any rota-day overrides that pointed to the removed caregiver
        const nextRota: Record<string, string> = {};
        const nextReasons: Record<string, string> = {};
        for (const [d, sid] of Object.entries(c.rota ?? {})) {
          if (sid !== staffId) {
            nextRota[d] = sid;
            if (c.rotaReasons?.[d]) nextReasons[d] = c.rotaReasons[d];
          }
        }
        // If no staff remain, drop the rota entirely
        if (nextStaff.length === 0) {
          return {
            ...c,
            staff: nextStaff,
            packageDays: undefined,
            startDate: undefined,
            shiftTime: undefined,
            rota: undefined,
            rotaReasons: undefined,
            pausedDates: undefined,
            status: "attention",
            badge: "Unassigned",
          };
        }
        return {
          ...c,
          staff: nextStaff,
          rota: nextRota,
          rotaReasons: nextReasons,
        };
      })
    );
  };

  const setRotaDay = (customerId: string, dateISO: string, staffId: string, reason: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
            ...c,
            rota: { ...(c.rota ?? {}), [dateISO]: staffId },
            rotaReasons: { ...(c.rotaReasons ?? {}), [dateISO]: reason },
          }
          : c
      )
    );
  };

  const createRota = (customerId: string, packageDays: number, startDate: string, shiftTime: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, packageDays, startDate, shiftTime, rota: {} } : c
      )
    );
  };

  const clearRota = (customerId: string) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? { ...c, packageDays: undefined, startDate: undefined, shiftTime: undefined, rota: undefined }
          : c
      )
    );
  };

  const toggleRotaPause = (customerId: string, dateISO: string, reason?: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const cur = new Set(c.pausedDates ?? []);
        const wasPaused = cur.has(dateISO);
        if (wasPaused) cur.delete(dateISO);
        else cur.add(dateISO);
        const nextReasons = { ...(c.rotaReasons ?? {}) };
        if (wasPaused) {
          delete nextReasons[dateISO];
        } else if (reason) {
          nextReasons[dateISO] = reason;
        }
        return { ...c, pausedDates: Array.from(cur), rotaReasons: nextReasons };
      })
    );
  };

  const toggleRotaLeave = (customerId: string, dateISO: string, reason?: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const cur = new Set(c.leaveDates ?? []);
        const wasLeave = cur.has(dateISO);
        if (wasLeave) cur.delete(dateISO);
        else cur.add(dateISO);
        const nextReasons = { ...(c.rotaReasons ?? {}) };
        if (wasLeave) {
          delete nextReasons[dateISO];
        } else if (reason) {
          nextReasons[dateISO] = reason;
        }
        return { ...c, leaveDates: Array.from(cur), rotaReasons: nextReasons };
      })
    );
  };

  const extendRota = (customerId: string, extraDays: number) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId && c.packageDays
          ? { ...c, packageDays: c.packageDays + extraDays }
          : c
      )
    );
  };

  const deleteCustomer = (customerId: string) => {
    setSelectedId(null);
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
  };

  const addToRoster = () => {
    const name = newStaffName.trim();
    if (!name) return;
    const initials = name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const color = PALETTE[roster.length % PALETTE.length];
    const id = `s-${Date.now()}`;
    setRoster((prev) => [...prev, { id, name, role: newStaffRole, initials, color }]);
    setNewStaffName("");
    setNewStaffRole("MOBA");
  };

  const removeFromRoster = (staffId: string) => {
    setRoster((prev) => prev.filter((s) => s.id !== staffId));
    setCustomers((prev) =>
      prev.map((c) => ({ ...c, staff: c.staff.filter((s) => s.id !== staffId) }))
    );
  };

  return (
    <div
      className="min-h-screen w-full flex"
      style={{
        backgroundColor: "#f8fafc",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ backgroundColor: "rgba(15,17,21,0.4)", backdropFilter: "blur(2px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`shrink-0 h-screen flex flex-col z-40 transition-transform duration-300 ${sidebarOpen ? "fixed inset-y-0 left-0 translate-x-0" : "fixed -translate-x-full md:relative md:translate-x-0 md:sticky md:top-0"}`}
        style={{
          width: 260,
          backgroundColor: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          boxShadow: sidebarOpen ? "4px 0 24px rgba(15,17,21,0.12)" : undefined,
        }}
      >
        <div className="px-6 py-7">
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#5F47FF,#a855f7)" }}
            >
              <div className="h-4 w-4 rounded-full border-2 border-white opacity-90" />
            </div>
            <span className="text-[15px] font-bold tracking-tight" style={{ color: "#1e293b" }}>CRADLEWELL</span>
          </div>
          <p className="mt-2 text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: "#94a3b8" }}>Operations</p>
        </div>
        <nav className="px-3 flex flex-col gap-0.5">
          {([
            { id: "customers" as const, label: "Customers", count: customers.length, icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="5" r="2.5"/><path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5"/><circle cx="12.5" cy="5" r="2"/><path d="M15 14c0-2.21-1.57-4-3.5-4"/></svg>
            )},
            { id: "staff" as const, label: "Staff", count: roster.length, icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5" r="3"/><path d="M2 15c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>
            )},
            { id: "utilisation" as const, label: "Utilisation", count: roster.filter((s) => customers.some((c) => c.staff.some((x) => x.id === s.id))).length, icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 13V9M6 13V5M10 13V7M14 13V3"/></svg>
            )},
            { id: "travel" as const, label: "Travel Expenses", count: travelEntries.length, icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2C5.79 2 4 3.79 4 6c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4z"/><circle cx="8" cy="6" r="1.5"/></svg>
            )},
            { id: "attendance" as const, label: "Attendance", count: roster.length, icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1v4M11 1v4M2 7h12"/><path d="M5.5 10.5l2 2 3-3"/></svg>
            )},
          ]).map((tab) => {
            const active = view === tab.id;
            return (
              <div key={tab.id} className="relative">
                {active && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r" style={{ backgroundColor: "#5F47FF" }} />
                )}
                <button
                  onClick={() => { setView(tab.id); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors"
                  style={{
                    backgroundColor: active ? "rgba(95,71,255,0.08)" : "transparent",
                    color: active ? "#5F47FF" : "#64748b",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span style={{ color: active ? "#5F47FF" : "#94a3b8", display: "flex", flexShrink: 0 }}>{tab.icon}</span>
                  <span className="text-[13px] flex-1">{tab.label}</span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                    style={{
                      backgroundColor: active ? "#5F47FF" : "#f1f5f9",
                      color: active ? "#ffffff" : "#94a3b8",
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Sidebar bottom */}
        <div className="mt-auto px-4 pb-5 pt-4" style={{ borderTop: "1px solid #f1f5f9" }}>
          <div className="flex items-center gap-3 px-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white text-[12px] font-bold"
              style={{ background: "linear-gradient(135deg,#5F47FF,#a855f7)" }}
            >
              A
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate" style={{ color: "#1e293b" }}>Admin</div>
              <div className="text-[11px]" style={{ color: "#94a3b8" }}>Cradlewell</div>
            </div>
            <button
              aria-label="Settings"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "#94a3b8" }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 max-w-[1400px] mx-auto px-5 sm:px-8 py-6 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
          className="mb-4 flex items-center gap-2 md:hidden px-3 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: "#f1f5f9", color: "#475569" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
          <span className="text-[13px] font-medium">Menu</span>
        </button>

        {view === "attendance" ? (
          <AttendanceView roster={roster} customers={customers} />
        ) : view === "travel" ? (
          <TravelExpensesView
            roster={roster}
            entries={travelEntries}
            onAdd={(e) => setTravelEntries((prev) => [e, ...prev])}
          />
        ) : view === "utilisation" ? (
          <UtilisationView roster={roster} customers={customers} />
        ) : view === "staff" ? (
          <StaffView
            roster={roster}
            customers={customers}
            newStaffName={newStaffName}
            setNewStaffName={setNewStaffName}
            newStaffRole={newStaffRole}
            setNewStaffRole={setNewStaffRole}
            onAdd={addToRoster}
            onRemove={removeFromRoster}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10 pb-6" style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#10b981" }} />
                  <span className="text-[12px] font-bold tracking-[0.2em] uppercase" style={{ color: "#94a3b8" }}>Live Operations</span>
                </div>
                <h1 className="text-[#0f1115] text-[36px] sm:text-[44px] font-bold tracking-tight leading-none">Customers</h1>
                <p className="text-[13px] mt-2" style={{ color: "#64748b" }}>{customers.length} clients · All zones</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <StatTile value={stats.activeStations} label="Active clients" />
                <StatTile value={stats.operators} label="Caregivers on duty" />
                <StatTile value={stats.attention} label="Needs attention" accent={stats.attention > 0 ? "#ef4444" : undefined} />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-6 mb-10">
              <SelectField
                label="Zone"
                value={zoneFilter}
                onChange={(v) => { setZoneFilter(v as Zone | "All"); setAreaFilter("All"); }}
              >
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </SelectField>

              <SelectField
                label="Area"
                value={areaFilter}
                onChange={(v) => setAreaFilter(v)}
              >
                {(["All", ...areasForZone] as string[]).map((a) => <option key={a} value={a}>{a}</option>)}
              </SelectField>
            </div>

            {/* Grouped sections */}
            <div className="mt-4">
              {ZONE_ORDER.map((z) => (
                <ZoneSection
                  key={z}
                  zone={z}
                  customers={grouped.get(z) ?? []}
                  now={now}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              ))}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center py-24 gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#f1f5f9" }}>
                    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/></svg>
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-semibold" style={{ color: "#1e293b" }}>No clients found</p>
                    <p className="text-[12px] mt-1" style={{ color: "#94a3b8" }}>Try adjusting your zone or area filter</p>
                  </div>
                </div>
              )}
            </div>

            <div
              className="mt-6 flex items-center justify-between text-[11px]"
              style={{ color: "#7a7a86" }}
            >
              <span>
                <span className="text-[#0f1115] font-medium">Cradlewell Ops</span> ·{" "}
                <span style={{ color: "#22c55e" }}>● Live</span>
              </span>
              <span>Click a card to view details</span>
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
        assignedElsewhereIds={
          new Set(
            customers
              .filter((c) => c.id !== selected?.id && cardStatus(c).label !== "Paused")
              .flatMap((c) => c.staff.map((s) => s.id))
          )
        }
        onTogglePauseDay={toggleRotaPause}
        onToggleLeaveDay={toggleRotaLeave}
        onExtendRota={extendRota}
        onDeleteCustomer={deleteCustomer}
      />
    </div>
  );
}