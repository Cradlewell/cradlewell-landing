"use client";
import { useState } from "react";
import { useDB } from "@/lib/crm-store";
import { generateInvoicePdf } from "@/lib/crm-invoice-pdf";
import type { InvoiceData } from "@/lib/crm-invoice-pdf";
import { Plus, Trash2, Download } from "lucide-react";

const DEFAULT_TERMS = `• Service Scope: Care service is applicable for one newborn baby under the selected package.
• Care Timings: Services will be provided strictly as per the hours mentioned in the invoice/package.
• Overtime: Any service beyond the agreed hours will be charged additionally.
• Break: Caregivers are entitled to mandatory rest breaks during their shift.
• Replacement: Cradlewell may arrange a one-time replacement of the assigned caregiver, if required.
• Meal Provision: For Day Care — breakfast and lunch must be provided by the client. For Night Care — dinner must be provided.`;

const today = new Date().toISOString().slice(0, 10);
const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

export default function InvoicePage() {
  const db = useDB();
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState<InvoiceData>({
    invoiceNumber: "INV-000041",
    invoiceDate: today,
    paymentTerms: "Net 7",
    dueDate: dueDate,
    placeOfSupply: "Karnataka",
    customerName: "",
    billLine1: "", billLine2: "", billCity: "Bengaluru", billState: "Karnataka", billPincode: "", billCountry: "India", billPhone: "",
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

  const subtotal = form.items.reduce((s, it) => s + it.qty * it.rate, 0);
  const totalCGST = form.items.reduce((s, it) => s + it.qty * it.rate * it.cgst / 100, 0);
  const totalSGST = form.items.reduce((s, it) => s + it.qty * it.rate * it.sgst / 100, 0);
  const discount = form.discountType === "percent" ? subtotal * form.discountValue / 100 : form.discountValue;
  const grandTotal = subtotal + totalCGST + totalSGST - discount - form.tds + form.adjustment;

  const autoFillFromLead = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lead = db.leads.find(l => l.id === e.target.value);
    if (!lead) return;
    setForm(f => ({
      ...f,
      customerName: lead.name,
      billPhone: lead.phone,
      billLine1: lead.address ?? "",
      billCity: lead.city ?? "Bengaluru",
      items: lead.serviceRequired ? [{ description: `${lead.serviceRequired} – ${lead.serviceDays ?? 30} Days Package`, qty: 1, rate: lead.budget ?? 40000, cgst: 9, sgst: 9 }] : f.items,
    }));
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      await generateInvoicePdf(form);
    } finally {
      setGenerating(false);
    }
  };

  const Section = ({ title }: { title: string }) => (
    <p className="crm-section-title" style={{ marginTop: "1.25rem" }}>{title}</p>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="crm-page-header">
        <div>
          <h1 className="crm-page-title">Invoice Generator</h1>
          <p className="crm-page-subtitle">Generate GST-compliant tax invoices as PDF</p>
        </div>
        <button className="crm-btn crm-btn-primary" onClick={handleDownload} disabled={generating}>
          <Download size={16} /> {generating ? "Generating…" : "Save & Download PDF"}
        </button>
      </div>

      <div className="crm-card" style={{ padding: "1.5rem" }}>
        {/* Auto-fill from lead */}
        <div className="crm-form-group mb-3">
          <label className="crm-label">Auto-fill from existing lead (optional)</label>
          <select className="crm-select" defaultValue="" onChange={autoFillFromLead} style={{ maxWidth: 300 }}>
            <option value="">Select a lead…</option>
            {db.leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.id})</option>)}
          </select>
        </div>

        <div className="crm-divider" />

        <Section title="Invoice Details" />
        <div className="crm-grid-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { label: "Invoice Number", field: "invoiceNumber" as const },
            { label: "Invoice Date", field: "invoiceDate" as const, type: "date" },
            { label: "Payment Terms", field: "paymentTerms" as const },
            { label: "Due Date", field: "dueDate" as const, type: "date" },
            { label: "Place of Supply", field: "placeOfSupply" as const },
          ].map(({ label, field, type = "text" }) => (
            <div key={field} className="crm-form-group">
              <label className="crm-label">{label}</label>
              <input className="crm-input" type={type} value={form[field] as string} onChange={e => set(field, e.target.value)} />
            </div>
          ))}
        </div>

        <Section title="Customer & Billing Address" />
        <div className="crm-grid-2">
          <div className="crm-form-group">
            <label className="crm-label required">Customer Name</label>
            <input className="crm-input" value={form.customerName} onChange={e => set("customerName", e.target.value)} />
          </div>
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
        </div>

        <div className="d-flex align-items-center gap-2 mt-2 mb-1">
          <input type="checkbox" id="sameShip" checked={form.sameAsShipping} onChange={e => set("sameAsShipping", e.target.checked)} style={{ cursor: "pointer" }} />
          <label htmlFor="sameShip" className="crm-label mb-0" style={{ cursor: "pointer" }}>Shipping same as billing</label>
        </div>

        {!form.sameAsShipping && (
          <div className="crm-grid-2">
            {["shipLine1", "shipLine2", "shipCity", "shipState", "shipPincode"].map(f => (
              <div key={f} className="crm-form-group">
                <label className="crm-label">{f.replace("ship", "Ship ").replace(/([A-Z])/g, " $1").trim()}</label>
                <input className="crm-input" value={(form[f as keyof InvoiceData] as string) ?? ""} onChange={e => set(f as keyof InvoiceData, e.target.value as never)} />
              </div>
            ))}
          </div>
        )}

        <Section title="Service Items" />
        <div style={{ overflowX: "auto" }}>
          <table className="crm-table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Description</th>
                <th style={{ width: 60 }}>Qty</th>
                <th style={{ width: 90 }}>Rate (₹)</th>
                <th style={{ width: 60 }}>CGST %</th>
                <th style={{ width: 60 }}>SGST %</th>
                <th style={{ width: 90 }}>Amount</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, i) => {
                const amt = item.qty * item.rate * (1 + item.cgst / 100 + item.sgst / 100);
                return (
                  <tr key={i} style={{ cursor: "default" }}>
                    <td><input className="crm-input" value={item.description} onChange={e => setItem(i, "description", e.target.value)} /></td>
                    <td><input className="crm-input" type="number" value={item.qty} onChange={e => setItem(i, "qty", e.target.value)} style={{ width: 55 }} /></td>
                    <td><input className="crm-input" type="number" value={item.rate} onChange={e => setItem(i, "rate", e.target.value)} style={{ width: 85 }} /></td>
                    <td><input className="crm-input" type="number" value={item.cgst} onChange={e => setItem(i, "cgst", e.target.value)} style={{ width: 55 }} /></td>
                    <td><input className="crm-input" type="number" value={item.sgst} onChange={e => setItem(i, "sgst", e.target.value)} style={{ width: 55 }} /></td>
                    <td style={{ fontWeight: 600, color: "var(--crm-primary)" }}>₹{amt.toFixed(0)}</td>
                    <td>
                      {form.items.length > 1 && (
                        <button className="crm-btn crm-btn-danger crm-btn-icon crm-btn-sm" onClick={() => removeItem(i)}><Trash2 size={14} /></button>
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

        <Section title="Totals & Discounts" />
        <div className="crm-grid-2">
          <div className="crm-form-group">
            <label className="crm-label">Discount Type</label>
            <select className="crm-select" value={form.discountType} onChange={e => set("discountType", e.target.value as "percent"|"fixed")}>
              <option value="fixed">Fixed (₹)</option>
              <option value="percent">Percentage (%)</option>
            </select>
          </div>
          <div className="crm-form-group">
            <label className="crm-label">Discount Value</label>
            <input className="crm-input" type="number" value={form.discountValue} onChange={e => set("discountValue", Number(e.target.value))} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label">TDS / TCS (₹)</label>
            <input className="crm-input" type="number" value={form.tds} onChange={e => set("tds", Number(e.target.value))} />
          </div>
          <div className="crm-form-group">
            <label className="crm-label">Adjustment (₹)</label>
            <input className="crm-input" type="number" value={form.adjustment} onChange={e => set("adjustment", Number(e.target.value))} />
          </div>
        </div>

        {/* Live totals */}
        <div className="crm-card" style={{ marginTop: "1rem", padding: "1rem", background: "var(--crm-bg)", maxWidth: 300, marginLeft: "auto" }}>
          {[
            { label: "Subtotal", value: subtotal },
            { label: "CGST", value: totalCGST },
            { label: "SGST", value: totalSGST },
            ...(discount > 0 ? [{ label: "Discount", value: -discount }] : []),
            ...(form.tds > 0 ? [{ label: "TDS/TCS", value: -form.tds }] : []),
            ...(form.adjustment !== 0 ? [{ label: "Adjustment", value: form.adjustment }] : []),
          ].map(row => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--crm-text-muted)", marginBottom: 4 }}>
              <span>{row.label}</span>
              <span>₹{Math.abs(row.value).toFixed(0)}</span>
            </div>
          ))}
          <div style={{ height: 1, background: "var(--crm-border)", margin: "6px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem", fontWeight: 800, color: "var(--crm-primary)" }}>
            <span>Total</span>
            <span>₹{grandTotal.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <Section title="Payment Details" />
        <div className="crm-grid-2">
          <div className="crm-form-group">
            <label className="crm-label">Payment Status</label>
            <select className="crm-select" value={form.paymentStatus} onChange={e => set("paymentStatus", e.target.value as InvoiceData["paymentStatus"])}>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          {form.paymentStatus !== "unpaid" && (
            <>
              <div className="crm-form-group">
                <label className="crm-label">Amount Paid (₹)</label>
                <input className="crm-input" type="number" value={form.amountPaid} onChange={e => set("amountPaid", Number(e.target.value))} />
              </div>
              <div className="crm-form-group">
                <label className="crm-label">Payment Date</label>
                <input className="crm-input" type="date" value={form.paymentDate ?? ""} onChange={e => set("paymentDate", e.target.value)} />
              </div>
              <div className="crm-form-group">
                <label className="crm-label">Payment Mode</label>
                <select className="crm-select" value={form.paymentMode ?? ""} onChange={e => set("paymentMode", e.target.value)}>
                  <option>Bank Transfer</option><option>UPI</option><option>Cash</option><option>Card</option><option>Cheque</option>
                </select>
              </div>
              <div className="crm-form-group">
                <label className="crm-label">Reference / UTR</label>
                <input className="crm-input" value={form.paymentRef ?? ""} onChange={e => set("paymentRef", e.target.value)} placeholder="UTR or transaction ID" />
              </div>
            </>
          )}
        </div>

        <Section title="Terms & Conditions" />
        <div className="crm-form-group">
          <textarea className="crm-textarea" value={form.terms} onChange={e => set("terms", e.target.value)} style={{ minHeight: 120, fontSize: "0.8rem" }} />
        </div>

        <div className="d-flex justify-content-end mt-4">
          <button className="crm-btn crm-btn-primary" onClick={handleDownload} disabled={generating} style={{ fontSize: "0.95rem", padding: "0.625rem 1.5rem" }}>
            <Download size={18} /> {generating ? "Generating PDF…" : "Save & Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
