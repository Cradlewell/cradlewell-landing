"use client";
import { useEffect, useMemo, useState } from "react";
import LeadDrawer from "@/components/crm/LeadDrawer";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Lock } from "lucide-react";
import { format } from "date-fns";
import { ZONES } from "@/lib/zones";

const COLORS = ["#5F47FF", "#6388FF", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7", "#EC4899"];

type Period = "daily" | "monthly" | "quarterly";
type NameValue = { name: string; value: number };

interface ReportData {
  period: Period;
  range: { startDate: string; endDate: string };
  kpis: {
    leadsReceived: number;
    conversions: number;
    conversionRate: number;
    followupsCompleted: number;
    followupsPending: number;
    uniqueFollowupsCompleted: number;
    followupCompletionRatio: number;
    activeLeads: number;
    expectingLeads: number;
    deferredLeads: number;
    revenue: number;
    totalLostLeads: number;
    avgDaysBornToPaid: number | null;
  };
  breakdowns: {
    byZone: NameValue[];
    byHospital: NameValue[];
    byShift: NameValue[];
    byDayNight: NameValue[];
    bySource: NameValue[];
    byBirthStage: NameValue[];
    byBabyAge: NameValue[];
    byService: NameValue[];
    lostReasons: NameValue[];
  };
  converted: {
    perConvertedFollowups: { name: string; followups: number }[];
    captureToConversion: {
      name: string; source: string; babyStatus: string; createdAt: string;
      closureDate: string; days: number | null; amount: number; package: string; owner: string;
    }[];
  };
  comparison: {
    current: { leads: number; conversions: number; revenue: number };
    previous: { leads: number; conversions: number; revenue: number };
    growth: { leads: number | null; conversions: number | null; revenue: number | null };
  };
}

// ─── Small presentational helpers ─────────────────────────────────────────────

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="crm-stat-card">
      <div className="crm-stat-label">{label}</div>
      <div className="crm-stat-value">{value}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, height = 260 }: { title: string; children: React.ReactNode; height?: number }) {
  return (
    <div className="crm-card">
      <div className="crm-card-header"><h3 className="crm-card-title">{title}</h3></div>
      <div className="crm-card-body" style={{ height }}>{children}</div>
    </div>
  );
}

