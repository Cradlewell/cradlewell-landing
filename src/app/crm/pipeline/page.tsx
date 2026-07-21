"use client";
import { useEffect, useRef, useState } from "react";
import { useLeads, api } from "@/lib/crm-store";
import { LEAD_STAGES } from "@/lib/crm-types";
import type { Lead, LeadStage } from "@/lib/crm-types";
import StageBadge from "@/components/crm/StageBadge";
import LeadDrawer from "@/components/crm/LeadDrawer";
import LeadFormModal from "@/components/crm/LeadFormModal";
import { useHScroll, HScrollButtons } from "@/components/crm/HScrollControls";
import { Plus, StickyNote, Calendar, Search } from "lucide-react";
import { format } from "date-fns";

function fmtLeadDate(l: Lead): string {
  const raw = l.createdAt || l.leadDate;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return typeof raw === "string" ? raw : "";
  return format(d, "dd MMM yyyy");
}

export default function PipelinePage() {
  const leads = useLeads();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);
  const kanbanScroll = useHScroll<HTMLDivElement>(leads.length);
  const kanbanRef = kanbanScroll.ref;
  const scrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [search, setSearch] = useState("");
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => () => stopScroll(), []);

  const grouped: Record<LeadStage, Lead[]> = {} as Record<LeadStage, Lead[]>;
  LEAD_STAGES.forEach(s => { grouped[s] = []; });
  leads.forEach(l => { if (grouped[l.stage]) grouped[l.stage].push(l); });

  // Search by name / phone / WhatsApp number. Matching cards are highlighted,
  // and the board auto-scrolls to the first stage that contains a match.
  const q = search.trim().toLowerCase();
  const matchLead = (l: Lead) =>
    !!q && (
      l.name.toLowerCase().includes(q) ||
      (l.phone ?? "").toLowerCase().includes(q) ||
      (l.whatsapp ?? "").toLowerCase().includes(q)
    );
  const matchCount = q ? leads.filter(matchLead).length : 0;

  useEffect(() => {
    if (!q) return;
    const stage = LEAD_STAGES.find(s => leads.some(l => l.stage === s && matchLead(l)));
    const el = stage ? colRefs.current[stage] : null;
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, leads]);

  const stopScroll = () => {
    if (scrollTimerRef.current) { clearInterval(scrollTimerRef.current); scrollTimerRef.current = null; }
  };

  const handleWrapDragOver = (e: React.DragEvent) => {
    const el = kanbanRef.current;
    if (!el) return;
    const { left, right } = el.getBoundingClientRect();
    const EDGE = 80;
    const SPEED = 16;
    stopScroll();
    if (e.clientX < left + EDGE) {
      scrollTimerRef.current = setInterval(() => { el.scrollLeft -= SPEED; }, 16);
    } else if (e.clientX > right - EDGE) {
      scrollTimerRef.current = setInterval(() => { el.scrollLeft += SPEED; }, 16);
    }
  };

  const onDragStart = (id: string) => {
    dragIdRef.current = id;
    setDragId(id);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onDrop = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    stopScroll();
    const id = dragIdRef.current;
    if (id) api.moveStage(id, stage);
    dragIdRef.current = null;
    setDragId(null);
    setOverStage(null);
  };
  const onDragEnd = () => {
    stopScroll();
    dragIdRef.current = null;
    setDragId(null);
    setOverStage(null);
  };

  return (
    <>
      <LeadFormModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Pipeline</h1>
          <p className="crm-page-subtitle">
            {q
              ? `${matchCount} match${matchCount === 1 ? "" : "es"} for “${search.trim()}”`
              : `${leads.length} leads across ${LEAD_STAGES.length} stages`}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2" style={{ flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--crm-text-muted)", pointerEvents: "none" }} />
            <input
              className="crm-input"
              placeholder="Search name or number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, width: 220 }}
            />
          </div>
          <button className="crm-btn crm-btn-primary" onClick={() => setShowNewLead(true)}>
            <Plus size={16} /> New Lead
          </button>
        </div>
      </div>

      <div
        ref={kanbanRef}
        className="crm-kanban-wrap"
        onDragOver={handleWrapDragOver}
      >
        {LEAD_STAGES.map(stage => {
          const leads = grouped[stage];
          return (
            <div
              key={stage}
              ref={el => { colRefs.current[stage] = el; }}
              className={`crm-kanban-col ${overStage === stage ? "drag-over" : ""}`}
              onDragOver={e => { onDragOver(e); setOverStage(stage); }}
              onDrop={e => onDrop(e, stage)}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage(null); }}
            >
              <div className="crm-kanban-col-header">
                <StageBadge stage={stage} size="md" />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--crm-text-muted)", background: "var(--crm-border)", borderRadius: "999px", padding: "1px 7px" }}>
                  {leads.length}
                </span>
              </div>
              <div className="crm-kanban-col-body">
                {leads.length === 0 && (
                  <div className="crm-kanban-empty">Drop leads here</div>
                )}
                {leads.map(l => {
                  const hit = matchLead(l);
                  return (
                  <div
                    key={l.id}
                    className="crm-kanban-card"
                    draggable
                    onDragStart={() => onDragStart(l.id)}
                    onDragEnd={onDragEnd}
                    onDragOver={onDragOver}
                    onDrop={e => onDrop(e, stage)}
                    onClick={() => setSelectedLead(l.id)}
                    style={{
                      opacity: dragId === l.id ? 0.4 : (q && !hit ? 0.4 : 1),
                      outline: hit ? "2px solid var(--crm-primary)" : undefined,
                      outlineOffset: hit ? 2 : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--crm-text)" }}>{l.name}</span>
                      {l.notes && (
                        <span title={l.notes} style={{ flexShrink: 0 }}>
                          <StickyNote size={13} color="var(--crm-warm)" />
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {l.serviceRequired && <span className="crm-tag">{l.serviceRequired}</span>}
                      {l.preferredShift && <span className="crm-tag">{l.preferredShift}</span>}
                      {l.shiftHoursCount != null && <span className="crm-tag">{l.shiftHoursCount} hrs</span>}
                    </div>
                    {l.shiftTime && (
                      <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)", marginTop: 4 }}>{l.shiftTime}</div>
                    )}
                    {fmtLeadDate(l) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.7rem", color: "var(--crm-text-muted)", marginTop: 6 }}>
                        <Calendar size={11} />{fmtLeadDate(l)}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Horizontal scroll controls */}
      <HScrollButtons ctrl={kanbanScroll} />
    </>
  );
}
