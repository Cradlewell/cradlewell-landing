"use client";
import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { api } from "@/lib/crm-store";
import type { LeadSource, BabyStatus, Shift } from "@/lib/crm-types";

const SOURCES: LeadSource[] = ["Website", "WhatsApp"];
const SHIFTS: Shift[] = ["Day", "Night", "24hrs"];

interface Props {
  open: boolean;
  onClose: () => void;
}

const HOURS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const MINS = ["00","15","30","45"];

const INIT = {
  name: "", phone: "", source: "Website" as LeadSource,
  serviceRequired: "Newborn Care", babyStatus: "Born" as BabyStatus,
  hospitalName: "", babyBirthStageStatus: "",
  babyAge: "", currentWeight: "", address: "",
  preferredShift: "Day" as Shift,
  shiftHoursCount: "" as unknown as number,
  shiftStartHour: "9", shiftStartMin: "00", shiftStartAmpm: "AM",
  shiftEndHour: "5", shiftEndMin: "00", shiftEndAmpm: "PM",
  careStartDate: "", serviceDays: "" as unknown as number,
  notes: "",
};

export default function LeadFormModal({ open, onClose }: Props) {
  const [form, setForm] = useState({ ...INIT });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const set = (k: keyof typeof INIT, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    const shiftTime = `${form.shiftStartHour}:${form.shiftStartMin} ${form.shiftStartAmpm} - ${form.shiftEndHour}:${form.shiftEndMin} ${form.shiftEndAmpm}`;
    api.addLead({
      name: form.name.trim(),
      phone: form.phone.trim(),
      whatsapp: form.phone.trim(),
      source: form.source,
      leadDate: new Date().toISOString(),
      serviceRequired: form.serviceRequired,
      babyStatus: form.babyStatus,
      hospitalName: form.hospitalName || undefined,
      babyBirthStageStatus: form.babyBirthStageStatus || undefined,
      babyAge: form.babyAge || undefined,
      currentWeight: form.currentWeight || undefined,
      address: form.address || undefined,
      preferredShift: form.preferredShift,
      shiftHoursCount: Number(form.shiftHoursCount) || undefined,
      shiftTime,
      careStartDate: form.careStartDate || undefined,
      serviceDays: Number(form.serviceDays) || undefined,
      notes: form.notes || undefined,
      owner: "Unassigned",
    });
    setSaving(false);
    setForm({ ...INIT });
    onClose();
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1059 }} onClick={onClose} />
      <div className="modal fade show d-block crm-modal" style={{ zIndex: 1060 }} role="dialog" aria-modal="true" aria-label="New Lead">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--crm-primary-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus size={16} color="var(--crm-primary)" />
                </div>
                <h5 className="modal-title">New Lead</h5>
              </div>
              <button type="button" className="crm-btn crm-btn-ghost crm-btn-icon" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: "1.25rem" }}>

                {/* Contact */}
                <p className="crm-section-title">Contact Info</p>
                <div className="crm-grid-2 mb-3">
                  <div className="crm-form-group">
                    <label className="crm-label required">Full Name</label>
                    <input className="crm-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Priya Sharma" required />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label required">Phone</label>
                    <input className="crm-input" type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="9876543210" required />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Lead Source</label>
                    <select className="crm-select" value={form.source} onChange={e => set("source", e.target.value)}>
                      {SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Service Required</label>
                    <select className="crm-select" value={form.serviceRequired} onChange={e => set("serviceRequired", e.target.value)}>
                      <option>Newborn Care</option>
                      <option>Nurse Care</option>
                      <option>Moba Care</option>
                    </select>
                  </div>
                </div>

                {/* Baby */}
                <p className="crm-section-title">Baby Details</p>
                <div className="crm-grid-2 mb-3">
                  <div className="crm-form-group">
                    <label className="crm-label">Baby Status</label>
                    <select className="crm-select" value={form.babyStatus} onChange={e => set("babyStatus", e.target.value)}>
                      <option>Born</option><option>Expecting</option>
                    </select>
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Hospital Name</label>
                    <input className="crm-input" value={form.hospitalName} onChange={e => set("hospitalName", e.target.value)} placeholder="Manipal Hospital" />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Birth Stage</label>
                    <input className="crm-input" value={form.babyBirthStageStatus} onChange={e => set("babyBirthStageStatus", e.target.value)} placeholder="Full term / Pre-term / NICU" />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Baby Age</label>
                    <input className="crm-input" value={form.babyAge} onChange={e => set("babyAge", e.target.value)} placeholder="5 days / 8 months pregnant" />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Current Weight</label>
                    <input className="crm-input" value={form.currentWeight} onChange={e => set("currentWeight", e.target.value)} placeholder="3.1 kg" />
                  </div>
                </div>

                {/* Shift */}
                <p className="crm-section-title">Shift Details</p>
                <div className="crm-grid-2 mb-3">
                  <div className="crm-form-group">
                    <label className="crm-label">Preferred Shift</label>
                    <select className="crm-select" value={form.preferredShift} onChange={e => set("preferredShift", e.target.value)}>
                      {SHIFTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Shift Hours</label>
                    <input className="crm-input" type="number" value={form.shiftHoursCount} onChange={e => set("shiftHoursCount", e.target.value)} placeholder="12" />
                  </div>
                  <div className="crm-form-group" style={{ gridColumn: "1/-1" }}>
                    <label className="crm-label">Shift Time</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <select className="crm-select" style={{ flex: 1, minWidth: 60 }} value={form.shiftStartHour} onChange={e => set("shiftStartHour", e.target.value)}>
                        {HOURS.map(h => <option key={h}>{h}</option>)}
                      </select>
                      <select className="crm-select" style={{ flex: 1, minWidth: 60 }} value={form.shiftStartMin} onChange={e => set("shiftStartMin", e.target.value)}>
                        {MINS.map(m => <option key={m}>{m}</option>)}
                      </select>
                      <select className="crm-select" style={{ flex: 1, minWidth: 60 }} value={form.shiftStartAmpm} onChange={e => set("shiftStartAmpm", e.target.value)}>
                        <option>AM</option><option>PM</option>
                      </select>
                      <span style={{ color: "var(--crm-text-muted)", fontWeight: 600, fontSize: "0.85rem" }}>to</span>
                      <select className="crm-select" style={{ flex: 1, minWidth: 60 }} value={form.shiftEndHour} onChange={e => set("shiftEndHour", e.target.value)}>
                        {HOURS.map(h => <option key={h}>{h}</option>)}
                      </select>
                      <select className="crm-select" style={{ flex: 1, minWidth: 60 }} value={form.shiftEndMin} onChange={e => set("shiftEndMin", e.target.value)}>
                        {MINS.map(m => <option key={m}>{m}</option>)}
                      </select>
                      <select className="crm-select" style={{ flex: 1, minWidth: 60 }} value={form.shiftEndAmpm} onChange={e => set("shiftEndAmpm", e.target.value)}>
                        <option>AM</option><option>PM</option>
                      </select>
                    </div>
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Care Start Date</label>
                    <input className="crm-input" type="date" value={form.careStartDate} onChange={e => set("careStartDate", e.target.value)} />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Service Days</label>
                    <input className="crm-input" type="number" value={form.serviceDays} onChange={e => set("serviceDays", e.target.value)} placeholder="30" />
                  </div>
                </div>

                {/* Location */}
                <p className="crm-section-title">Location</p>
                <div className="crm-form-group mb-3">
                  <label className="crm-label">Address</label>
                  <textarea className="crm-textarea" value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full address..." style={{ minHeight: 60 }} />
                </div>

                {/* Notes */}
                <div className="crm-form-group">
                  <label className="crm-label">Notes</label>
                  <textarea className="crm-textarea" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any special requirements..." />
                </div>
              </div>

              <div className="modal-footer gap-2">
                <button type="button" className="crm-btn crm-btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="crm-btn crm-btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
