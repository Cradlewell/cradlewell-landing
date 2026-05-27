"use client";
import { useState, useMemo } from "react";
import { useLeads, useFollowups, useClosures } from "@/lib/crm-store";
import LeadDrawer from "@/components/crm/LeadDrawer";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#6388FF", "#5F47FF", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7"];

export default function ReportsPage() {
  const leads = useLeads();
  const followups = useFollowups();
  const closures = useClosures();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const wonCount = useMemo(() => leads.filter(l => l.stage === "Closed Won").length, [leads]);
  const convRate = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;

  const fuDone = useMemo(() => followups.filter(f => f.completed).length, [followups]);
  const fuRate = followups.length > 0 ? Math.round((fuDone / followups.length) * 100) : 0;

  const revenue = useMemo(
    () => closures.filter(c => c.type === "Won").reduce((s, c) => s + (c.finalAmount ?? 0), 0),
    [closures]
  );

  const hot = useMemo(
    () => leads.filter(l => l.temperature === "Hot" && l.stage !== "Closed Won" && l.stage !== "Closed Lost").length,
    [leads]
  );

  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach(l => { map[l.source] = (map[l.source] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const ownerData = useMemo(() => {
    const map: Record<string, { total: number; won: number }> = {};
    leads.forEach(l => {
      if (!l.owner) return;
      if (!map[l.owner]) map[l.owner] = { total: 0, won: 0 };
      map[l.owner].total++;
      if (l.stage === "Closed Won") map[l.owner].won++;
    });
    return Object.entries(map).map(([name, d]) => ({ name, Total: d.total, Won: d.won }));
  }, [leads]);

  const lostData = useMemo(() => {
    const map: Record<string, number> = {};
    closures.filter(c => c.type === "Lost").forEach(c => {
      if (c.lostReason) map[c.lostReason] = (map[c.lostReason] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [closures]);

  const fuLeads = useMemo(() => leads.filter(l => l.stage === "Follow-up"), [leads]);

  return (
    <>
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      <div className="crm-page-header">
        <h1 className="crm-page-title">Reports & Analytics</h1>
      </div>

      {/* KPI Cards */}
      <div className="crm-grid-4 mb-4">
        {[
          { label: "Conversion Rate", value: `${convRate}%`, color: "#6388FF" },
          { label: "Follow-up Completion", value: `${fuRate}%`, color: "#22C55E" },
          { label: "Total Revenue", value: `₹${revenue.toLocaleString("en-IN")}`, color: "#5F47FF" },
          { label: "Hot Pipeline", value: hot, color: "#EF4444" },
        ].map(s => (
          <div key={s.label} className="crm-stat-card">
            <div className="crm-stat-label">{s.label}</div>
            <div className="crm-stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="crm-grid-2 mb-4">
        {/* Leads by source */}
        <div className="crm-card">
          <div className="crm-card-header"><h3 className="crm-card-title">Leads by Source</h3></div>
          <div className="crm-card-body" style={{ height: 260 }}>
            {sourceData.length === 0 ? <div className="crm-empty">No data</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name ?? ""} ${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} leads`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Salesperson performance */}
        <div className="crm-card">
          <div className="crm-card-header"><h3 className="crm-card-title">Salesperson Performance</h3></div>
          <div className="crm-card-body" style={{ height: 260 }}>
            {ownerData.length === 0 ? <div className="crm-empty">No data</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ownerData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Total" fill="#6388FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Won" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="crm-grid-2">
        {/* Lost reasons */}
        <div className="crm-card">
          <div className="crm-card-header"><h3 className="crm-card-title">Lost Reasons</h3></div>
          <div className="crm-card-body" style={{ height: 240 }}>
            {lostData.length === 0 ? <div className="crm-empty">No lost leads yet</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lostData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Follow-up stage leads */}
        <div className="crm-card">
          <div className="crm-card-header"><h3 className="crm-card-title">Follow-up Stage Leads</h3></div>
          <div className="crm-card-body" style={{ padding: "0.75rem 1.25rem" }}>
            {fuLeads.length === 0 ? (
              <div className="crm-empty" style={{ padding: "1.5rem" }}>No leads in follow-up stage</div>
            ) : (
              fuLeads.map(l => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0", borderBottom: "1px solid var(--crm-border)", cursor: "pointer" }}
                  onClick={() => setSelectedLead(l.id)}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--crm-primary-light)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", color: "var(--crm-primary)", flexShrink: 0 }}>
                    {l.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{l.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)" }}>{l.serviceRequired} · {l.owner}</div>
                  </div>
                  <span className="crm-badge" style={{ background: "#FFFBEB", color: "#B45309", fontSize: "0.68rem" }}>Daily reminder</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
