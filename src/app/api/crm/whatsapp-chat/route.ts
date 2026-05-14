import { NextRequest, NextResponse } from "next/server";
import { supabase, isAuthed } from "@/lib/supabase-server";

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN!;
const WINDOW_MS       = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
    if (!isAuthed(req.cookies.get("crm_auth")?.value)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, phone, message } = await req.json();

    if (action === "takeover") {
        const { error } = await supabase
            .from("whatsapp_sessions")
            .update({ agent_active: true })
            .eq("wa_phone", phone);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
    }

    if (action === "handback") {
        const { error } = await supabase
            .from("whatsapp_sessions")
            .update({ agent_active: false })
            .eq("wa_phone", phone);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
    }

    if (action === "send" && phone && message) {
        // Enforce 24-hour window
        const { data: lastInbound } = await supabase
            .from("whatsapp_messages")
            .select("created_at")
            .eq("wa_phone", phone)
            .eq("direction", "inbound")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

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
            const err = await waRes.json();
            return NextResponse.json({ error: err }, { status: 500 });
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
    if (!isAuthed(req.cookies.get("crm_auth")?.value)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    if (type === "messages" && phone) {
        const { data, error } = await supabase
            .from("whatsapp_messages")
            .select("*")
            .eq("wa_phone", phone)
            .order("created_at", { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ messages: data ?? [] });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
