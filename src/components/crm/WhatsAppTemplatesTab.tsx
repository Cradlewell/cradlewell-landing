"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle, Search, RefreshCw, Plus, X, Trash2, Pencil,
  BarChart2, Settings2, HelpCircle, Upload, Image as ImageIcon, Video, FileText, Loader2, MapPin,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm-dialog";

// ── Types ────────────────────────────────────────────────────────────────────
interface TemplateButton {
  type: string;
  text: string;
  url?: string;
  phone_number?: string;
}
interface TemplateRow {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  title: string;
  headerFormat: string;
  headerText: string;
  bodyText: string;
  footerText: string;
  buttons: TemplateButton[];
  varCount: number;
}

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "en_US", label: "English (US)" },
  { code: "en_GB", label: "English (UK)" },
  { code: "hi", label: "Hindi" },
  { code: "kn", label: "Kannada" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
];
const HEADER_FORMATS = ["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"];

function statusStyle(status: string): { bg: string; color: string } {
  const s = status.toUpperCase();
  if (s === "APPROVED") return { bg: "#E7F7ED", color: "#1B9E4B" };
  if (s === "PENDING")  return { bg: "#FFF7E6", color: "#B7791F" };
  if (s === "REJECTED" || s === "DISABLED") return { bg: "#FDECEC", color: "#D64545" };
  return { bg: "#EEF1F4", color: "#64748B" };
}

// The "Live chat status" toggle is an app-side preference (whether a template is
// surfaced in the live-chat template picker); persisted locally per template.
const LIVE_KEY = "cradlewell_wa_template_livechat";
function readLiveMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(LIVE_KEY) || "{}"); } catch { return {}; }
}

// ── New-template button model ────────────────────────────────────────────────
type BtnKind = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
interface DraftButton { id: number; type: BtnKind; text: string; url: string; phone_number: string; }

