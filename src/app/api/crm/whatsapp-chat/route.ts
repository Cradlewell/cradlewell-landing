import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN!;
const WABA_ID         = process.env.WHATSAPP_WABA_ID ?? process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const WINDOW_MS       = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const { action, phone, message, templateName, language, variables, preview } = await req.json();

  if (action === "takeover") {
    const { error } = await supabase
      .from("whatsapp_sessions")
      .update({ agent_active: true })
      .eq("wa_phone", phone);
    if (error) { console.error("[whatsapp-chat takeover]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  }

  if (action === "handback") {
    const { error } = await supabase
      .from("whatsapp_sessions")
      .update({ agent_active: false })
      .eq("wa_phone", phone);
    if (error) { console.error("[whatsapp-chat handback]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  }

  if (action === "send" && phone && message) {
    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("step")
      .eq("wa_phone", phone)
      .maybeSingle();
    if (session?.step === "opted_out") {
      return NextResponse.json({ error: "User has opted out — cannot send messages" }, { status: 403 });
    }

    const { data: lastInbound } = await supabase
      .from("whatsapp_messages")
      .select("created_at")
      .eq("wa_phone", phone)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastInbound) {
      return NextResponse.json({ error: "No customer message — window not open" }, { status: 400 });
    }
    if (Date.now() - new Date(lastInbound.created_at).getTime() > WINDOW_MS) {
      return NextResponse.json({ error: "24-hour window closed" }, { status: 400 });
    }

    const waRes = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
      }),
    });

    if (!waRes.ok) {
      console.error("[whatsapp-chat send] Meta API error");
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    await supabase.from("whatsapp_messages").insert({
      id: crypto.randomUUID(),
      wa_phone: phone,
      direction: "outbound",
      message,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  }

  // Template message — the only kind allowed OUTSIDE the 24-hour window.
  if (action === "send_template" && phone && templateName) {
    const { data: session } = await supabase
      .from("whatsapp_sessions")
      .select("step")
      .eq("wa_phone", phone)
      .maybeSingle();
    if (session?.step === "opted_out") {
      return NextResponse.json({ error: "User has opted out — cannot send messages" }, { status: 403 });
    }

    const vars: string[] = Array.isArray(variables) ? variables.map((v: unknown) => String(v ?? "")) : [];
    const components = vars.length
      ? [{ type: "body", parameters: vars.map((text) => ({ type: "text", text })) }]
      : [];

    const waRes = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: language || "en" },
          ...(components.length ? { components } : {}),
        },
      }),
    });

    if (!waRes.ok) {
      const detail = await waRes.text().catch(() => "");
      console.error("[whatsapp-chat send_template] Meta API error", detail);
      return NextResponse.json({ error: "Failed to send template message" }, { status: 500 });
    }

    await supabase.from("whatsapp_messages").insert({
      id: crypto.randomUUID(),
      wa_phone: phone,
      direction: "outbound",
      message: (preview && String(preview)) || `[Template] ${templateName}`,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const phone = searchParams.get("phone");

  if (type === "contacts") {
    const [sessionsRes, messagesRes] = await Promise.all([
      supabase
        .from("whatsapp_sessions")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase
        .from("whatsapp_messages")
        .select("wa_phone, message, direction, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    const lastMsgMap: Record<string, { message: string; direction: string; created_at: string }> = {};
    for (const msg of messagesRes.data ?? []) {
      if (!lastMsgMap[msg.wa_phone]) {
        lastMsgMap[msg.wa_phone] = {
          message: msg.message,
          direction: msg.direction,
          created_at: msg.created_at,
        };
      }
    }

    const contacts = (sessionsRes.data ?? []).map((s) => ({
      ...s,
      lastMessage: lastMsgMap[s.wa_phone] ?? null,
    }));

    return NextResponse.json({ contacts });
  }

  if (type === "templates") {
    if (!WABA_ID) {
      return NextResponse.json({ templates: [], error: "WHATSAPP_WABA_ID is not configured" });
    }
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates?limit=200&fields=name,language,status,category,components`,
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
    );
    if (!res.ok) {
      console.error("[whatsapp-chat templates] Meta API error");
      return NextResponse.json({ templates: [], error: "Failed to load templates from Meta" }, { status: 502 });
    }
    const json = await res.json();
    type MetaComponent = { type: string; text?: string; format?: string };
    type MetaTemplate = { name: string; language: string; status: string; category: string; components?: MetaComponent[] };
    const rows: MetaTemplate[] = Array.isArray(json.data) ? json.data : [];
    const templates = rows
      .filter((t) => t.status === "APPROVED")
      .map((t) => {
        const body = (t.components ?? []).find((c) => c.type === "BODY");
        const header = (t.components ?? []).find((c) => c.type === "HEADER");
        const bodyText: string = body?.text ?? "";
        const varCount = (bodyText.match(/\{\{\s*\d+\s*\}\}/g) ?? []).length;
        return {
          name: t.name,
          language: t.language,
          category: t.category,
          headerText: header?.format === "TEXT" ? header?.text ?? "" : "",
          bodyText,
          varCount,
        };
      });
    return NextResponse.json({ templates });
  }

  if (type === "messages" && phone) {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("wa_phone", phone)
      .order("created_at", { ascending: true });

    if (error) { console.error("[whatsapp-chat messages]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
    return NextResponse.json({ messages: data ?? [] });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
