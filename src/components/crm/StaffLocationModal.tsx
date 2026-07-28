"use client";
import { useState, useEffect, useCallback } from "react";
import { X, MapPin, Plus, Edit2, Trash2, Save, RotateCcw } from "lucide-react";
import { confirm } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";

export interface StaffLocation {
  id: string;
  name: string;
  home_lat: number | null;
  home_lng: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  // Fired after any successful create/update/delete so the caller can refetch
  // distances — they are computed from these coordinates.
  onChanged: () => void;
}

const BLANK = { name: "", lat: "", lng: "" };

export default function StaffLocationModal({ open, onClose, onChanged }: Props) {
  const [staff, setStaff] = useState<StaffLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/staff-locations", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setStaff(await res.json());
    } catch {
      toast.error("Could not load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) { load(); resetForm(); } }, [open, load]);

  if (!open) return null;

  function resetForm() {
    setEditingId(null);
    setForm({ ...BLANK });
    setError(null);
  }

  const startEdit = (s: StaffLocation) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      lat: s.home_lat != null ? String(s.home_lat) : "",
      lng: s.home_lng != null ? String(s.home_lng) : "",
    });
    setError(null);
  };

  // Mirrors the server-side checks so bad input is caught before a round trip.
  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required";
    const hasLat = form.lat.trim() !== "";
    const hasLng = form.lng.trim() !== "";
    if (hasLat !== hasLng) return "Enter both latitude and longitude, or leave both blank";
    if (hasLat) {
      const lat = Number(form.lat);
      const lng = Number(form.lng);
      if (!Number.isFinite(lat) || Math.abs(lat) > 90) return "Latitude must be a number between -90 and 90";
      if (!Number.isFinite(lng) || Math.abs(lng) > 180) return "Longitude must be a number between -180 and 180";
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validate();
    if (invalid) { setError(invalid); return; }

    setSaving(true);
    setError(null);
    const payload = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name.trim(),
      home_lat: form.lat.trim(),
      home_lng: form.lng.trim(),
    };
    try {
      const res = await fetch("/api/crm/staff-locations", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not save staff");
        return;
      }
      toast.success(editingId ? `"${payload.name}" updated` : `"${payload.name}" added`);
      resetForm();
      await load();
      onChanged();
    } catch {
      setError("Could not save staff");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: StaffLocation) => {
    const ok = await confirm({
      title: `Remove "${s.name}"?`,
      body: "They will no longer appear as nearby staff for any lead. The operations roster is a separate list and is not affected.",
      confirmText: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/crm/staff-locations?id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(`"${s.name}" removed`);
      if (editingId === s.id) resetForm();
      await load();
      onChanged();
    } catch {
      toast.error("Could not remove staff");
    }
  };

  const located = staff.filter(s => s.home_lat != null && s.home_lng != null).length;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1059 }} onClick={onClose} />
      <div className="modal fade show d-block crm-modal" style={{ zIndex: 1060 }} role="dialog" aria-modal="true" aria-label="Update staff location">
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--crm-primary-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={16} color="var(--crm-primary)" />
                </div>
                <h5 className="modal-title">Update the location of staff</h5>
              </div>
              <button type="button" className="crm-btn crm-btn-ghost crm-btn-icon" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "1.25rem" }}>
              <form onSubmit={submit}>
                <p className="crm-section-title">{editingId ? "Edit staff" : "Add staff"}</p>
                <div className="crm-grid-2 mb-2">
                  <div className="crm-form-group">
                    <label className="crm-label required">Staff Name</label>
                    <input
                      className="crm-input"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Anitha R"
                    />
                  </div>
                  <div className="crm-form-group">
                    <label className="crm-label">Latitude</label>
                    <input
                      className="crm-input crm-tabular"
                      value={form.lat}
                      onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                      placeholder="12.9716"
                      inputMode="decimal"
                    />
                  </div>
                </div>
                <div className="crm-grid-2 mb-2">
                  <div className="crm-form-group">
                    <label className="crm-label">Longitude</label>
                    <input
                      className="crm-input crm-tabular"
                      value={form.lng}
                      onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                      placeholder="77.5946"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <p style={{ fontSize: "0.75rem", color: "var(--crm-text-muted)", marginBottom: "0.75rem" }}>
                  Staff without coordinates are saved but cannot be distance-ranked against leads.
                </p>

                {error && (
                  <div style={{ fontSize: "0.78rem", color: "#DC2626", marginBottom: "0.75rem" }}>{error}</div>
                )}

                <div className="d-flex gap-2 mb-3">
                  <button type="submit" className="crm-btn crm-btn-primary crm-btn-sm" disabled={saving}>
                    {editingId ? <><Save size={14} /> Save changes</> : <><Plus size={14} /> Add staff</>}
                  </button>
                  {editingId && (
                    <button type="button" className="crm-btn crm-btn-ghost crm-btn-sm" onClick={resetForm} disabled={saving}>
                      <RotateCcw size={14} /> Cancel edit
                    </button>
                  )}
                </div>
              </form>

              <p className="crm-section-title">
                Staff roster
                <span style={{ fontWeight: 500, color: "var(--crm-text-muted)", marginLeft: 8, textTransform: "none", letterSpacing: 0 }}>
                  {located} of {staff.length} with coordinates
                </span>
              </p>

              {loading ? (
                <div className="crm-empty" style={{ padding: "1.5rem" }}>Loading…</div>
              ) : staff.length === 0 ? (
                <EmptyState icon={<MapPin size={32} />} title="No staff yet" description="Add your first staff member above." />
              ) : (
                <div className="crm-table-wrap">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Latitude</th>
                        <th>Longitude</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map(s => (
                        <tr key={s.id} style={{ background: editingId === s.id ? "var(--crm-primary-light)" : undefined }}>
                          <td style={{ fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{s.name}</td>
                          <td className="crm-tabular" style={{ fontSize: "0.8rem" }}>
                            {s.home_lat != null ? s.home_lat : <span style={{ color: "var(--crm-text-3)" }}>—</span>}
                          </td>
                          <td className="crm-tabular" style={{ fontSize: "0.8rem" }}>
                            {s.home_lng != null ? s.home_lng : <span style={{ color: "var(--crm-text-3)" }}>—</span>}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              className="crm-btn crm-btn-ghost crm-btn-sm"
                              onClick={() => startEdit(s)}
                              title={`Edit ${s.name}`}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="crm-btn crm-btn-ghost crm-btn-sm"
                              style={{ color: "#DC2626" }}
                              onClick={() => remove(s)}
                              title={`Remove ${s.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="crm-btn crm-btn-ghost crm-btn-sm" onClick={onClose}>Done</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