export default function WhatsAppTemplatesTab() {
  const [rows, setRows]         = useState<TemplateRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [liveMap, setLiveMap]   = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { setLiveMap(readLiveMap()); }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/crm/whatsapp-templates", { cache: "no-store" });
      const data = await res.json();
      setRows(data.templates ?? []);
      if (data.error) setError(data.error);
    } catch {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleLive(name: string) {
    setLiveMap(prev => {
      const next = { ...prev, [name]: !prev[name] };
      try { window.localStorage.setItem(LIVE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function handleDelete(t: TemplateRow) {
    const ok = await confirm({
      title: "Delete template",
      body: `Delete “${t.name}”? This removes it from your WhatsApp Business account and cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/crm/whatsapp-templates?name=${encodeURIComponent(t.name)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success("Template deleted");
      setRows(prev => prev.filter(r => r.name !== t.name));
    } else {
      toast.error(data.error || "Failed to delete template");
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(r => r.name.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
    : rows;

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "#f6f8fa", padding: "1.25rem 1.5rem" }}>
      {/* Heading */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--crm-text)" }}>WhatsApp Message Templates</h2>
        <MessageCircle size={17} color="#25D366" />
      </div>

      {/* Toolbar */}
      <div style={{ background: "#fff", border: "1px solid #e6eaee", borderRadius: 10, padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "stretch", maxWidth: 340, width: "100%" }}>
          <input
            className="crm-input"
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ borderRadius: "8px 0 0 8px", borderRight: "none" }}
          />
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 42, border: "1px solid var(--crm-border)", borderRadius: "0 8px 8px 0", background: "#fff", color: "var(--crm-text-muted)" }}>
            <Search size={15} />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => load()} style={{ border: "1px solid var(--crm-border)" }}>
            <RefreshCw size={14} /> Sync
          </button>
          <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Template
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #e6eaee", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="crm-table" style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th>Language</th>
                <th>Name</th>
                <th>Title</th>
                <th>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Live chat status
                    <HelpCircle size={12} style={{ color: "var(--crm-text-muted)" }} />
                  </span>
                </th>
                <th>Category</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "var(--crm-text-muted)" }}>Loading templates…</td></tr>
              ) : error ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "#D64545" }}>{error}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "2.5rem", color: "var(--crm-text-muted)" }}>
                  {q ? "No templates match your search." : "No templates yet. Click “Template” to create one."}
                </td></tr>
              ) : filtered.map(t => {
                const ss = statusStyle(t.status);
                const isLive = !!liveMap[t.name];
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700, color: "var(--crm-text)", textTransform: "uppercase", fontSize: "0.8rem" }}>{t.language}</td>
                    <td style={{ fontWeight: 600, fontSize: "0.85rem" }}>{t.name}</td>
                    <td style={{ color: t.title ? "var(--crm-text)" : "var(--crm-text-muted)", fontSize: "0.85rem" }}>
                      {t.title || "Custom title"}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleLive(t.name)}
                        title={isLive ? "Shown in live chat" : "Hidden from live chat"}
                        style={{
                          width: 38, height: 20, borderRadius: 999, border: "none", cursor: "pointer",
                          background: isLive ? "#25D366" : "#cfd8dd", position: "relative", transition: "background 0.15s", padding: 0,
                        }}
                      >
                        <span style={{ position: "absolute", top: 2, left: isLive ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.25)" }} />
                      </button>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--crm-text)", fontWeight: 500 }}>{t.category}</td>
                    <td>
                      <span style={{ background: ss.bg, color: ss.color, borderRadius: 6, padding: "2px 9px", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.03em" }}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                        <IconBtn title="Analytics"><BarChart2 size={14} /></IconBtn>
                        <IconBtn title="Details"><HelpCircle size={14} /></IconBtn>
                        <IconBtn title="Configure"><Settings2 size={14} /></IconBtn>
                        <IconBtn title="Edit" onClick={() => toast.info("Editing an existing template isn't supported by Meta — delete and recreate it.")}><Pencil size={14} /></IconBtn>
                        <IconBtn title="Delete" danger onClick={() => handleDelete(t)}><Trash2 size={14} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid #e0e5e9", borderRadius: 7, background: "#fff", cursor: "pointer",
        color: danger ? "#D64545" : "#5a6b78",
      }}
    >
      {children}
    </button>
  );
}

// ── Create template modal (image 2) ──────────────────────────────────────────
function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]           = useState("");
  const [category, setCategory]   = useState("MARKETING");
  const [language, setLanguage]   = useState("en");
  const [headerFormat, setHeaderFormat] = useState("NONE");
  const [headerText, setHeaderText]     = useState("");
  const [bodyText, setBodyText]   = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons]     = useState<DraftButton[]>([]);
  const [bodyExamples, setBodyExamples] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const [btnSeq, setBtnSeq]       = useState(1);

  // Media header (IMAGE / VIDEO / DOCUMENT) — uploaded to Meta for the example handle.
  const [headerHandle, setHeaderHandle]   = useState("");
  const [headerFileName, setHeaderFileName] = useState("");
  const [headerPreviewUrl, setHeaderPreviewUrl] = useState("");
  const [headerUploading, setHeaderUploading]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMediaHeader = ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat);
  const acceptFor = headerFormat === "IMAGE" ? "image/*" : headerFormat === "VIDEO" ? "video/*" : ".pdf,application/pdf";

  // Keep the example inputs in sync with the {{n}} placeholders in the body.
  const varCount = (bodyText.match(/\{\{\s*\d+\s*\}\}/g) ?? []).length;
  useEffect(() => {
    setBodyExamples(prev => Array.from({ length: varCount }, (_, i) => prev[i] ?? ""));
  }, [varCount]);

  // Release the last object URL when the modal unmounts.
  useEffect(() => () => { if (headerPreviewUrl) URL.revokeObjectURL(headerPreviewUrl); }, [headerPreviewUrl]);

  // Reset any uploaded media when the header type changes.
  function changeHeaderFormat(fmt: string) {
    setHeaderFormat(fmt);
    setHeaderHandle("");
    setHeaderFileName("");
    setHeaderPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return ""; });
  }

  async function handleFile(file: File) {
    setErr(null);
    setHeaderUploading(true);
    setHeaderFileName(file.name);
    setHeaderPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return headerFormat === "DOCUMENT" ? "" : URL.createObjectURL(file); });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/crm/whatsapp-templates/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.handle) {
        setHeaderHandle(data.handle);
      } else {
        setHeaderHandle("");
        setErr(data.error || "Failed to upload media");
      }
    } finally {
      setHeaderUploading(false);
    }
  }

  function addButton(type: BtnKind) {
    if (buttons.length >= 3) { setErr("A template can have at most 3 buttons here."); return; }
    setButtons(prev => [...prev, { id: btnSeq, type, text: "", url: "", phone_number: "" }]);
    setBtnSeq(s => s + 1);
  }
  function updateButton(id: number, patch: Partial<DraftButton>) {
    setButtons(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  }
  function removeButton(id: number) {
    setButtons(prev => prev.filter(b => b.id !== id));
  }

  async function submit() {
    setErr(null);
    if (!name.trim())     { setErr("Template name is required."); return; }
    if (!bodyText.trim()) { setErr("Body is required."); return; }
    if (isMediaHeader && headerUploading) { setErr("Wait for the media upload to finish."); return; }
    if (isMediaHeader && !headerHandle)   { setErr(`Upload a ${headerFormat.toLowerCase()} for the header first.`); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/crm/whatsapp-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, category, language,
          headerFormat,
          headerText: headerFormat === "TEXT" ? headerText : "",
          headerHandle: isMediaHeader ? headerHandle : "",
          bodyText, footerText,
          bodyExamples,
          buttons: buttons.map(b => ({ type: b.type, text: b.text, url: b.url, phone_number: b.phone_number })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Template sent to Meta for review");
        onCreated();
      } else {
        setErr(data.error || "Failed to create template");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const labelStyle: React.CSSProperties = { fontSize: "0.8rem", fontWeight: 600, color: "var(--crm-text)", marginBottom: 5, display: "block" };
  const req = <span style={{ color: "#D64545" }}>*</span>;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1080, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2.5vh 1rem", overflowY: "auto" }}>
      <style>{`.crm-spin{animation:crm-spin 0.8s linear infinite}@media (max-width:900px){.wa-preview-col{display:none!important}}`}</style>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
      <div style={{ position: "relative", width: "min(1160px, 100%)", background: "#fff", borderRadius: 12, boxShadow: "0 24px 70px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", maxHeight: "95vh" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.5rem", borderBottom: "1px solid var(--crm-border)" }}>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--crm-text)" }}>Add New Template</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--crm-text-muted)", padding: 4, display: "flex" }}><X size={18} /></button>
        </div>

        {/* Body: form (left) + live preview (right) */}
        <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
        <div style={{ flex: 1, minWidth: 0, padding: "1.25rem 1.5rem", overflowY: "auto" }}>
          {/* Name */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>{req} Name</label>
            <div style={{ position: "relative" }}>
              <input
                className="crm-input"
                placeholder="Enter message template name in English"
                value={name}
                maxLength={200}
                onChange={e => setName(e.target.value)}
              />
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--crm-text-muted)" }}>{name.length}/200</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)", marginTop: 4 }}>
              Lowercase letters, numbers and underscores only — spaces become “_”.
            </div>
          </div>

          {/* Category + Language */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>{req} Category / Type</label>
              <select className="crm-input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{req} Language</label>
              <select className="crm-input" value={language} onChange={e => setLanguage(e.target.value)}>
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <div style={{ fontSize: "0.72rem", color: "var(--crm-text-muted)", marginTop: 4 }}>
                Please note, the language of the text below must match with the language selected above.
              </div>
            </div>
          </div>

          {/* Interactive component tabs (Buttons is the active one) */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Interactive component</label>
            <div style={{ display: "inline-flex", border: "1px solid var(--crm-border)", borderRadius: 8, overflow: "hidden" }}>
              {["Buttons", "Call permission request", "Contact info request", "Order details"].map((tab, i) => (
                <div
                  key={tab}
                  title={i === 0 ? undefined : "Not available"}
                  style={{
                    padding: "7px 14px", fontSize: "0.78rem", fontWeight: 600,
                    background: i === 0 ? "var(--crm-primary)" : "#fff",
                    color: i === 0 ? "#fff" : "var(--crm-text-muted)",
                    borderLeft: i === 0 ? "none" : "1px solid var(--crm-border)",
                    cursor: i === 0 ? "default" : "not-allowed",
                  }}
                >
                  {tab}
                </div>
              ))}
            </div>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Header</label>
              <select className="crm-input" style={{ width: 200 }} value={headerFormat} onChange={e => changeHeaderFormat(e.target.value)}>
                {HEADER_FORMATS.map(f => <option key={f} value={f}>{f === "NONE" ? "None" : f.charAt(0) + f.slice(1).toLowerCase()}</option>)}
              </select>
            </div>

            {headerFormat === "TEXT" && (
              <input className="crm-input" placeholder="Header text" value={headerText} maxLength={60} onChange={e => setHeaderText(e.target.value)} />
            )}

            {isMediaHeader && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptFor}
                  style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                />
                <div
                  onClick={() => !headerUploading && fileInputRef.current?.click()}
                  style={{
                    border: "1.5px dashed var(--crm-border)", borderRadius: 10,
                    padding: "1.5rem 1rem", textAlign: "center", cursor: headerUploading ? "default" : "pointer",
                    background: "#fafbfc", color: "var(--crm-text-muted)",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  }}
                >
                  {headerUploading ? (
                    <>
                      <Loader2 size={22} className="crm-spin" />
                      <span style={{ fontSize: "0.8rem" }}>Uploading…</span>
                    </>
                  ) : headerFileName ? (
                    <>
                      {headerFormat === "IMAGE" && headerPreviewUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={headerPreviewUrl} alt="" style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 8, objectFit: "cover" }} />
                        : headerFormat === "VIDEO"
                        ? <Video size={26} />
                        : <FileText size={26} />}
                      <span style={{ fontSize: "0.8rem", color: "var(--crm-text)", fontWeight: 600, wordBreak: "break-all" }}>{headerFileName}</span>
                      <span style={{ fontSize: "0.72rem", color: headerHandle ? "#1B9E4B" : "#D64545" }}>
                        {headerHandle ? "Uploaded ✓ — click to replace" : "Upload failed — click to retry"}
                      </span>
                    </>
                  ) : (
                    <>
                      {headerFormat === "IMAGE" ? <ImageIcon size={26} /> : headerFormat === "VIDEO" ? <Video size={26} /> : <FileText size={26} />}
                      <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                        <Upload size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                        {headerFormat === "IMAGE" ? "Upload an image" : headerFormat === "VIDEO" ? "Upload a video" : "Upload a document"}
                      </span>
                      <span style={{ fontSize: "0.72rem" }}>
                        {headerFormat === "IMAGE" ? "JPG or PNG" : headerFormat === "VIDEO" ? "MP4" : "PDF"} · used as the sample for Meta review
                      </span>
                    </>
                  )}
                </div>
              </>
            )}

            {headerFormat === "LOCATION" && (
              <div style={{ border: "1.5px dashed var(--crm-border)", borderRadius: 10, padding: "1rem", textAlign: "center", color: "var(--crm-text-muted)", fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <MapPin size={15} /> A location is attached when the template is sent.
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>{req} Body</label>
            <textarea
              className="crm-input"
              rows={5}
              placeholder="Enter the body of your message. Use {{1}}, {{2}}… for variables."
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              style={{ resize: "vertical", lineHeight: 1.5 }}
            />
            {varCount > 0 && (
              <div style={{ marginTop: 10, background: "#f6f8fa", border: "1px solid #e6eaee", borderRadius: 8, padding: "0.75rem 0.9rem" }}>
                <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--crm-text)", marginBottom: 8 }}>Sample values (required by Meta for review)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {bodyExamples.map((v, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--crm-text-muted)", width: 44 }}>{`{{${i + 1}}}`}</span>
                      <input className="crm-input" value={v} placeholder={`Example for {{${i + 1}}}`} onChange={e => setBodyExamples(prev => prev.map((x, j) => j === i ? e.target.value : x))} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Footer</label>
            <div style={{ position: "relative" }}>
              <input className="crm-input" placeholder="Add a short line of text to the bottom of your message template." value={footerText} maxLength={60} onChange={e => setFooterText(e.target.value)} />
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.7rem", color: "var(--crm-text-muted)" }}>{footerText.length}/60</span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Buttons</label>
            <div style={{ border: "1px solid var(--crm-border)", borderRadius: 8, padding: "0.9rem" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <AddBtn label="+ Phone" onClick={() => addButton("PHONE_NUMBER")} />
                <AddBtn label="+ URL" onClick={() => addButton("URL")} />
                <AddBtn label="+ Reply Button" onClick={() => addButton("QUICK_REPLY")} />
                <AddBtn label="+ Flow Button" disabled />
                <AddBtn label="+ Call Button" onClick={() => addButton("PHONE_NUMBER")} />
              </div>

              {buttons.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  {buttons.map(b => (
                    <div key={b.id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--crm-text-muted)", width: 96 }}>
                        {b.type === "URL" ? "URL" : b.type === "PHONE_NUMBER" ? "Phone / Call" : "Quick reply"}
                      </span>
                      <input className="crm-input" style={{ flex: "1 1 140px" }} placeholder="Button text" value={b.text} maxLength={25} onChange={e => updateButton(b.id, { text: e.target.value })} />
                      {b.type === "URL" && (
                        <input className="crm-input" style={{ flex: "1 1 180px" }} placeholder="https://…" value={b.url} onChange={e => updateButton(b.id, { url: e.target.value })} />
                      )}
                      {b.type === "PHONE_NUMBER" && (
                        <input className="crm-input" style={{ flex: "1 1 160px" }} placeholder="+91…" value={b.phone_number} onChange={e => updateButton(b.id, { phone_number: e.target.value })} />
                      )}
                      <button onClick={() => removeButton(b.id)} title="Remove" style={{ border: "1px solid #e0e5e9", borderRadius: 7, background: "#fff", cursor: "pointer", color: "#D64545", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {err && <div style={{ marginTop: 14, background: "#FDECEC", border: "1px solid #F5C2C2", color: "#C0392B", borderRadius: 8, padding: "0.65rem 0.9rem", fontSize: "0.8rem" }}>{err}</div>}
        </div>

        {/* Live preview column */}
        <div className="wa-preview-col" style={{ width: 360, flexShrink: 0, borderLeft: "1px solid var(--crm-border)", background: "#eae6df", padding: "1.25rem", overflowY: "auto" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#667781", marginBottom: 12 }}>Preview</div>
          <div style={{ background: "#fff", borderRadius: "8px 8px 8px 2px", boxShadow: "0 1px 2px rgba(0,0,0,0.18)", padding: 8, maxWidth: 320 }}>
            {/* Header media / text */}
            {isMediaHeader && (
              <div style={{ borderRadius: 6, overflow: "hidden", marginBottom: 6, background: "#f0f2f5", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 150 }}>
                {headerFormat === "IMAGE" && headerPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={headerPreviewUrl} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                ) : headerFormat === "VIDEO" && headerPreviewUrl ? (
                  <video src={headerPreviewUrl} style={{ width: "100%", maxHeight: 200 }} controls />
                ) : (
                  <div style={{ color: "#8696a0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 24 }}>
                    {headerFormat === "VIDEO" ? <Video size={30} /> : headerFormat === "DOCUMENT" ? <FileText size={30} /> : <ImageIcon size={30} />}
                    <span style={{ fontSize: "0.72rem" }}>{headerFormat.charAt(0) + headerFormat.slice(1).toLowerCase()}</span>
                  </div>
                )}
              </div>
            )}
            {headerFormat === "TEXT" && headerText.trim() && (
              <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "#111b21", padding: "2px 4px 4px" }}>{headerText}</div>
            )}
            {/* Body */}
            <div style={{ fontSize: "0.85rem", color: "#111b21", whiteSpace: "pre-wrap", lineHeight: 1.4, padding: "2px 4px", wordBreak: "break-word" }}>
              {bodyText.trim()
                ? bodyText.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => bodyExamples[Number(n) - 1]?.trim() || `{{${n}}}`)
                : <span style={{ color: "#8696a0" }}>Your message body appears here…</span>}
            </div>
            {/* Footer */}
            {footerText.trim() && (
              <div style={{ fontSize: "0.72rem", color: "#8696a0", padding: "4px 4px 2px" }}>{footerText}</div>
            )}
            {/* Time */}
            <div style={{ fontSize: "0.64rem", color: "#8696a0", textAlign: "right", padding: "0 4px 2px" }}>12:00 pm</div>
            {/* Buttons */}
            {buttons.length > 0 && (
              <div style={{ borderTop: "1px solid #e9edef", margin: "4px -8px -8px", }}>
                {buttons.map(b => (
                  <div key={b.id} style={{ textAlign: "center", color: "#00a5f4", fontSize: "0.82rem", fontWeight: 500, padding: "8px", borderTop: "1px solid #e9edef" }}>
                    {b.text || (b.type === "URL" ? "Visit link" : b.type === "PHONE_NUMBER" ? "Call" : "Reply")}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.5rem", borderTop: "1px solid var(--crm-border)" }}>
          <button onClick={onClose} style={{ background: "#D64545", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button
            onClick={submit}
            disabled={submitting}
            style={{ background: submitting ? "#8fb9f0" : "var(--crm-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: "0.82rem", fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? "Sending…" : "Send to review"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddBtn({ label, onClick, disabled }: { label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? "Not available" : undefined}
      style={{
        flex: "1 1 auto", minWidth: 120,
        border: "1px dashed var(--crm-border)", borderRadius: 8, background: "#fff",
        padding: "9px 12px", fontSize: "0.78rem", fontWeight: 600,
        color: disabled ? "var(--crm-text-3, #b6bec4)" : "var(--crm-text-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}
