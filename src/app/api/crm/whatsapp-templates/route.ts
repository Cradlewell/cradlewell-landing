import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const WABA_ID      = process.env.WHATSAPP_WABA_ID ?? process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const GRAPH        = "https://graph.facebook.com/v21.0";

// ── Meta template shapes ─────────────────────────────────────────────────────
type MetaButton = {
  type: string;
  text?: string;
  url?: string;
  phone_number?: string;
};
type MetaComponent = {
  type: string;      // HEADER | BODY | FOOTER | BUTTONS
  format?: string;   // TEXT | IMAGE | VIDEO | DOCUMENT | LOCATION
  text?: string;
  buttons?: MetaButton[];
};
type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: MetaComponent[];
};

// The management table needs a flat, friendly shape for every template (any status).
function toRow(t: MetaTemplate) {
  const comps = t.components ?? [];
  const header = comps.find(c => c.type === "HEADER");
  const body   = comps.find(c => c.type === "BODY");
  const footer = comps.find(c => c.type === "FOOTER");
  const buttons = comps.find(c => c.type === "BUTTONS");
  const bodyText = body?.text ?? "";
  const varCount = (bodyText.match(/\{\{\s*\d+\s*\}\}/g) ?? []).length;
  return {
    id: t.id,
    name: t.name,
    language: t.language,
    status: t.status,
    category: t.category,
    // "Title" in the reference UI = the header text (falls back to a friendly dash).
    title: header?.format === "TEXT" ? (header.text ?? "") : (header?.format ? `[${header.format}]` : ""),
    headerFormat: header?.format ?? "NONE",
    headerText: header?.format === "TEXT" ? (header.text ?? "") : "",
    bodyText,
    footerText: footer?.text ?? "",
    buttons: (buttons?.buttons ?? []).map(b => ({
      type: b.type,
      text: b.text ?? "",
      url: b.url ?? "",
      phone_number: b.phone_number ?? "",
    })),
    varCount,
  };
}

// ── GET: list every template on the WABA (all statuses) ──────────────────────
export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  if (!WABA_ID) {
    return NextResponse.json({ templates: [], error: "WHATSAPP_WABA_ID is not configured" });
  }

  const res = await fetch(
    `${GRAPH}/${WABA_ID}/message_templates?limit=250&fields=id,name,language,status,category,components`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[whatsapp-templates GET] Meta API error", detail);
    return NextResponse.json({ templates: [], error: "Failed to load templates from Meta" }, { status: 502 });
  }
  const json = await res.json();
  const rows: MetaTemplate[] = Array.isArray(json.data) ? json.data : [];
  return NextResponse.json({ templates: rows.map(toRow) });
}

// ── POST: create a template (submit to Meta for review) ──────────────────────
type ButtonInput = { type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY"; text: string; url?: string; phone_number?: string };

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  if (!WABA_ID) {
    return NextResponse.json({ error: "WHATSAPP_WABA_ID is not configured" }, { status: 400 });
  }

  const body = await req.json();
  const rawName: string = (body.name ?? "").toString();
  const name = rawName.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  const category: string = (body.category ?? "MARKETING").toString().toUpperCase();
  const language: string = (body.language ?? "en").toString();
  const headerFormat: string = (body.headerFormat ?? "NONE").toString().toUpperCase();
  const headerText: string = (body.headerText ?? "").toString();
  const bodyText: string = (body.bodyText ?? "").toString();
  const footerText: string = (body.footerText ?? "").toString();
  const buttons: ButtonInput[] = Array.isArray(body.buttons) ? body.buttons : [];

  if (!name)     return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  if (!bodyText.trim()) return NextResponse.json({ error: "Template body is required" }, { status: 400 });

  const components: MetaComponent[] & Record<string, unknown>[] = [];

  // Header
  if (headerFormat === "TEXT" && headerText.trim()) {
    components.push({ type: "HEADER", format: "TEXT", text: headerText.trim() });
  } else if (["IMAGE", "VIDEO", "DOCUMENT", "LOCATION"].includes(headerFormat)) {
    components.push({ type: "HEADER", format: headerFormat });
  }

  // Body — Meta requires an example set when the body has {{n}} variables.
  const varMatches = bodyText.match(/\{\{\s*\d+\s*\}\}/g) ?? [];
  const bodyComponent: Record<string, unknown> = { type: "BODY", text: bodyText };
  if (varMatches.length > 0) {
    const examples = Array.isArray(body.bodyExamples) && body.bodyExamples.length === varMatches.length
      ? body.bodyExamples.map((v: unknown) => String(v ?? "").trim() || "sample")
      : varMatches.map((_, i) => `sample${i + 1}`);
    bodyComponent.example = { body_text: [examples] };
  }
  components.push(bodyComponent as MetaComponent);

  // Footer
  if (footerText.trim()) {
    components.push({ type: "FOOTER", text: footerText.trim() });
  }

  // Buttons
  if (buttons.length > 0) {
    const metaButtons = buttons
      .filter(b => (b.text ?? "").trim())
      .map(b => {
        if (b.type === "URL")          return { type: "URL", text: b.text.trim(), url: (b.url ?? "").trim() };
        if (b.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: b.text.trim(), phone_number: (b.phone_number ?? "").trim() };
        return { type: "QUICK_REPLY", text: b.text.trim() };
      });
    if (metaButtons.length) components.push({ type: "BUTTONS", buttons: metaButtons } as MetaComponent);
  }

  const res = await fetch(`${GRAPH}/${WABA_ID}/message_templates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, category, language, components }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.error_user_msg || json?.error?.message || "Failed to create template";
    console.error("[whatsapp-templates POST] Meta API error", JSON.stringify(json?.error ?? json));
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: json.id, status: json.status ?? "PENDING", name });
}

// ── DELETE: remove a template by name ────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  if (!WABA_ID) {
    return NextResponse.json({ error: "WHATSAPP_WABA_ID is not configured" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Template name is required" }, { status: 400 });

  const res = await fetch(`${GRAPH}/${WABA_ID}/message_templates?name=${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.error_user_msg || json?.error?.message || "Failed to delete template";
    console.error("[whatsapp-templates DELETE] Meta API error", JSON.stringify(json?.error ?? json));
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
