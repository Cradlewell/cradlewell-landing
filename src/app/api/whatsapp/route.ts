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

// ── Send native location request message ─────────────────────────────────────

async function sendLocationRequest(to: string, bodyText: string) {
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
                    type: "location_request_message",
                    body: { text: bodyText },
                    action: { name: "send_location" },
                },
            }),
        });
    } catch (err) {
        console.error("Failed to send location request:", err);
    }
}

// ── Send due month list (next 9 months) ──────────────────────────────────────

function getNextMonths(count: number): Array<{ id: string; title: string }> {
    const months = [];
    const now = new Date();
    for (let i = 0; i < count; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const title = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        const id = `month_${d.getFullYear()}_${d.getMonth() + 1}`;
        months.push({ id, title });
    }
    return months;
}

async function sendMonthListMessage(to: string) {
    const rows = getNextMonths(9);
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
                    type: "list",
                    body: { text: "📅 Please select your expected due month:" },
                    action: {
                        button: "Select Month",
                        sections: [
                            {
                                title: "Due Month",
                                rows: rows.map((r) => ({ id: r.id, title: r.title })),
                            },
                        ],
                    },
                },
            }),
        });
    } catch (err) {
        console.error("Failed to send month list message:", err);
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

interface Session {
    wa_phone: string;
    step: string;
    name?: string;
    service?: string;
    baby_status?: string;
    location?: string;
    due_date?: string;
    shift?: string;
    time_slot?: string;
}

async function getSession(waPhone: string): Promise<Session | null> {
    const { data } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("wa_phone", waPhone)
        .single();
    return data as Session | null;
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

async function pushLeadToCRM(session: Session, waPhone: string) {
    const phone = waPhone.replace(/\D/g, "").slice(-10);
    const now = new Date();

    try {
        const { error } = await supabase.from("leads").insert({
            id: crypto.randomUUID(),
            name: session.name || "WhatsApp User",
            phone,
            whatsapp: phone,
            source: "WhatsApp",
            lead_date: now.toISOString(),
            service_required: session.service || "",
            baby_status: session.baby_status || "Unknown",
            address: session.location || null,
            care_start_date: session.due_date || null,
            preferred_shift: session.shift || null,
            shift_time: session.time_slot || null,
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

// ── Build summary thank-you message ──────────────────────────────────────────

function buildSummary(session: Session): string {
    const lines: string[] = [];
    lines.push(`Thank you, ${session.name}! 🌸 Here's a summary of your care request:\n`);
    if (session.name)       lines.push(`👤 Name: ${session.name}`);
    if (session.baby_status) lines.push(`🤰 Status: ${session.baby_status === "Expecting" ? "Expecting" : "Baby at Home"}`);
    if (session.location)   lines.push(`📍 Location: ${session.location}`);
    if (session.due_date)   lines.push(`🗓 Due Date: ${session.due_date}`);
    if (session.service)    lines.push(`💼 Service: ${session.service}`);
    if (session.shift)      lines.push(`🌅 Shift: ${session.shift}`);
    if (session.time_slot)  lines.push(`⏰ Timing: ${session.time_slot}`);
    lines.push(`\nOur care advisor will call you shortly to confirm availability.`);
    lines.push(`For urgent help, call: +91 93638 93639`);
    return lines.join("\n");
}

// ── Button constants ──────────────────────────────────────────────────────────

const BABY_STATUS_BUTTONS = [
    { id: "home", title: "Baby is home" },
    { id: "expecting", title: "Still expecting" },
];

const SERVICE_BUTTONS = [
    { id: "nurse", title: "Certified Nurse" },
    { id: "japa", title: "Postnatal Caregiver" },
];

const SHIFT_BUTTONS = [
    { id: "day", title: "Day care" },
    { id: "night", title: "Night care" },
];

const DAY_SLOT_BUTTONS = [
    { id: "slot_8", title: "8 AM – 4 PM" },
    { id: "slot_9", title: "9 AM – 5 PM" },
    { id: "slot_10", title: "10 AM – 6 PM" },
];

// ── Bot flow ──────────────────────────────────────────────────────────────────

async function handleMessage(waPhone: string, incomingText: string, profileName?: string) {
    const text = incomingText.trim();
    const session = await getSession(waPhone);

    await storeMessage(waPhone, "inbound", text);

    // ── New user or restart ───────────────────────────────────────────────────
    if (!session || session.step === "completed") {
        if (profileName) {
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

    // ── Collect name ──────────────────────────────────────────────────────────
    if (session.step === "ask_name") {
        const name = profileName || text;
        await upsertSession(waPhone, { name, step: "ask_baby_status" });
        const bodyText = `Nice to meet you, ${name}! 🌸\n\nIs your little one already home, or are you still expecting?`;
        await sendButtonMessage(waPhone, bodyText, BABY_STATUS_BUTTONS);
        await storeMessage(waPhone, "outbound", bodyText);
        return;
    }

    // ── Collect baby status ───────────────────────────────────────────────────
    if (session.step === "ask_baby_status") {
        const t = text.toLowerCase();
        let babyStatus = "";

        if (/^home$|^1$|baby is home|^born$|arrived|delivered/.test(t)) babyStatus = "Born";
        else if (/^expecting$|^2$|still expecting|pregnant|due/.test(t)) babyStatus = "Expecting";
        else {
            await sendButtonMessage(waPhone, "Please tap one of the options below:", BABY_STATUS_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please tap one of the options below:");
            return;
        }

        await upsertSession(waPhone, { baby_status: babyStatus });

        if (babyStatus === "Expecting") {
            await upsertSession(waPhone, { step: "ask_location" });
            const bodyText =
                "Wonderful! 🌸 To check caregiver availability near you, please share your current location.";
            await sendLocationRequest(waPhone, bodyText);
            await storeMessage(waPhone, "outbound", bodyText);
        } else {
            await upsertSession(waPhone, { step: "ask_service" });
            const bodyText = "Got it! 🌸 What kind of care are you looking for?";
            await sendButtonMessage(waPhone, bodyText, SERVICE_BUTTONS);
            await storeMessage(waPhone, "outbound", bodyText);
        }
        return;
    }

    // ── Collect location (text fallback if GPS share not used) ───────────────
    if (session.step === "ask_location") {
        await upsertSession(waPhone, { location: text, step: "ask_due_date" });
        await sendMonthListMessage(waPhone);
        await storeMessage(waPhone, "outbound", "📅 Please select your expected due month:");
        return;
    }

    // ── Collect due month (list reply handled in POST; this is typed fallback) ─
    if (session.step === "ask_due_date") {
        await upsertSession(waPhone, { due_date: text, step: "ask_service" });
        const bodyText = "Got it! 🌸 What kind of care are you looking for?";
        await sendButtonMessage(waPhone, bodyText, SERVICE_BUTTONS);
        await storeMessage(waPhone, "outbound", bodyText);
        return;
    }

    // ── Collect service ───────────────────────────────────────────────────────
    if (session.step === "ask_service") {
        const t = text.toLowerCase();
        let service = "";

        if (/^nurse$|^1$|certified nurse|\bnurse\b/.test(t)) service = "Nurse";
        else if (/^japa$|^2$|postnatal caregiver|japa|moba|caregiver/.test(t))
            service = "Postnatal Caregiver (Japa/MOBA)";
        else {
            await sendButtonMessage(waPhone, "Please tap the type of care you need:", SERVICE_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please tap the type of care you need:");
            return;
        }

        await upsertSession(waPhone, { service, step: "ask_shift" });
        const bodyText = `Great choice! 🌸 Would you need *Day care* or *Night care*?`;
        await sendButtonMessage(waPhone, bodyText, SHIFT_BUTTONS);
        await storeMessage(waPhone, "outbound", bodyText);
        return;
    }

    // ── Collect shift ─────────────────────────────────────────────────────────
    if (session.step === "ask_shift") {
        const t = text.toLowerCase();
        let shift = "";

        if (/^day$|day care/.test(t)) shift = "Day";
        else if (/^night$|night care/.test(t)) shift = "Night";
        else {
            await sendButtonMessage(waPhone, "Please tap your preferred shift:", SHIFT_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please tap your preferred shift:");
            return;
        }

        await upsertSession(waPhone, { shift });

        if (shift === "Day") {
            await upsertSession(waPhone, { step: "ask_time_slot" });
            const bodyText =
                "We have *8-hour* morning shifts. Please select your preferred timing:";
            await sendButtonMessage(waPhone, bodyText, DAY_SLOT_BUTTONS);
            await storeMessage(waPhone, "outbound", bodyText);
        } else {
            // Night is fixed — 9 PM to 6 AM (9 hrs)
            const timeSlot = "9 PM – 6 AM";
            await upsertSession(waPhone, { time_slot: timeSlot, step: "completed" });
            const updatedSession = { ...session, shift, time_slot: timeSlot };
            await pushLeadToCRM(updatedSession as Session, waPhone);
            const summary = buildSummary(updatedSession as Session);
            await sendMessage(waPhone, summary);
            await storeMessage(waPhone, "outbound", summary);
        }
        return;
    }

    // ── Collect time slot (day shift) ─────────────────────────────────────────
    if (session.step === "ask_time_slot") {
        const t = text.toLowerCase();
        let timeSlot = "";

        if (/8\s*am|8am|8.*4pm|slot_8/.test(t)) timeSlot = "8 AM – 4 PM";
        else if (/9\s*am|9am|9.*5pm|slot_9/.test(t)) timeSlot = "9 AM – 5 PM";
        else if (/10\s*am|10am|10.*6pm|slot_10/.test(t)) timeSlot = "10 AM – 6 PM";
        else {
            await sendButtonMessage(waPhone, "Please tap your preferred timing:", DAY_SLOT_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please tap your preferred timing:");
            return;
        }

        await upsertSession(waPhone, { time_slot: timeSlot, step: "completed" });
        const updatedSession = { ...session, time_slot: timeSlot };
        await pushLeadToCRM(updatedSession as Session, waPhone);
        const summary = buildSummary(updatedSession as Session);
        await sendMessage(waPhone, summary);
        await storeMessage(waPhone, "outbound", summary);
        return;
    }

    // ── Already completed ─────────────────────────────────────────────────────
    const reply =
        "Our care advisor will contact you very soon! 🌸 For urgent help, call +91 93638 93639.";
    await sendMessage(waPhone, reply);
    await storeMessage(waPhone, "outbound", reply);
}

// ── Handle incoming GPS location share ───────────────────────────────────────

async function handleLocation(
    waPhone: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
) {
    const session = await getSession(waPhone);
    if (!session || session.step !== "ask_location") return;

    const parts = [name, address].filter(Boolean);
    const locationText =
        parts.length > 0
            ? parts.join(", ")
            : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    await storeMessage(waPhone, "inbound", `📍 ${locationText}`);
    await upsertSession(waPhone, { location: locationText, step: "ask_due_date" });

    await sendMonthListMessage(waPhone);
    await storeMessage(waPhone, "outbound", "📅 Please select your expected due month:");
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

        const contacts = body.entry?.[0]?.changes?.[0]?.value?.contacts;
        const profileName: string | undefined = contacts?.[0]?.profile?.name || undefined;

        // Handle GPS location share
        if (message.type === "location") {
            const { latitude, longitude, name, address } = message.location ?? {};
            await handleLocation(waPhone, latitude, longitude, name, address);
            return NextResponse.json({ status: "ok" });
        }

        // Extract text from plain message, button tap, or list selection
        let text: string | null = null;
        if (message.type === "text") {
            text = message.text?.body ?? null;
        } else if (message.type === "interactive") {
            if (message.interactive?.type === "button_reply") {
                text = message.interactive.button_reply?.title ?? null;
            } else if (message.interactive?.type === "list_reply") {
                text = message.interactive.list_reply?.title ?? null;
            }
        }

        if (!text) return NextResponse.json({ status: "ok" });

        await handleMessage(waPhone, text, profileName);
        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("WhatsApp webhook error:", error);
        return NextResponse.json({ status: "ok" }); // always 200 to Meta
    }
}
