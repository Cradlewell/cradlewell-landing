"use client";
import { useState, useMemo } from "react";
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

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export default function DashboardPage() {
  const leads = useLeads();
  const followups = useFollowups();
  const closures = useClosures();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

  const nowRef = new Date();
  const [selMonth, setSelMonth] = useState(nowRef.getMonth());
  const [selYear, setSelYear] = useState(nowRef.getFullYear());
  const isCurrentPeriod = selMonth === nowRef.getMonth() && selYear === nowRef.getFullYear();

  // Years to offer in the filter: every year we have a closure for, plus the
  // current year, newest first — so the dropdown always covers real data.
  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    closures.forEach(c => set.add(new Date(c.closureDate).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [closures]);

  const today = useMemo(
    () => followups.filter(f => !f.completed && isToday(f.dueAt)),
    [followups]
  );
  const overdue = useMemo(
    () => followups.filter(f => !f.completed && isOverdue(f.dueAt) && !isToday(f.dueAt)),
    [followups]
  );
  const hot = useMemo(
    () => leads.filter(l => l.temperature === "Hot" && l.stage !== "Closed Won" && l.stage !== "Closed Lost"),
    [leads]
  );
  const inNegotiation = useMemo(() => leads.filter(l => l.stage === "Negotiation"), [leads]);
  const inFollowup = useMemo(() => leads.filter(l => l.stage === "Follow-up"), [leads]);
  const wonLeads = useMemo(() => leads.filter(l => l.stage === "Closed Won"), [leads]);
  const lostLeads = useMemo(() => leads.filter(l => l.stage === "Closed Lost"), [leads]);
  const newToday = useMemo(() => leads.filter(l => isToday(l.createdAt)), [leads]);

  const periodWon = useMemo(
    () => closures.filter(c => {
      if (c.type !== "Won") return false;
      const d = new Date(c.closureDate);
      return d.getMonth() === selMonth && d.getFullYear() === selYear;
    }),
    [closures, selMonth, selYear]
  );
  const monthRevenue = useMemo(
    () => periodWon.reduce((sum, c) => sum + (c.finalAmount ?? 0), 0),
    [periodWon]
  );

  const conversionRate = useMemo(
    () => leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0,
    [leads.length, wonLeads.length]
  );

  const pipelineLeads = useMemo(
    () => leads.filter(l => l.stage !== "Closed Won" && l.stage !== "Closed Lost" && l.stage !== "Invalid Lead"),
    [leads]
  );

  const stats = useMemo(() => [
    { label: "Total leads", value: leads.length, icon: Users, bg: "rgba(95,71,255,0.07)", color: "#5F47FF" },
    { label: "New today", value: newToday.length, icon: UserPlus, bg: "rgba(48,164,108,0.08)", color: "#30A46C" },
    { label: "Follow-ups today", value: today.length, icon: CalendarClock, bg: "rgba(229,146,10,0.08)", color: "#B45309" },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle, bg: "rgba(229,72,77,0.07)", color: "#DC2626" },
    { label: "Hot leads", value: hot.length, icon: Flame, bg: "rgba(229,72,77,0.07)", color: "#E5484D" },
    { label: "Negotiation", value: inNegotiation.length, icon: TrendingUp, bg: "rgba(124,58,237,0.07)", color: "#7C3AED" },
    { label: "Follow-up stage", value: inFollowup.length, icon: RotateCcw, bg: "rgba(229,146,10,0.08)", color: "#92400E" },
    { label: "Closed won", value: wonLeads.length, icon: Trophy, bg: "rgba(48,164,108,0.08)", color: "#30A46C" },
    { label: "Closed lost", value: lostLeads.length, icon: XCircle, bg: "rgba(0,0,0,0.04)", color: "#6B6B6A" },
  ], [leads.length, newToday.length, today.length, overdue.length, hot.length,
      inNegotiation.length, inFollowup.length, wonLeads.length, lostLeads.length]);

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

      {/* Revenue Hero */}
      <div className="crm-hero-card mb-4">
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap" style={{ marginBottom: "0.5rem" }}>
          <div className="crm-section-title" style={{ margin: 0 }}>
            {isCurrentPeriod ? "This month's revenue" : `${format(new Date(selYear, selMonth, 1), "MMMM yyyy")} revenue`}
          </div>
          <div className="d-flex gap-2">
            <select className="crm-select" value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
              style={{ width: "auto", minHeight: 34, padding: "0.35rem 1.75rem 0.35rem 0.6rem", fontSize: "0.8rem" }}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select className="crm-select" value={selYear} onChange={e => setSelYear(Number(e.target.value))}
              style={{ width: "auto", minHeight: 34, padding: "0.35rem 1.75rem 0.35rem 0.6rem", fontSize: "0.8rem" }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="crm-hero-amount" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <IndianRupee size={26} style={{ flexShrink: 0, marginTop: 2 }} />
          {monthRevenue.toLocaleString("en-IN")}
        </div>
        <div className="d-flex gap-4 mt-3 flex-wrap">
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--crm-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Conversions</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--crm-text)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{periodWon.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--crm-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>In pipeline</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--crm-text)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{pipelineLeads.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--crm-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Win rate</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--crm-primary)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{conversionRate}%</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="crm-grid-4 mb-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {stats.map(s => (
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
