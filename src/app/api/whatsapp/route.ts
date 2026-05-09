import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!;

// ── Send plain text message ───────────────────────────────────────────────────

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

// ── Send interactive button message (max 3 buttons, title max 20 chars) ───────

async function sendButtonMessage(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
) {
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
                type: "interactive",
                interactive: {
                    type: "button",
                    body: { text: body },
                    action: {
                        buttons: buttons.map((btn) => ({
                            type: "reply",
                            reply: { id: btn.id, title: btn.title },
                        })),
                    },
                },
            }),
        });
    } catch (err) {
        console.error("Failed to send WhatsApp button message:", err);
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

const BABY_STATUS_BUTTONS = [
    { id: "home", title: "Baby is home" },
    { id: "expecting", title: "Still expecting" },
];

const SERVICE_BUTTONS = [
    { id: "nurse", title: "Certified Nurse" },
    { id: "japa", title: "Postnatal Caregiver" },
];

async function handleMessage(waPhone: string, incomingText: string, profileName?: string) {
    const text = incomingText.trim();
    const session = await getSession(waPhone);

    await storeMessage(waPhone, "inbound", text);

    // New user or restart after completion
    if (!session || session.step === "completed") {
        if (profileName) {
            // We already have their name from WhatsApp profile — skip ask_name
            await upsertSession(waPhone, { step: "ask_baby_status", name: profileName });
            const bodyText = `Hi ${profileName}! 🌸 Welcome to Cradlewell — Bengaluru's trusted newborn and postnatal care experts.\n\nIs your little one already home, or are you still expecting?`;
            await sendButtonMessage(waPhone, bodyText, BABY_STATUS_BUTTONS);
            await storeMessage(waPhone, "outbound", bodyText);
        } else {
            await upsertSession(waPhone, { step: "ask_name" });
            const reply =
                "Hi! 🌸 Welcome to Cradlewell — Bengaluru's trusted newborn and postnatal care experts.\n\nMay I know your name?";
            await sendMessage(waPhone, reply);
            await storeMessage(waPhone, "outbound", reply);
        }
        return;
    }

    // Step: collect name (fallback if profile name was unavailable)
    if (session.step === "ask_name") {
        const name = profileName || text;
        await upsertSession(waPhone, { name, step: "ask_baby_status" });
        const bodyText = `Nice to meet you, ${name}! 🌸\n\nIs your little one already home, or are you still expecting?`;
        await sendButtonMessage(waPhone, bodyText, BABY_STATUS_BUTTONS);
        await storeMessage(waPhone, "outbound", bodyText);
        return;
    }

    // Step: collect baby status
    if (session.step === "ask_baby_status") {
        const t = text.toLowerCase();
        let babyStatus = "";

        if (/^home$|^1$|baby is home|^born$|arrived|delivered/.test(t)) babyStatus = "Born";
        else if (/^expecting$|^2$|still expecting|pregnant|due/.test(t)) babyStatus = "Expecting";
        else {
            await sendButtonMessage(
                waPhone,
                "Please tap one of the options below:",
                BABY_STATUS_BUTTONS
            );
            await storeMessage(waPhone, "outbound", "Please tap one of the options below:");
            return;
        }

        await upsertSession(waPhone, { baby_status: babyStatus, step: "ask_service" });
        const bodyText = "Got it! 🌸 What kind of care are you looking for?";
        await sendButtonMessage(waPhone, bodyText, SERVICE_BUTTONS);
        await storeMessage(waPhone, "outbound", bodyText);
        return;
    }

    // Step: collect service → push lead
    if (session.step === "ask_service") {
        const t = text.toLowerCase();
        let service = "";

        if (/^nurse$|^1$|certified nurse|\bnurse\b/.test(t)) service = "Nurse";
        else if (/^japa$|^2$|postnatal caregiver|japa|moba|caregiver/.test(t))
            service = "Postnatal Caregiver (Japa/MOBA)";
        else {
            await sendButtonMessage(
                waPhone,
                "Please tap the type of care you need:",
                SERVICE_BUTTONS
            );
            await storeMessage(waPhone, "outbound", "Please tap the type of care you need:");
            return;
        }

        await upsertSession(waPhone, { service, step: "completed" });
        await pushLeadToCRM(
            waPhone,
            session.name || "WhatsApp User",
            service,
            session.baby_status || ""
        );

        const reply = `Thank you, ${session.name}! 🌸 Our care advisor will call you shortly.\n\nFor urgent queries, call us: +91 93638 93639`;
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

        // Extract WhatsApp profile name from contacts array
        const contacts = body.entry?.[0]?.changes?.[0]?.value?.contacts;
        const profileName: string | undefined = contacts?.[0]?.profile?.name || undefined;

        // Extract text from plain message OR interactive button tap
        let text: string | null = null;
        if (message.type === "text") {
            text = message.text?.body ?? null;
        } else if (
            message.type === "interactive" &&
            message.interactive?.type === "button_reply"
        ) {
            text = message.interactive.button_reply?.title ?? null;
        }

        if (!text) return NextResponse.json({ status: "ok" });

        await handleMessage(waPhone, text, profileName);
        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("WhatsApp webhook error:", error);
        return NextResponse.json({ status: "ok" }); // always 200 to Meta
    }
}
