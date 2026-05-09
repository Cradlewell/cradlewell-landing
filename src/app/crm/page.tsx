"use client";
import { useState } from "react";
import { useDB, isOverdue, isToday, isStale, isUrgentNew } from "@/lib/crm-store";
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

export default function DashboardPage() {
  const db = useDB();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

  const today = db.followups.filter(f => !f.completed && isToday(f.dueAt));
  const overdue = db.followups.filter(f => !f.completed && isOverdue(f.dueAt) && !isToday(f.dueAt));
  const hot = db.leads.filter(l => l.temperature === "Hot" && l.stage !== "Closed Won" && l.stage !== "Closed Lost");
  const inNegotiation = db.leads.filter(l => l.stage === "Negotiation");
  const inFollowup = db.leads.filter(l => l.stage === "Follow-up");
  const wonLeads = db.leads.filter(l => l.stage === "Closed Won");
  const lostLeads = db.leads.filter(l => l.stage === "Closed Lost");
  const newToday = db.leads.filter(l => isToday(l.createdAt));

  const monthRevenue = db.closures
    .filter(c => c.type === "Won" && new Date(c.closureDate).getMonth() === new Date().getMonth())
    .reduce((sum, c) => sum + (c.finalAmount ?? 0), 0);

  const conversionRate = db.leads.length > 0
    ? Math.round((wonLeads.length / db.leads.length) * 100)
    : 0;

  const pipelineLeads = db.leads.filter(l => l.stage !== "Closed Won" && l.stage !== "Closed Lost" && l.stage !== "Invalid Lead");

  const stats = [
    { label: "Total Leads", value: db.leads.length, icon: Users, bg: "#EEF1FF", color: "#6388FF" },
    { label: "New Today", value: newToday.length, icon: UserPlus, bg: "#F0FDF4", color: "#16A34A" },
    { label: "Follow-ups Today", value: today.length, icon: CalendarClock, bg: "#FFFBEB", color: "#B45309" },
    { label: "Overdue", value: overdue.length, icon: AlertTriangle, bg: "#FEF2F2", color: "#DC2626" },
    { label: "Hot Leads", value: hot.length, icon: Flame, bg: "#FEF2F2", color: "#EF4444" },
    { label: "Negotiation", value: inNegotiation.length, icon: TrendingUp, bg: "#F5F3FF", color: "#7C3AED" },
    { label: "Follow-up Stage", value: inFollowup.length, icon: RotateCcw, bg: "#FFFBEB", color: "#92400E" },
    { label: "Closed Won", value: wonLeads.length, icon: Trophy, bg: "#F0FDF4", color: "#15803D" },
    { label: "Closed Lost", value: lostLeads.length, icon: XCircle, bg: "#F1F5F9", color: "#64748B" },
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

      {/* Revenue Hero */}
      <div className="crm-hero-card mb-4">
        <div className="crm-section-title" style={{ color: "rgba(255,255,255,0.7)", marginBottom: "0.5rem" }}>
          THIS MONTH&apos;S REVENUE
        </div>
        <div className="crm-hero-amount">
          <IndianRupee size={28} style={{ display: "inline", verticalAlign: "middle" }} />
          {monthRevenue.toLocaleString("en-IN")}
        </div>
        <div className="d-flex gap-4 mt-3 flex-wrap">
          <div>
            <div style={{ fontSize: "0.72rem", opacity: 0.7 }}>CONVERSIONS</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{wonLeads.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", opacity: 0.7 }}>IN PIPELINE</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{pipelineLeads.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.72rem", opacity: 0.7 }}>WIN RATE</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{conversionRate}%</div>
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
            <div className="crm-stat-value" style={{ color: s.color }}>{s.value}</div>
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
                const lead = db.leads.find(l => l.id === f.leadId);
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
