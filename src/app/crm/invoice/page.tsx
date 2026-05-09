"use client";
import { useState } from "react";
import { useDB } from "@/lib/crm-store";
import { generateInvoicePdf } from "@/lib/crm-invoice-pdf";
import type { InvoiceData } from "@/lib/crm-invoice-pdf";
import { Plus, Trash2, Download, UserPlus, Upload } from "lucide-react";

const DEFAULT_TERMS = `• Service Scope: Care service is applicable for one newborn baby under the selected package.
• Care Timings: Services will be provided strictly as per the hours mentioned in the invoice/package.
• Overtime: Any service beyond the agreed hours will be charged additionally.
• Break: Caregivers are entitled to mandatory rest breaks during their shift.
• Replacement: Cradlewell may arrange a one-time replacement of the assigned caregiver, if required, to ensure continuity of care.
• Meal Provision: For Day Care – breakfast and lunch must be provided by the client. For Night Care – dinner must be provided by the client.`;

const today = new Date().toISOString().slice(0, 10);
const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const PAYMENT_TERMS = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "Custom"];

export default function InvoicePage() {
  const db = useDB();
  const [generating, setGenerating] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [taxMode, setTaxMode] = useState<"TDS" | "TCS">("TDS");
  const [adjustmentLabel, setAdjustmentLabel] = useState("");

  const [form, setForm] = useState<InvoiceData>({
    invoiceNumber: "INV-000041",
    invoiceDate: today,
    paymentTerms: "Due on Receipt",
    dueDate: defaultDue,
    placeOfSupply: "Karnataka (29)",
    customerName: "",
    billLine1: "", billLine2: "", billCity: "Bengaluru", billState: "Karnataka",
    billPincode: "", billCountry: "India", billPhone: "",
    sameAsShipping: true,
    shipLine1: "", shipLine2: "", shipCity: "", shipState: "", shipPincode: "",
    items: [{ description: "Newborn Care Service – 30 Days Package", qty: 1, rate: 40000, cgst: 9, sgst: 9 }],
    discountType: "fixed",
    discountValue: 0,
    tds: 0,
    adjustment: 0,
    paymentStatus: "unpaid",
    amountPaid: 0,
    paymentDate: "",
    paymentMode: "Bank Transfer",
    paymentRef: "",
    terms: DEFAULT_TERMS,
  });

  const set = <K extends keyof InvoiceData>(k: K, v: InvoiceData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const setItem = (i: number, k: string, v: string | number) =>
    setForm(f => {
      const items = [...f.items];
      const numericFields = ["qty", "rate", "cgst", "sgst"];
      items[i] = { ...items[i], [k]: numericFields.includes(k) ? Number(v) : v };
      return { ...f, items };
    });

  const addItem = () =>
    setForm(f => ({ ...f, items: [...f.items, { description: "", qty: 1, rate: 0, cgst: 9, sgst: 9 }] }));

  const removeItem = (i: number) =>
    setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const autoFillFromLead = (id: string) => {
    setSelectedLeadId(id);
    const lead = db.leads.find(l => l.id === id);
    if (!lead) return;
    setIsNewCustomer(false);
    setForm(f => ({
      ...f,
      customerName: lead.name,
      billPhone: lead.phone,
      billLine1: lead.address ?? "",
      billCity: lead.city ?? "Bengaluru",
      items: lead.serviceRequired
        ? [{ description: `${lead.serviceRequired} – ${lead.serviceDays ?? 30} Days Package`, qty: 1, rate: lead.budget ?? 40000, cgst: 9, sgst: 9 }]
        : f.items,
    }));
  };

  const subtotal = form.items.reduce((s, it) => s + it.qty * it.rate, 0);
  const totalCGST = form.items.reduce((s, it) => s + it.qty * it.rate * it.cgst / 100, 0);
  const totalSGST = form.items.reduce((s, it) => s + it.qty * it.rate * it.sgst / 100, 0);
  const discountAmt = form.discountType === "percent" ? subtotal * form.discountValue / 100 : form.discountValue;
  const grandTotal = Math.max(0, subtotal + totalCGST + totalSGST - discountAmt - form.tds + form.adjustment);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      await generateInvoicePdf(form);
    } finally {
      setGenerating(false);
    }
  };

  const Section = ({ title }: { title: string }) => (
    <p className="crm-section-title" style={{ marginTop: "1.5rem", marginBottom: "0.75rem" }}>{title}</p>
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Invoice Generator</h1>
          <p className="crm-page-subtitle">Generate GST-compliant tax invoices as PDF</p>
        </div>
        <button className="crm-btn crm-btn-primary" onClick={handleDownload} disabled={generating || !form.customerName.trim()}>
          <Download size={16} /> {generating ? "Generating…" : "Save & Download PDF"}
        </button>
      </div>

      <div className="crm-card" style={{ padding: "1.5rem" }}>

        {/* ── Customer Name ─────────────────────────────────────── */}
        <Section title="Customer" />
        <div className="crm-form-group">
          <label className="crm-label required">Customer Name</label>
          {!isNewCustomer ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <select
                className="crm-select"
                style={{ maxWidth: 320 }}
                value={selectedLeadId}
                onChange={e => autoFillFromLead(e.target.value)}
              >
                <option value="">Select an existing lead…</option>
                {db.leads.map(l => (
                  <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>
                ))}
              </select>
              <button
                type="button"
                className="crm-btn crm-btn-secondary crm-btn-sm"
                onClick={() => { setIsNewCustomer(true); setSelectedLeadId(""); set("customerName", ""); }}
              >
                <UserPlus size={14} /> Add New Customer
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <input
                className="crm-input"
                style={{ maxWidth: 320 }}
                placeholder="Customer full name"
                value={form.customerName}
                onChange={e => set("customerName", e.target.value)}
              />
              <button
                type="button"
                className="crm-btn crm-btn-ghost crm-btn-sm"
                onClick={() => setIsNewCustomer(false)}
              >
                Use existing lead instead
              </button>
            </div>
          )}
        </div>

        {/* ── Billing Address ───────────────────────────────────── */}
        <Section title="Billing Address" />
        <div className="crm-grid-2">
          <div className="crm-form-group">
            <label className="crm-label">Phone</label>
            <input className="crm-input" type="tel" value={form.billPhone} onChange={e => set("billPhone", e.target.value)} />
          </div>
          <div className="crm-form-group" style={{ gridColumn: "1/-1" }}>
            <label className="crm-label">Address Line 1</label>
            <input className="crm-input" value={form.billLine1} onChange={e => set("billLine1", e.target.value)} />
          </div>
          <div className="crm-form-group" style={{ gridColumn: "1/-1" }}>
            <label className="crm-label">Address Line 2</label>
            <input className="crm-input" value={form.billLine2 ?? ""} onChange={e => set("billLine2", e.target.value)} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label">City</label>
            <input className="crm-input" value={form.billCity} onChange={e => set("billCity", e.target.value)} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label">State</label>
            <input className="crm-input" value={form.billState} onChange={e => set("billState", e.target.value)} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label">Pincode</label>
            <input className="crm-input" value={form.billPincode} onChange={e => set("billPincode", e.target.value)} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label">Country</label>
            <input className="crm-input" value={form.billCountry ?? "India"} onChange={e => set("billCountry", e.target.value)} />
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 mt-2 mb-1">
          <input type="checkbox" id="sameShip" checked={form.sameAsShipping} onChange={e => set("sameAsShipping", e.target.checked)} style={{ cursor: "pointer" }} />
          <label htmlFor="sameShip" className="crm-label mb-0" style={{ cursor: "pointer" }}>Shipping address same as billing</label>
        </div>

        {!form.sameAsShipping && (
          <>
            <Section title="Shipping Address" />
            <div className="crm-grid-2">
              {(["shipLine1", "shipLine2", "shipCity", "shipState", "shipPincode"] as const).map(f => (
                <div key={f} className="crm-form-group">
                  <label className="crm-label">{f.replace(/^ship/, "").replace(/([A-Z])/g, " $1").trim()}</label>
                  <input className="crm-input" value={(form[f] as string) ?? ""} onChange={e => set(f, e.target.value as never)} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Invoice Details ───────────────────────────────────── */}
        <Section title="Invoice Details" />
        <div className="crm-grid-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="crm-form-group">
            <label className="crm-label">Invoice Number</label>
            <input className="crm-input" value={form.invoiceNumber} onChange={e => set("invoiceNumber", e.target.value)} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label">Invoice Date</label>
            <input className="crm-input" type="date" value={form.invoiceDate} onChange={e => set("invoiceDate", e.target.value)} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label">Payment Terms</label>
            <select className="crm-select" value={form.paymentTerms} onChange={e => set("paymentTerms", e.target.value)}>
              {PAYMENT_TERMS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="crm-form-group">
            <label className="crm-label">Due Date</label>
            <input className="crm-input" type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label">Place of Supply</label>
            <input className="crm-input" value={form.placeOfSupply} onChange={e => set("placeOfSupply", e.target.value)} />
          </div>
        </div>

        {/* ── Service Items ─────────────────────────────────────── */}
        <Section title="Service Items" />
        <div style={{ overflowX: "auto" }}>
          <table className="crm-table" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 240 }}>Description</th>
                <th style={{ width: 64 }}>Qty</th>
                <th style={{ width: 100 }}>Rate (₹)</th>
                <th style={{ width: 72 }}>CGST %</th>
                <th style={{ width: 72 }}>SGST %</th>
                <th style={{ width: 100 }}>Amount</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, i) => {
                const amt = item.qty * item.rate * (1 + item.cgst / 100 + item.sgst / 100);
                return (
                  <tr key={i} style={{ cursor: "default" }}>
                    <td><input className="crm-input" value={item.description} onChange={e => setItem(i, "description", e.target.value)} placeholder="Item description" /></td>
                    <td><input className="crm-input" type="number" min={0} value={item.qty} onChange={e => setItem(i, "qty", e.target.value)} style={{ width: 55 }} /></td>
                    <td><input className="crm-input" type="number" min={0} value={item.rate} onChange={e => setItem(i, "rate", e.target.value)} style={{ width: 90 }} /></td>
                    <td><input className="crm-input" type="number" min={0} value={item.cgst} onChange={e => setItem(i, "cgst", e.target.value)} style={{ width: 60 }} /></td>
                    <td><input className="crm-input" type="number" min={0} value={item.sgst} onChange={e => setItem(i, "sgst", e.target.value)} style={{ width: 60 }} /></td>
                    <td style={{ fontWeight: 600, color: "var(--crm-primary)", whiteSpace: "nowrap" }}>₹{amt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td>
                      {form.items.length > 1 && (
                        <button className="crm-btn crm-btn-ghost crm-btn-icon crm-btn-sm" onClick={() => removeItem(i)} style={{ color: "var(--crm-danger, #DC2626)" }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className="crm-btn crm-btn-secondary crm-btn-sm mt-2" onClick={addItem}>
          <Plus size={14} /> Add Item
        </button>

        {/* ── Totals ────────────────────────────────────────────── */}
        <Section title="Totals & Adjustments" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Left: controls */}
          <div className="crm-grid-2">
            {/* Discount */}
            <div className="crm-form-group" style={{ gridColumn: "1/-1" }}>
              <label className="crm-label">Discount</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  className="crm-input"
                  type="number"
                  min={0}
                  value={form.discountValue}
                  onChange={e => set("discountValue", Number(e.target.value))}
                  style={{ width: 100 }}
                />
                <select
                  className="crm-select"
                  style={{ width: 80 }}
                  value={form.discountType === "percent" ? "%" : "₹"}
                  onChange={e => set("discountType", e.target.value === "%" ? "percent" : "fixed")}
                >
                  <option value="%">%</option>
                  <option value="₹">₹</option>
                </select>
                {discountAmt > 0 && (
                  <span style={{ fontSize: "0.8rem", color: "var(--crm-success, #22C55E)", fontWeight: 600 }}>
                    − ₹{discountAmt.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            </div>

            {/* TDS / TCS */}
            <div className="crm-form-group" style={{ gridColumn: "1/-1" }}>
              <label className="crm-label">
                <span style={{ display: "inline-flex", gap: 16, alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 500, cursor: "pointer" }}>
                    <input type="radio" checked={taxMode === "TDS"} onChange={() => setTaxMode("TDS")} /> TDS
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 500, cursor: "pointer" }}>
                    <input type="radio" checked={taxMode === "TCS"} onChange={() => setTaxMode("TCS")} /> TCS
                  </label>
                </span>
              </label>
              <input
                className="crm-input"
                type="number"
                min={0}
                value={form.tds}
                onChange={e => set("tds", Number(e.target.value))}
                style={{ width: 140 }}
                placeholder={`${taxMode} amount (₹)`}
              />
            </div>

            {/* Adjustment */}
            <div className="crm-form-group" style={{ gridColumn: "1/-1" }}>
              <label className="crm-label">Adjustment</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="crm-input"
                  placeholder="Label (e.g. Rounding)"
                  value={adjustmentLabel}
                  onChange={e => setAdjustmentLabel(e.target.value)}
                  style={{ maxWidth: 180 }}
                />
                <input
                  className="crm-input"
                  type="number"
                  value={form.adjustment}
                  onChange={e => set("adjustment", Number(e.target.value))}
                  style={{ width: 120 }}
                  placeholder="Amount (₹)"
                />
              </div>
            </div>
          </div>

          {/* Right: live totals */}
          <div className="crm-card" style={{ padding: "1rem 1.25rem", background: "var(--crm-bg)" }}>
            {[
              { label: "Subtotal", value: subtotal, color: "var(--crm-text)" },
              { label: "CGST", value: totalCGST, color: "var(--crm-text-muted)" },
              { label: "SGST", value: totalSGST, color: "var(--crm-text-muted)" },
              ...(discountAmt > 0 ? [{ label: "Discount", value: -discountAmt, color: "var(--crm-success, #22C55E)" }] : []),
              ...(form.tds > 0 ? [{ label: taxMode, value: -form.tds, color: "var(--crm-text-muted)" }] : []),
              ...(form.adjustment !== 0 ? [{ label: adjustmentLabel || "Adjustment", value: form.adjustment, color: "var(--crm-text-muted)" }] : []),
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: row.color, marginBottom: 5 }}>
                <span>{row.label}</span>
                <span style={{ fontWeight: 500 }}>₹{Math.abs(row.value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
            <div style={{ height: 1, background: "var(--crm-border)", margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem", fontWeight: 800, color: "var(--crm-primary)" }}>
              <span>Total (₹)</span>
              <span>₹{grandTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* ── Payment Details ───────────────────────────────────── */}
        <Section title="Payment Details" />
        <div className="crm-grid-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          <div className="crm-form-group">
            <label className="crm-label">Payment Status</label>
            <select
              className="crm-select"
              value={form.paymentStatus}
              onChange={e => {
                const s = e.target.value as InvoiceData["paymentStatus"];
                set("paymentStatus", s);
                if (s === "paid") set("amountPaid", grandTotal);
                if (s === "unpaid") set("amountPaid", 0);
              }}
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partially Paid</option>
              <option value="paid">Paid in Full</option>
            </select>
          </div>
          {form.paymentStatus !== "unpaid" && (
            <>
              <div className="crm-form-group">
                <label className="crm-label">Amount Paid (₹)</label>
                <input
                  className="crm-input"
                  type="number"
                  min={0}
                  value={form.paymentStatus === "paid" ? grandTotal : form.amountPaid}
                  disabled={form.paymentStatus === "paid"}
                  onChange={e => set("amountPaid", Number(e.target.value))}
                />
              </div>
              <div className="crm-form-group">
                <label className="crm-label">Payment Date</label>
                <input className="crm-input" type="date" value={form.paymentDate ?? ""} onChange={e => set("paymentDate", e.target.value)} />
              </div>
              <div className="crm-form-group">
                <label className="crm-label">Payment Mode</label>
                <select className="crm-select" value={form.paymentMode ?? ""} onChange={e => set("paymentMode", e.target.value)}>
                  {["UPI", "Bank Transfer", "Cash", "Card", "Cheque"].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="crm-form-group">
                <label className="crm-label">Reference / UTR</label>
                <input className="crm-input" value={form.paymentRef ?? ""} onChange={e => set("paymentRef", e.target.value)} placeholder="UTR or transaction ID" />
              </div>
            </>
          )}
        </div>

        {/* ── Terms & Conditions ────────────────────────────────── */}
        <Section title="Terms & Conditions" />
        <div className="crm-form-group">
          <textarea className="crm-textarea" value={form.terms} onChange={e => set("terms", e.target.value)} style={{ minHeight: 130, fontSize: "0.8rem" }} />
        </div>

        {/* ── Attach Files ──────────────────────────────────────── */}
        <Section title="Attach Files" />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="crm-btn crm-btn-ghost crm-btn-sm" disabled>
            <Upload size={14} /> Upload File
          </button>
          <span style={{ fontSize: "0.75rem", color: "var(--crm-text-muted)" }}>Max 10 files, 10 MB each</span>
        </div>

        {/* ── Footer action ─────────────────────────────────────── */}
        <div className="d-flex justify-content-end mt-4">
          <button
            className="crm-btn crm-btn-primary"
            onClick={handleDownload}
            disabled={generating || !form.customerName.trim()}
            style={{ fontSize: "0.95rem", padding: "0.625rem 1.5rem" }}
          >
            <Download size={18} /> {generating ? "Generating PDF…" : "Save & Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
