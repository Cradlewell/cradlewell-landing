"use client";
import { useState } from "react";
import { useDB, api, isOverdue, isToday } from "@/lib/crm-store";
import LeadDrawer from "@/components/crm/LeadDrawer";
import { Check, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

type Tab = "today" | "overdue" | "upcoming" | "completed";

export default function FollowupsPage() {
  const db = useDB();
  const [tab, setTab] = useState<Tab>("today");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const pending = db.followups.filter(f => !f.completed);
  const todayList = pending.filter(f => isToday(f.dueAt)).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const overdueList = pending.filter(f => isOverdue(f.dueAt) && !isToday(f.dueAt)).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const upcomingList = pending.filter(f => !isOverdue(f.dueAt) && !isToday(f.dueAt)).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const completedList = db.followups.filter(f => f.completed).sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime());

  const tabs: { key: Tab; label: string; count: number; icon: React.ElementType; color?: string }[] = [
    { key: "today",     label: "Today",     count: todayList.length,     icon: Calendar },
    { key: "overdue",   label: "Overdue",   count: overdueList.length,   icon: Clock, color: overdueList.length > 0 ? "#DC2626" : undefined },
    { key: "upcoming",  label: "Upcoming",  count: upcomingList.length,  icon: Calendar },
    { key: "completed", label: "Completed", count: completedList.length, icon: CheckCircle2 },
  ];

  const currentList = tab === "today" ? todayList : tab === "overdue" ? overdueList : tab === "upcoming" ? upcomingList : completedList;

  return (
    <>
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Follow-ups</h1>
          <p className="crm-page-subtitle">{pending.length} pending follow-ups</p>
        </div>
      </div>

      <div className="crm-tabs">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`crm-tab ${tab === t.key ? "active" : ""}`} style={t.color && tab !== t.key ? { color: t.color } : {}}>
            <t.icon size={15} />
            {t.label}
            <span className={`crm-tab-count ${tab === t.key ? "" : ""}`} style={t.color ? { background: "#FEF2F2", color: t.color } : {}}>{t.count}</span>
          </button>
        ))}
      </div>

      {currentList.length === 0 ? (
        <div className="crm-card">
          <div className="crm-empty">
            <CheckCircle2 size={40} className="crm-empty-icon" />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>All clear!</div>
            <div style={{ fontSize: "0.875rem" }}>No follow-ups in this category.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {currentList.map(f => {
            const lead = db.leads.find(l => l.id === f.leadId);
            const over = isOverdue(f.dueAt);
            return (
              <div key={f.id} className="crm-card" style={{ padding: "1rem 1.25rem" }}>
                <div className="d-flex align-items-start gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: f.completed ? "#F0FDF4" : over ? "#FEF2F2" : "var(--crm-primary-light)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem", color: f.completed ? "#16A34A" : over ? "#DC2626" : "var(--crm-primary)", flexShrink: 0 }}>
                    {lead?.name.slice(0, 2).toUpperCase() ?? "??"}
                  </div>
                  <div className="flex-1">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <button
                        onClick={() => lead && setSelectedLead(lead.id)}
                        style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--crm-text)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      >
                        {lead?.name ?? "Unknown Lead"}
                      </button>
                      <span className="crm-badge" style={{ background: "var(--crm-primary-light)", color: "var(--crm-primary)" }}>{f.type}</span>
                      {f.completed && <span className="crm-badge" style={{ background: "#F0FDF4", color: "#16A34A" }}><Check size={11} /> Done</span>}
                      {!f.completed && over && <span className="crm-badge" style={{ background: "#FEF2F2", color: "#DC2626" }}>Overdue</span>}
                      {!f.completed && isToday(f.dueAt) && <span className="crm-badge" style={{ background: "#FFFBEB", color: "#B45309" }}>Today</span>}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)", display: "flex", alignItems: "center", gap: 4, marginBottom: f.note ? 4 : 0 }}>
                      <Clock size={12} />
                      {format(new Date(f.dueAt), "dd MMM yyyy, hh:mm a")}
                    </div>
                    {f.note && <div style={{ fontSize: "0.8rem", color: "var(--crm-text)" }}>{f.note}</div>}
                  </div>
                  {!f.completed && (
                    <div className="d-flex gap-2 flex-shrink-0">
                      <button className="crm-btn crm-btn-sm" style={{ background: "#F0FDF4", color: "#16A34A" }} onClick={() => api.completeFollowup(f.id)}>
                        <Check size={13} /> Done
                      </button>
                      <button
                        className="crm-btn crm-btn-ghost crm-btn-sm"
                        onClick={() => api.rescheduleFollowup(f.id, new Date(new Date(f.dueAt).getTime() + 86400000).toISOString())}
                        title="Reschedule +1 day"
                      >
                        +1d
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