function PieBreakdown({ data }: { data: NameValue[] }) {
  if (!data.length) return <div className="crm-empty">No data</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
          label={({ name, percent }) => `${name ?? ""} ${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%`}
          labelLine={false} fontSize={11}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => [`${v} leads`, ""]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function BarBreakdown({ data, color = "#5F47FF", vertical = false }: { data: NameValue[]; color?: string; vertical?: boolean }) {
  if (!data.length) return <div className="crm-empty">No data</div>;
  if (vertical) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
          <Tooltip />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// "Not tracked yet" card for Phase-2 metrics that need new data capture.
function Placeholder({ title, need }: { title: string; need: string }) {
  return (
    <div className="crm-card" style={{ borderStyle: "dashed", opacity: 0.85 }}>
      <div className="crm-card-header">
        <h3 className="crm-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Lock size={13} /> {title}
        </h3>
      </div>
      <div className="crm-card-body" style={{ padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: "0.75rem", color: "var(--crm-text-muted)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--crm-warm)" }}>Not tracked yet.</strong> {need}
        </div>
      </div>
    </div>
  );
}

function GrowthPill({ v }: { v: number | null }) {
  if (v === null) return <span style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)" }}>new</span>;
  const up = v >= 0;
  const Icon = v === 0 ? Minus : up ? TrendingUp : TrendingDown;
  const color = v === 0 ? "var(--crm-text-muted)" : up ? "#22C55E" : "#EF4444";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.75rem", fontWeight: 700, color }}>
      <Icon size={13} /> {up && v !== 0 ? "+" : ""}{v}%
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedLead] = useState<string | null>(null); // reserved for future row → drawer

  // Period selectors
  const today = useMemo(() => new Date(), []);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [quarter, setQuarter] = useState(() => Math.floor(new Date().getMonth() / 3) + 1);

  // Filters
  const [fSource, setFSource] = useState("");
  const [fHospital, setFHospital] = useState("");
  const [fShift, setFShift] = useState("");
  const [fZone, setFZone] = useState("");

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ period });
    if (period === "daily") p.set("date", date);
    if (period === "monthly") p.set("month", month);
    if (period === "quarterly") { p.set("year", String(year)); p.set("quarter", String(quarter)); }
    if (fSource) p.set("source", fSource);
    if (fHospital) p.set("hospital", fHospital);
    if (fShift) p.set("shift", fShift);
    if (fZone) p.set("zone", fZone);
    return p.toString();
  }, [period, date, month, year, quarter, fSource, fHospital, fShift, fZone]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/crm/reports?${qs}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [qs]);

  const k = data?.kpis;
  const b = data?.breakdowns;
  const periodWord = period === "daily" ? "day" : period === "monthly" ? "month" : "quarter";
  const compareWord = period === "monthly" ? "MoM" : period === "quarterly" ? "QoQ" : "vs prev day";

  return (
    <>
      <LeadDrawer leadId={selectedLead} onClose={() => {}} />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Sales Dashboard</h1>
          <p className="crm-page-subtitle">
            {data ? `${data.range.startDate} → showing this ${periodWord}` : "Daily, monthly & quarterly sales tracking"}
          </p>
        </div>
      </div>

      {/* Tabs + period selector + filters */}
      <div className="crm-card mb-4">
        <div className="crm-card-body" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {/* Period tabs */}
          <div style={{ display: "inline-flex", background: "var(--crm-border)", borderRadius: 10, padding: 3 }}>
            {(["daily", "monthly", "quarterly"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className="crm-btn"
                style={{
                  border: "none", textTransform: "capitalize", fontSize: "0.8rem",
                  background: period === p ? "var(--crm-primary)" : "transparent",
                  color: period === p ? "#fff" : "var(--crm-text)",
                  boxShadow: "none",
                }}>
                {p}
              </button>
            ))}
          </div>

          {/* Period value */}
          {period === "daily" && (
            <input type="date" className="crm-input" value={date} max={format(today, "yyyy-MM-dd")}
              onChange={(e) => setDate(e.target.value)} />
          )}
          {period === "monthly" && (
            <input type="month" className="crm-input" value={month} max={format(today, "yyyy-MM")}
              onChange={(e) => setMonth(e.target.value)} />
          )}
          {period === "quarterly" && (
            <>
              <select className="crm-input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[0, 1, 2].map((o) => { const yr = today.getFullYear() - o; return <option key={yr} value={yr}>{yr}</option>; })}
              </select>
              <select className="crm-input" value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
                {[1, 2, 3, 4].map((qn) => <option key={qn} value={qn}>Q{qn}</option>)}
              </select>
            </>
          )}

          <div style={{ flex: 1 }} />

          {/* Filters */}
          <select className="crm-input" value={fSource} onChange={(e) => setFSource(e.target.value)}>
            <option value="">All sources</option>
            {["Website", "Aria Chat", "WhatsApp", "Instagram", "Facebook", "Google Ads", "Referral", "Walk-in", "Hospital Partner", "Other"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="crm-input" value={fShift} onChange={(e) => setFShift(e.target.value)}>
            <option value="">All shifts</option>
            {["Day", "Night", "24hrs"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="crm-input" value={fZone} onChange={(e) => setFZone(e.target.value)}>
            <option value="">All zones</option>
            {ZONES.map((z) => <option key={z.name} value={z.name}>{z.name}</option>)}
          </select>
          <input className="crm-input" placeholder="Hospital…" value={fHospital} style={{ width: 140 }}
            onChange={(e) => setFHospital(e.target.value)} />
        </div>
      </div>

      {error && <div className="crm-card"><div className="crm-card-body crm-empty">Couldn&apos;t load report data. Try again.</div></div>}
      {loading && !data && <div className="crm-card"><div className="crm-card-body crm-empty">Loading…</div></div>}

      {k && b && (
        <>
          {/* KPI row */}
          <div className="crm-grid-4 mb-4">
            <Kpi label={`Leads received / ${periodWord}`} value={k.leadsReceived} />
            <Kpi label={`Conversions / ${periodWord}`} value={k.conversions} sub={`${k.conversionRate}% conversion`} />
            <Kpi label="Revenue" value={`₹${k.revenue.toLocaleString("en-IN")}`} />
            <Kpi label="Active (running) leads" value={k.activeLeads} sub="all open leads" />
          </div>
          <div className="crm-grid-4 mb-4">
            <Kpi label="Follow-ups completed" value={k.followupsCompleted} sub={`${k.uniqueFollowupsCompleted} unique leads`} />
            <Kpi label="Follow-ups pending" value={k.followupsPending} sub={`${k.followupCompletionRatio}% completion ratio`} />
            <Kpi label="Expecting (due) leads" value={k.expectingLeads} />
            <Kpi label="Deferred / hold leads" value={k.deferredLeads} />
          </div>
          <div className="crm-grid-4 mb-4">
            <Kpi label="Total lost leads" value={k.totalLostLeads} />
            <Kpi label="Avg days Born → paid" value={k.avgDaysBornToPaid ?? "—"} sub="excl. hot leads > 30 days" />
            <div className="crm-stat-card">
              <div className="crm-stat-label">Growth ({compareWord})</div>
              <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.72rem" }}>Leads <GrowthPill v={data.comparison.growth.leads} /></span>
                <span style={{ fontSize: "0.72rem" }}>Won <GrowthPill v={data.comparison.growth.conversions} /></span>
                <span style={{ fontSize: "0.72rem" }}>Rev <GrowthPill v={data.comparison.growth.revenue} /></span>
              </div>
            </div>
            <Kpi label="Unique follow-ups done" value={k.uniqueFollowupsCompleted} />
          </div>

          {/* Breakdown charts */}
          <div className="crm-grid-2 mb-4">
            <ChartCard title="Leads by Zone (nearest)"><BarBreakdown data={b.byZone} color="#22C55E" vertical /></ChartCard>
            <ChartCard title="Leads by Source"><PieBreakdown data={b.bySource} /></ChartCard>
          </div>
          <div className="crm-grid-2 mb-4">
            <ChartCard title="Leads by Hospital"><BarBreakdown data={b.byHospital} vertical /></ChartCard>
            <ChartCard title="Leads by Service (Nurse / Japa)"><PieBreakdown data={b.byService} /></ChartCard>
          </div>
          <div className="crm-grid-2 mb-4">
            <ChartCard title="Leads by Shift"><BarBreakdown data={b.byShift} color="#6388FF" /></ChartCard>
            <ChartCard title="Day vs Night"><PieBreakdown data={b.byDayNight} /></ChartCard>
          </div>
          <div className="crm-grid-2 mb-4">
            <ChartCard title="Leads by Birth Stage"><BarBreakdown data={b.byBirthStage} color="#A855F7" /></ChartCard>
            <ChartCard title="Leads by Baby Age"><BarBreakdown data={b.byBabyAge} color="#06B6D4" /></ChartCard>
          </div>
          <div className="mb-4">
            <ChartCard title="Lost Reasons"><BarBreakdown data={b.lostReasons} color="#EF4444" vertical /></ChartCard>
          </div>

          {/* Converted-lead analysis */}
          <div className="crm-card mb-4">
            <div className="crm-card-header"><h3 className="crm-card-title">Lead Capture → Conversion detail</h3></div>
            <div className="crm-card-body" style={{ padding: 0, overflowX: "auto" }}>
              {data.converted.captureToConversion.length === 0 ? (
                <div className="crm-empty" style={{ padding: "1.5rem" }}>No conversions in this {periodWord}</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--crm-text-muted)", borderBottom: "1px solid var(--crm-border)" }}>
                      <th style={{ padding: "8px 12px" }}>Lead</th>
                      <th style={{ padding: "8px 12px" }}>Source</th>
                      <th style={{ padding: "8px 12px" }}>Status</th>
                      <th style={{ padding: "8px 12px" }}>Captured</th>
                      <th style={{ padding: "8px 12px" }}>Paid</th>
                      <th style={{ padding: "8px 12px" }}>Days</th>
                      <th style={{ padding: "8px 12px" }}>Follow-ups</th>
                      <th style={{ padding: "8px 12px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.converted.captureToConversion.map((r, i) => {
                      const fu = data.converted.perConvertedFollowups[i]?.followups ?? 0;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid var(--crm-border)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{r.name}</td>
                          <td style={{ padding: "8px 12px" }}>{r.source}</td>
                          <td style={{ padding: "8px 12px" }}>{r.babyStatus}</td>
                          <td style={{ padding: "8px 12px" }}>{r.createdAt ? format(new Date(r.createdAt), "dd MMM") : "—"}</td>
                          <td style={{ padding: "8px 12px" }}>{r.closureDate ? format(new Date(r.closureDate), "dd MMM") : "—"}</td>
                          <td style={{ padding: "8px 12px" }}>{r.days ?? "—"}</td>
                          <td style={{ padding: "8px 12px" }}>{fu}</td>
                          <td style={{ padding: "8px 12px" }}>₹{r.amount.toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Phase-2 placeholders — metrics awaiting new data capture */}
          <div className="crm-card-header" style={{ padding: "0 0 8px" }}>
            <h3 className="crm-card-title" style={{ color: "var(--crm-text-muted)" }}>Coming next (needs data capture)</h3>
          </div>
          <div className="crm-grid-3 mb-4">
            <Placeholder title="Follow-ups by source" need="Add a channel (WhatsApp / Call) field to the follow-up form." />
            <Placeholder title="Follow-up outcomes" need="Add an outcome (Interested / Not Responding / Deferred / Price Concern / Converted / Lost) field to follow-ups." />
            <Placeholder title="Calls made / day" need="Connect a click-to-call telephony tool to log calls per lead." />
            <Placeholder title="Revenue lost (Nurse / Japa)" need="Capture an expected value on lost leads to estimate missed revenue." />
            <Placeholder title="Staff shortage" need="Add a staff roster (Nurses / Japa availability) as a data source." />
            <Placeholder title="Revenue forecast" need="Enabled once a few months of revenue history exist for trend projection." />
          </div>
        </>
      )}
    </>
  );
}
