import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;

// ── Send WhatsApp message ─────────────────────────────────────────────────────

async function sendMessage(to: string, text: string) {
    try {
        await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to,
                type: "text",
                text: { body: text },
            }),
        });
    } catch (err) {
        console.error("Failed to send WhatsApp message:", err);
    }
}

// ── Store message in Supabase ─────────────────────────────────────────────────

async function storeMessage(waPhone: string, direction: "inbound" | "outbound", message: string) {
    await supabase.from("whatsapp_messages").insert({
        id: crypto.randomUUID(),
        wa_phone: waPhone,
        direction,
        message,
        created_at: new Date().toISOString(),
    });
}

// ── Session helpers ───────────────────────────────────────────────────────────

async function getSession(waPhone: string) {
    const { data } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("wa_phone", waPhone)
        .single();
    return data as {
        wa_phone: string;
        step: string;
        name?: string;
        service?: string;
        baby_status?: string;
    } | null;
}

async function upsertSession(waPhone: string, updates: Record<string, string>) {
    const existing = await getSession(waPhone);
    const now = new Date().toISOString();
    if (existing) {
        await supabase
            .from("whatsapp_sessions")
            .update({ ...updates, updated_at: now })
            .eq("wa_phone", waPhone);
    } else {
        await supabase.from("whatsapp_sessions").insert({
            id: crypto.randomUUID(),
            wa_phone: waPhone,
            step: "greeting",
            created_at: now,
            updated_at: now,
            ...updates,
        });
    }
}

// ── Push lead to CRM ──────────────────────────────────────────────────────────

async function pushLeadToCRM(waPhone: string, name: string, service: string, babyStatus: string) {
    const phone = waPhone.replace(/\D/g, "").slice(-10);
    const now = new Date();

    try {
        const { error } = await supabase.from("leads").insert({
            id: crypto.randomUUID(),
            name,
            phone,
            whatsapp: phone,
            source: "WhatsApp",
            lead_date: now.toISOString(),
            service_required: service,
            baby_status: babyStatus || "Unknown",
            owner: "Unassigned",
            stage: "New Lead",
            temperature: "Cold",
            last_activity_at: now.toISOString(),
            created_at: now.toISOString(),
        });
        if (error) console.error("Supabase lead insert error:", error.message);
    } catch (err) {
        console.error("Lead push failed:", err);
    }
}

// ── Bot flow ──────────────────────────────────────────────────────────────────

async function handleMessage(waPhone: string, incomingText: string) {
    const text = incomingText.trim();
    const session = await getSession(waPhone);

    await storeMessage(waPhone, "inbound", text);

    // New user or restart after completion
    if (!session || session.step === "completed") {
        await upsertSession(waPhone, { step: "ask_name" });
        const reply =
            "Hi! 🌸 Welcome to Cradlewell — Bengaluru's trusted newborn and postnatal care experts.\n\nMay I know your name?";
        await sendMessage(waPhone, reply);
        await storeMessage(waPhone, "outbound", reply);
        return;
    }

    // Step: collect name
    if (session.step === "ask_name") {
        await upsertSession(waPhone, { name: text, step: "ask_baby_status" });
        const reply =
            `Nice to meet you, ${text}! 🌸\n\nIs your little one already home, or are you still expecting?\n\nReply:\n1️⃣ Baby is home\n2️⃣ Still expecting`;
        await sendMessage(waPhone, reply);
        await storeMessage(waPhone, "outbound", reply);
        return;
    }

    // Step: collect baby status
    if (session.step === "ask_baby_status") {
        const t = text.toLowerCase();
        let babyStatus = "";
        if (/^1$|home|born|arrived|delivered/.test(t)) babyStatus = "Born";
        else if (/^2$|expect|pregnant|due/.test(t)) babyStatus = "Expecting";
        else {
            const reply = "Please reply:\n1️⃣ Baby is home\n2️⃣ Still expecting";
            await sendMessage(waPhone, reply);
            await storeMessage(waPhone, "outbound", reply);
            return;
        }
        await upsertSession(waPhone, { baby_status: babyStatus, step: "ask_service" });
        const reply =
            "Got it! 🌸 What kind of care are you looking for?\n\n1️⃣ Certified Nurse\n2️⃣ Postnatal Caregiver (Japa/MOBA)";
        await sendMessage(waPhone, reply);
        await storeMessage(waPhone, "outbound", reply);
        return;
    }

    // Step: collect service → push lead
    if (session.step === "ask_service") {
        const t = text.toLowerCase();
        let service = "";
        if (/^1$|\bnurse\b/.test(t)) service = "Nurse";
        else if (/^2$|japa|moba|caregiver/.test(t)) service = "Postnatal Caregiver (Japa/MOBA)";
        else {
            const reply =
                "Please reply:\n1️⃣ Certified Nurse\n2️⃣ Postnatal Caregiver (Japa/MOBA)";
            await sendMessage(waPhone, reply);
            await storeMessage(waPhone, "outbound", reply);
            return;
        }

        await upsertSession(waPhone, { service, step: "completed" });
        await pushLeadToCRM(waPhone, session.name || "WhatsApp User", service, session.baby_status || "");

        const reply =
            `Thank you, ${session.name}! 🌸 Our care advisor will call you shortly.\n\nFor urgent queries, call us: +91 93638 93639`;
        await sendMessage(waPhone, reply);
        await storeMessage(waPhone, "outbound", reply);
        return;
    }

    // Already completed — any follow-up message
    const reply =
        "Our care advisor will contact you very soon! 🌸 For urgent help, call +91 93638 93639.";
    await sendMessage(waPhone, reply);
    await storeMessage(waPhone, "outbound", reply);
}

// ── GET — Webhook verification ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const mode = params.get("hub.mode");
    const token = params.get("hub.verify_token");
    const challenge = params.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST — Receive messages ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;

        if (!messages?.length) return NextResponse.json({ status: "ok" });

        const message = messages[0];
        const waPhone: string = message.from;
        const text: string | null = message.type === "text" ? message.text?.body : null;

        if (!text) return NextResponse.json({ status: "ok" });

        await handleMessage(waPhone, text);
        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("WhatsApp webhook error:", error);
        return NextResponse.json({ status: "ok" }); // always 200 to Meta
    }
}
