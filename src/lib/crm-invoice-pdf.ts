// jsPDF 4.x GST Tax Invoice generator for Cradlewell

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  paymentTerms: string;
  dueDate: string;
  placeOfSupply: string;
  customerName: string;
  billLine1: string;
  billLine2?: string;
  billCity: string;
  billState: string;
  billPincode: string;
  billCountry?: string;
  billPhone: string;
  sameAsShipping: boolean;
  shipLine1?: string;
  shipLine2?: string;
  shipCity?: string;
  shipState?: string;
  shipPincode?: string;
  items: { description: string; qty: number; rate: number; cgst: number; sgst: number }[];
  discountType: "percent" | "fixed";
  discountValue: number;
  tds: number;
  adjustment: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  amountPaid: number;
  paymentDate?: string;
  paymentMode?: string;
  paymentRef?: string;
  terms: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const hex = (r: number, g: number, b: number) =>
  `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
const gray = (v: number) => hex(v, v, v);

function amountInWords(amount: number): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function convert(n: number): string {
    if (n === 0) return "";
    if (n < 20) return units[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + " " + convert(n % 10);
    if (n < 1000) return units[Math.floor(n / 100)] + " Hundred " + convert(n % 100);
    if (n < 100000) return convert(Math.floor(n / 1000)) + "Thousand " + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000)) + "Lakh " + convert(n % 100000);
    return convert(Math.floor(n / 10000000)) + "Crore " + convert(n % 10000000);
  }
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = convert(rupees).trim() + " Rupees";
  if (paise > 0) words += " and " + convert(paise).trim() + " Paise";
  return words + " Only";
}

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const url = (typeof window !== "undefined" ? window.location.origin : "") + "/images/cw_logo.png";
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    // fallback: load via Image element + canvas
    try {
      return await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext("2d")!.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null);
        img.src = "/images/cw_logo.png";
      });
    } catch {
      return null;
    }
  }
}

export async function generateInvoicePdf(data: InvoiceData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297;
  const L = 14, R = W - 14;

  // ─── Header background ───────────────────────────────────────────────────
  // Soft purple-tinted banner spanning full width
  doc.setFillColor("#F5F3FF");
  doc.rect(0, 0, W, 38, "F");

  // Accent left strip
  doc.setFillColor("#6366F1");
  doc.rect(0, 0, 4, 38, "F");

  // ─── Logo ────────────────────────────────────────────────────────────────
  const logoSize = 26;
  const logoX = L + 2;
  const logoY = 6;
  const logoBase64 = await fetchLogoBase64();
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", logoX, logoY, logoSize, logoSize); } catch { /* skip logo if unsupported */ }
  }
  const textX = logoX + logoSize + 4;

  // ─── Brand name ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#4F46E5");
  doc.text("Cradlewell", textX, 14);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor("#6366F1");
  doc.text("Your Comfort Is Our Care", textX, 19.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor("#6B7280");
  doc.text("TENDERKIN WELLNESS PRIVATE LIMITED", textX, 24.5);
  doc.text("Site No.26, Laskar Hosur, Adugodi, Koramangala, Bengaluru 560030  |  GSTIN: 29AALCT8756G1ZL", textX, 29.5);
  doc.text("care@cradlewell.com  |  www.cradlewell.com", textX, 34.5);

  // ─── TAX INVOICE title ───────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor("#4F46E5");
  doc.text("TAX INVOICE", R, 16, { align: "right" });

  if (data.paymentStatus === "paid" || data.paymentStatus === "partial") {
    const label = data.paymentStatus === "paid" ? "PAID" : "PARTIALLY PAID";
    const pillColor = data.paymentStatus === "paid" ? "#22C55E" : "#F59E0B";
    const pillW = data.paymentStatus === "paid" ? 16 : 30;
    doc.setFillColor(pillColor);
    doc.roundedRect(R - pillW - 2, 20, pillW, 7, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor("#FFFFFF");
    doc.text(label, R - pillW / 2 - 2, 24.5, { align: "center" });
  }

  // ─── Divider ─────────────────────────────────────────────────────────────
  let y = 42;
  doc.setDrawColor("#E5E7EB");
  doc.setLineWidth(0.3);
  doc.line(L, y, R, y);

  // ─── Meta cards ───────────────────────────────────────────────────────────
  y += 5;
  const metaItems = [
    { label: "Invoice No.", value: data.invoiceNumber },
    { label: "Date", value: data.invoiceDate },
    { label: "Terms", value: data.paymentTerms },
    { label: "Due Date", value: data.dueDate },
    { label: "Place of Supply", value: data.placeOfSupply },
  ];
  const metaW = (R - L) / metaItems.length;
  metaItems.forEach((m, i) => {
    const x = L + i * metaW;
    doc.setFillColor("#F8FAFC");
    doc.roundedRect(x + 1, y, metaW - 2, 14, 2, 2, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor("#64748B");
    doc.text(m.label.toUpperCase(), x + 4, y + 5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor("#1E293B");
    doc.text(m.value, x + 4, y + 11);
  });

  // ─── Bill To / Ship To ────────────────────────────────────────────────────
  y += 22;
  const halfW = (R - L) / 2 - 3;
  const addrBoxH = 28;

  doc.setFillColor("#F8FAFC");
  doc.roundedRect(L, y, halfW, addrBoxH, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor("#64748B");
  doc.text("BILL TO", L + 3, y + 5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor("#1E293B");
  doc.text(data.customerName, L + 3, y + 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor("#64748B");
  const billAddr = [data.billLine1, data.billLine2, `${data.billCity}, ${data.billState} ${data.billPincode}`, data.billPhone].filter(Boolean) as string[];
  billAddr.forEach((line, i) => doc.text(line, L + 3, y + 16 + i * 4));

  const sx = L + halfW + 6;
  doc.setFillColor("#F8FAFC");
  doc.roundedRect(sx, y, halfW, addrBoxH, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor("#64748B");
  doc.text("SERVICE ADDRESS", sx + 3, y + 5);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor("#1E293B");
  doc.text(data.sameAsShipping ? data.customerName : (data.shipLine1 ?? data.customerName), sx + 3, y + 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor("#64748B");
  if (data.sameAsShipping) {
    billAddr.forEach((line, i) => doc.text(line, sx + 3, y + 16 + i * 4));
  } else {
    const shipAddr = [data.shipLine1, data.shipLine2, `${data.shipCity ?? ""}, ${data.shipState ?? ""} ${data.shipPincode ?? ""}`].filter(Boolean) as string[];
    shipAddr.forEach((line, i) => doc.text(line, sx + 3, y + 16 + i * 4));
  }

  // ─── Items table ──────────────────────────────────────────────────────────
  y += addrBoxH + 8;

  // Solid indigo header for item table
  const firstCgst = data.items[0]?.cgst ?? 0;
  const firstSgst = data.items[0]?.sgst ?? 0;
  doc.setFillColor("#4F46E5");
  doc.rect(L, y, R - L, 7, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor("#FFFFFF");
  const cols = [
    { label: "#", x: L + 2 }, { label: "DESCRIPTION", x: L + 10 }, { label: "QTY", x: L + 73 },
    { label: "RATE", x: L + 88 },
    { label: `CGST(${firstCgst}%)`, x: L + 112 },
    { label: `SGST(${firstSgst}%)`, x: L + 133 },
    { label: "AMOUNT", x: L + 155 },
  ];
  cols.forEach(c => doc.text(c.label, c.x, y + 5));
  y += 8;

  let subtotal = 0, totalCGST = 0, totalSGST = 0;
  data.items.forEach((item, idx) => {
    const base = item.qty * item.rate;
    const cgstAmt = base * (item.cgst / 100);
    const sgstAmt = base * (item.sgst / 100);
    const total = base + cgstAmt + sgstAmt;
    subtotal += base; totalCGST += cgstAmt; totalSGST += sgstAmt;

    doc.setFillColor(idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC");
    doc.rect(L, y - 1, R - L, 7, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor("#1E293B");
    doc.text(String(idx + 1), L + 2, y + 4);
    doc.text(item.description.substring(0, 40), L + 10, y + 4);
    doc.text(String(item.qty), L + 73, y + 4);
    doc.text(`Rs.${item.rate.toLocaleString("en-IN")}`, L + 88, y + 4);
    doc.text(`Rs.${cgstAmt.toFixed(0)}`, L + 112, y + 4);
    doc.text(`Rs.${sgstAmt.toFixed(0)}`, L + 133, y + 4);
    doc.text(`Rs.${total.toLocaleString("en-IN")}`, L + 155, y + 4);
    y += 8;
  });

  doc.setDrawColor("#E2E8F0");
  doc.line(L, y, R, y);
  y += 4;

  // ─── Totals ───────────────────────────────────────────────────────────────
  const discountAmt = data.discountType === "percent"
    ? subtotal * (data.discountValue / 100) : data.discountValue;
  const grandTotal = subtotal + totalCGST + totalSGST - discountAmt - data.tds + data.adjustment;
  const balance = grandTotal - data.amountPaid;

  const totalsX = R - 70;
  const printRow = (label: string, value: string, bold = false, color = "#64748B", valueColor = "#1E293B") => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 9 : 8);
    doc.setTextColor(color);
    doc.text(label, totalsX, y);
    doc.setTextColor(valueColor);
    doc.text(value, R, y, { align: "right" });
    y += 5;
  };

  printRow("Subtotal", `Rs.${subtotal.toLocaleString("en-IN")}`);
  printRow(`CGST(${firstCgst}%)`, `Rs.${totalCGST.toFixed(0)}`);
  printRow(`SGST(${firstSgst}%)`, `Rs.${totalSGST.toFixed(0)}`);
  if (discountAmt > 0) printRow("Discount", `-Rs.${discountAmt.toFixed(0)}`, false, "#22C55E", "#22C55E");
  if (data.tds > 0) printRow("TDS/TCS", `-Rs.${data.tds.toFixed(0)}`);
  if (data.adjustment !== 0) printRow("Adjustment", `Rs.${data.adjustment.toFixed(0)}`);
  doc.setDrawColor("#E2E8F0"); doc.line(totalsX, y, R, y); y += 3;
  printRow("TOTAL", `Rs.${grandTotal.toLocaleString("en-IN")}`, true, "#4F46E5", "#4F46E5");
  if (data.paymentStatus !== "unpaid") {
    printRow("Amount Paid", `Rs.${data.amountPaid.toLocaleString("en-IN")}`, false, "#22C55E", "#22C55E");
    if (balance > 0) printRow("Balance Due", `Rs.${balance.toLocaleString("en-IN")}`, true, "#EF4444", "#EF4444");
  }

  // ─── Amount in words ──────────────────────────────────────────────────────
  y += 4;
  doc.setFillColor("#F8FAFC");
  doc.roundedRect(L, y, 100, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor("#64748B");
  doc.text("AMOUNT IN WORDS", L + 3, y + 4.5);
  doc.setFont("helvetica", "italic"); doc.setFontSize(7.5); doc.setTextColor("#1E293B");
  doc.text(amountInWords(grandTotal).substring(0, 65), L + 3, y + 9.5);
  y += 18;

  // ─── Terms ────────────────────────────────────────────────────────────────
  if (y < H - 50) {
    doc.setFillColor("#F8FAFC");
    doc.roundedRect(L, y, R - L, 28, 2, 2, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor("#64748B");
    doc.text("TERMS & CONDITIONS", L + 3, y + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor("#64748B");
    const termLines = data.terms.split("\n").slice(0, 6);
    termLines.forEach((line, i) => doc.text(line.substring(0, 90), L + 3, y + 10 + i * 3.2));
  }

  // ─── Footer ───────────────────────────────────────────────────────────────
  doc.setFillColor("#F5F3FF");
  doc.rect(0, H - 22, W, 22, "F");
  doc.setFillColor("#4F46E5");
  doc.rect(0, H - 22, 4, 22, "F");
  doc.setDrawColor("#E5E7EB");
  doc.setLineWidth(0.3);
  doc.line(L, H - 22, R, H - 22);
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(gray(120));
  doc.text("This is a computer-generated invoice. No signature required.", L + 2, H - 12);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor("#4F46E5");
  doc.text("Cradlewell — Your comfort is our care", R, H - 12, { align: "right" });

  doc.save(`${data.invoiceNumber}-Cradlewell.pdf`);
}
