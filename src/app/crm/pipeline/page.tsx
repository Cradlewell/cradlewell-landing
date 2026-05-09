"use client";
import { useState } from "react";
import { useDB, api } from "@/lib/crm-store";
import { LEAD_STAGES } from "@/lib/crm-types";
import type { LeadStage } from "@/lib/crm-types";
import StageBadge from "@/components/crm/StageBadge";
import LeadDrawer from "@/components/crm/LeadDrawer";
import LeadFormModal from "@/components/crm/LeadFormModal";
import { Plus, StickyNote } from "lucide-react";

export default function PipelinePage() {
  const db = useDB();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);

  const grouped: Record<LeadStage, typeof db.leads> = {} as Record<LeadStage, typeof db.leads>;
  LEAD_STAGES.forEach(s => { grouped[s] = []; });
  db.leads.forEach(l => { if (grouped[l.stage]) grouped[l.stage].push(l); });

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    setOverStage(stage);
  };
  const onDrop = (stage: LeadStage) => {
    if (dragId) api.moveStage(dragId, stage);
    setDragId(null);
    setOverStage(null);
  };
  const onDragEnd = () => { setDragId(null); setOverStage(null); };

  return (
    <>
      <LeadFormModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <LeadDrawer leadId={selectedLead} onClose={() => setSelectedLead(null)} />

      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Pipeline</h1>
          <p className="crm-page-subtitle">{db.leads.length} leads across {LEAD_STAGES.length} stages</p>
        </div>
        <button className="crm-btn crm-btn-primary" onClick={() => setShowNewLead(true)}>
          <Plus size={16} /> New Lead
        </button>
      </div>

      <div className="crm-kanban-wrap">
        {LEAD_STAGES.map(stage => {
          const leads = grouped[stage];
          return (
            <div
              key={stage}
              className={`crm-kanban-col ${overStage === stage ? "drag-over" : ""}`}
              onDragOver={e => onDragOver(e, stage)}
              onDrop={() => onDrop(stage)}
              onDragLeave={() => setOverStage(null)}
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
                {leads.map(l => (
                  <div
                    key={l.id}
                    className="crm-kanban-card"
                    draggable
                    onDragStart={() => onDragStart(l.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => setSelectedLead(l.id)}
                    style={{ opacity: dragId === l.id ? 0.4 : 1 }}
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
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
