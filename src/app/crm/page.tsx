"use client";
import { useState, useMemo, useCallback } from "react";
import { useLeads, useFollowups, useClosures, isOverdue, isToday, isStale, isUrgentNew } from "@/lib/crm-store";
import StageBadge from "@/components/crm/StageBadge";
import TempBadge from "@/components/crm/TempBadge";
import LeadDrawer from "@/components/crm/LeadDrawer";
import LeadFormModal from "@/components/crm/LeadFormModal";
import {
  Users, UserPlus, CalendarClock, AlertTriangle,
  Flame, TrendingUp, RotateCcw, Trophy, XCircle, Plus,
  IndianRupee, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

type PresetKey = "thisMonth" | "lastMonth" | "thisYear" | "all" | "custom";
const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "thisYear", label: "This year" },
  { key: "all", label: "All time" },
];
const PRESET_LABEL: Record<PresetKey, string> = {
  thisMonth: "This month's revenue",
  lastMonth: "Last month's revenue",
  thisYear: "This year's revenue",
  all: "All-time revenue",
  custom: "Revenue",
};
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export default function DashboardPage() {
  const leads = useLeads();
  const followups = useFollowups();
  const closures = useClosures();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

  // ── Date-range filter ───────────────────────────────────────────────────────
  // A flexible calendar range drives all time-based numbers. Presets set the two
  // dates; editing either date directly switches to "custom". Days are read in
  // local time (from = start of day, to = end of day) so closures/leads land in
  // the range the user actually picked.
  const [fromStr, setFromStr] = useState(() => format(monthStart(new Date()), "yyyy-MM-dd"));
  const [toStr, setToStr] = useState(() => format(monthEnd(new Date()), "yyyy-MM-dd"));
  const [preset, setPreset] = useState<PresetKey>("thisMonth");

  const fromDate = useMemo(() => new Date(`${fromStr}T00:00:00`), [fromStr]);
  const toDate = useMemo(() => new Date(`${toStr}T23:59:59.999`), [toStr]);
  const rangeValid = !!fromStr && !!toStr && fromDate.getTime() <= toDate.getTime();

  const applyPreset = (key: PresetKey) => {
    const n = new Date();
    setPreset(key);
    if (key === "thisMonth") { setFromStr(format(monthStart(n), "yyyy-MM-dd")); setToStr(format(monthEnd(n), "yyyy-MM-dd")); }
    else if (key === "lastMonth") { const p = new Date(n.getFullYear(), n.getMonth() - 1, 1); setFromStr(format(monthStart(p), "yyyy-MM-dd")); setToStr(format(monthEnd(p), "yyyy-MM-dd")); }
    else if (key === "thisYear") { setFromStr(format(new Date(n.getFullYear(), 0, 1), "yyyy-MM-dd")); setToStr(format(new Date(n.getFullYear(), 11, 31), "yyyy-MM-dd")); }
    else if (key === "all") { setFromStr("2000-01-01"); setToStr(format(n, "yyyy-MM-dd")); }
  };
  const editFrom = (v: string) => { setFromStr(v); setPreset("custom"); };
  const editTo = (v: string) => { setToStr(v); setPreset("custom"); };

  // Range-scoped (historical) numbers
  const within = useCallback((iso: string) => {
    const t = new Date(iso).getTime();
    return t >= fromDate.getTime() && t <= toDate.getTime();
  }, [fromDate, toDate]);
  const rangeLeads = useMemo(() => leads.filter(l => within(l.createdAt)), [leads, within]);
  const rangeWon = useMemo(() => closures.filter(c => c.type === "Won" && within(c.closureDate)), [closures, within]);
  const rangeLost = useMemo(() => closures.filter(c => c.type === "Lost" && within(c.closureDate)), [closures, within]);
  const revenue = useMemo(() => rangeWon.reduce((s, c) => s + (c.finalAmount ?? 0), 0), [rangeWon]);
  const winRate = useMemo(() => {
    const closed = rangeWon.length + rangeLost.length;
    return closed > 0 ? Math.round((rangeWon.length / closed) * 100) : 0;
  }, [rangeWon.length, rangeLost.length]);

  // Current-state (live) numbers — a status snapshot, not tied to the range
  const today = useMemo(() => followups.filter(f => !f.completed && isToday(f.dueAt)), [followups]);
  const overdue = useMemo(() => followups.filter(f => !f.completed && isOverdue(f.dueAt) && !isToday(f.dueAt)), [followups]);
  const hot = useMemo(() => leads.filter(l => l.temperature === "Hot" && l.stage !== "Closed Won" && l.stage !== "Closed Lost"), [leads]);
  const inNegotiation = useMemo(() => leads.filter(l => l.stage === "Negotiation"), [leads]);
  const inFollowup = useMemo(() => leads.filter(l => l.stage === "Follow-up"), [leads]);
  const pipelineLeads = useMemo(() => leads.filter(l => l.stage !== "Closed Won" && l.stage !== "Closed Lost" && l.stage !== "Invalid Lead"), [leads]);

  const heroLabel = PRESET_LABEL[preset] ?? "Revenue";

  const periodStats = [
    { label: "New leads", value: rangeLeads.length, icon: UserPlus, bg: "rgba(95,71,255,0.07)", color: "#5F47FF" },
    { label: "Closed won", value: rangeWon.length, icon: Trophy, bg: "rgba(48,164,108,0.08)", color: "#30A46C" },
    { label: "Closed lost", value: rangeLost.length, icon: XCircle, bg: "rgba(0,0,0,0.04)", color: "#6B6B6A" },
  ];
  const statusStats = [
    { label: "Total leads", value: leads.length, icon: Users, bg: "rgba(95,71,255,0.07)", color: "#5F47FF" },
    { label: "In pipeline", value: pipelineLeads.length, icon: TrendingUp, bg: "rgba(124,58,237,0.07)", color: "#7C3AED" },
    { label: "Follow-ups today", value: today.length, icon: CalendarClock, bg: "rgba(229,146,10,0.08)", color: "#B45309" },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle, bg: "rgba(229,72,77,0.07)", color: "#DC2626" },
    { label: "Hot leads", value: hot.length, icon: Flame, bg: "rgba(229,72,77,0.07)", color: "#E5484D" },
    { label: "Negotiation", value: inNegotiation.length, icon: TrendingUp, bg: "rgba(124,58,237,0.07)", color: "#7C3AED" },
    { label: "Follow-up stage", value: inFollowup.length, icon: RotateCcw, bg: "rgba(229,146,10,0.08)", color: "#92400E" },
  ];

  return (
    <>
      <LeadFormModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Dashboard</h1>
          <p className="crm-page-subtitle">Good {greeting()}, here&apos;s your CRM overview</p>
        </div>
        <button className="crm-btn crm-btn-primary" onClick={() => setShowNewLead(true)}>
          <Plus size={16} /> New Lead
        </button>
      </div>

      {/* Period filter — presets + flexible calendar range */}
      <div className="crm-card mb-4" style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <div className="d-flex align-items-center gap-2" style={{ color: "var(--crm-text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>
          <CalendarClock size={15} /> Period
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              className={`crm-btn crm-btn-sm ${preset === p.key ? "crm-btn-primary" : "crm-btn-ghost"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="d-flex align-items-center gap-2" style={{ marginLeft: "auto" }}>
          <input type="date" className="crm-input" value={fromStr} onChange={e => editFrom(e.target.value)}
            style={{ width: "auto", minHeight: 34, fontSize: "0.8rem" }} aria-label="From date" />
          <span style={{ color: "var(--crm-text-muted)" }}>→</span>
          <input type="date" className="crm-input" value={toStr} onChange={e => editTo(e.target.value)}
            style={{ width: "auto", minHeight: 34, fontSize: "0.8rem" }} aria-label="To date" />
        </div>
        {!rangeValid && (
          <div style={{ flexBasis: "100%", fontSize: "0.75rem", color: "#DC2626" }}>
            &ldquo;From&rdquo; date must be on or before &ldquo;To&rdquo; date.
          </div>
        )}
      </div>

      {/* Revenue Hero */}
      <div className="crm-hero-card mb-4">
        <div className="crm-section-title" style={{ marginBottom: "0.25rem" }}>{heroLabel}</div>
        <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)", marginBottom: "0.5rem" }}>
          {format(fromDate, "dd MMM yyyy")} – {format(toDate, "dd MMM yyyy")}
        </div>
        <div className="crm-hero-amount" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <IndianRupee size={26} style={{ flexShrink: 0, marginTop: 2 }} />
          {revenue.toLocaleString("en-IN")}
        </div>
        <div className="d-flex gap-4 mt-3 flex-wrap">
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--crm-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Conversions</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--crm-text)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{rangeWon.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--crm-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Lost</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--crm-text)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{rangeLost.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--crm-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Win rate</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--crm-primary)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{winRate}%</div>
          </div>
        </div>
      </div>

      {/* In selected period */}
      <div className="crm-section-title mb-2">In selected period</div>
      <div className="crm-grid-4 mb-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {periodStats.map(s => (
          <div key={s.label} className="crm-stat-card">
            <div className="crm-stat-icon" style={{ background: s.bg }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div className="crm-stat-label">{s.label}</div>
            <div className="crm-stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Current status — live snapshot, not affected by the period filter */}
      <div className="crm-section-title mb-2">Current status</div>
      <div className="crm-grid-4 mb-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {statusStats.map(s => (
          <div key={s.label} className="crm-stat-card">
            <div className="crm-stat-icon" style={{ background: s.bg }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div className="crm-stat-label">{s.label}</div>
            <div className="crm-stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Bottom two cards */}
      <div className="crm-grid-2">
        {/* Today's follow-ups */}
        <div className="crm-card">
          <div className="crm-card-header">
            <h3 className="crm-card-title d-flex align-items-center gap-2">
              <CalendarClock size={16} color="var(--crm-primary)" /> Today&apos;s Follow-ups
              {today.length > 0 && <span className="crm-tab-count">{today.length}</span>}
            </h3>
            <a href="/crm/followups" className="crm-btn crm-btn-ghost crm-btn-sm" style={{ fontSize: "0.78rem" }}>
              View all <ArrowRight size={13} />
            </a>
          </div>
          <div className="crm-card-body" style={{ padding: "0.75rem 1.25rem" }}>
            {today.length === 0 ? (
              <div className="crm-empty" style={{ padding: "1.5rem" }}>No follow-ups today</div>
            ) : (
              today.slice(0, 5).map(f => {
                const lead = leads.find(l => l.id === f.leadId);
                return (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", borderBottom: "1px solid var(--crm-border)", cursor: "pointer" }}
                    onClick={() => lead && setSelectedLead(lead.id)}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--crm-primary-light)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", color: "var(--crm-primary)", flexShrink: 0 }}>
                      {lead?.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--crm-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {lead?.name ?? "Unknown"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)" }}>{f.type}</div>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)", flexShrink: 0 }}>
                      {format(new Date(f.dueAt), "hh:mm a")}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Hot leads */}
        <div className="crm-card">
          <div className="crm-card-header">
            <h3 className="crm-card-title d-flex align-items-center gap-2">
              <Flame size={16} color="#EF4444" /> Hot Leads
              {hot.length > 0 && <span className="crm-tab-count" style={{ background: "#FEF2F2", color: "#DC2626" }}>{hot.length}</span>}
            </h3>
            <a href="/crm/leads" className="crm-btn crm-btn-ghost crm-btn-sm" style={{ fontSize: "0.78rem" }}>
              View all <ArrowRight size={13} />
            </a>
          </div>
          <div className="crm-card-body" style={{ padding: "0.75rem 1.25rem" }}>
            {hot.length === 0 ? (
              <div className="crm-empty" style={{ padding: "1.5rem" }}>No hot leads</div>
            ) : (
              hot.slice(0, 5).map(l => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", borderBottom: "1px solid var(--crm-border)", cursor: "pointer" }}
                  onClick={() => setSelectedLead(l.id)}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", color: "#EF4444", flexShrink: 0 }}>
                    {l.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontWeight: 600, fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</div>
                    <StageBadge stage={l.stage} />
                  </div>
                  {l.closureProbability != null && (
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--crm-primary)" }}>{l.closureProbability}%</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--crm-text-muted)" }}>close</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
