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
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
        });
    } catch (err) {
        console.error("sendMessage failed:", err);
    }
}

// ── Send interactive button message (max 3 buttons, title max 20 chars) ───────

async function sendButtonMessage(to: string, body: string, buttons: Array<{ id: string; title: string }>) {
    try {
        await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: { text: body },
                    action: { buttons: buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.title } })) },
                },
            }),
        });
    } catch (err) {
        console.error("sendButtonMessage failed:", err);
    }
}

// ── Send native location request ──────────────────────────────────────────────

async function sendLocationRequest(to: string, bodyText: string) {
    try {
        await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
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
        console.error("sendLocationRequest failed:", err);
    }
}

// ── Send day time slot list (with Main Menu) ──────────────────────────────────

async function sendDaySlotListMessage(to: string) {
    try {
        await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to,
                type: "interactive",
                interactive: {
                    type: "list",
                    body: { text: "We have *8-hour* morning shifts. Please select your preferred timing:" },
                    action: {
                        button: "Select Timing",
                        sections: [
                            {
                                title: "Morning Shifts",
                                rows: [
                                    { id: "slot_8", title: "8 AM – 4 PM" },
                                    { id: "slot_9", title: "9 AM – 5 PM" },
                                    { id: "slot_10", title: "10 AM – 6 PM" },
                                ],
                            },
                            { title: "Navigation", rows: [{ id: "main_menu", title: "Main Menu" }] },
                        ],
                    },
                },
            }),
        });
    } catch (err) {
        console.error("sendDaySlotListMessage failed:", err);
    }
}

// ── Deduplication: check if WhatsApp message ID was already processed ─────────

async function isAlreadyProcessed(waMessageId: string): Promise<boolean> {
    const { data } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("wa_message_id", waMessageId)
        .maybeSingle();
    return !!data;
}

// ── Store message in Supabase ─────────────────────────────────────────────────

async function storeMessage(
    waPhone: string,
    direction: "inbound" | "outbound",
    message: string,
    waMessageId?: string
) {
    await supabase.from("whatsapp_messages").insert({
        id: crypto.randomUUID(),
        wa_phone: waPhone,
        direction,
        message,
        wa_message_id: waMessageId ?? null,
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
    const lines: string[] = [
        `Thank you, ${session.name}! 🌸 Here's a summary of your care request:\n`,
    ];
    if (session.name)        lines.push(`👤 Name: ${session.name}`);
    if (session.baby_status) lines.push(`🤰 Status: ${session.baby_status === "Expecting" ? "Expecting" : "Baby at Home"}`);
    if (session.location)    lines.push(`📍 Location: ${session.location}`);
    if (session.due_date)    lines.push(`🗓 Due Month: ${session.due_date}`);
    if (session.service)     lines.push(`💼 Service: ${session.service}`);
    if (session.shift)       lines.push(`🌅 Shift: ${session.shift}`);
    if (session.time_slot)   lines.push(`⏰ Timing: ${session.time_slot}`);
    lines.push(`\nOur care advisor will call you shortly to confirm availability.`);
    lines.push(`For urgent help, call: +91 93638 93639`);
    return lines.join("\n");
}

// ── Button / option constants ─────────────────────────────────────────────────

const BABY_STATUS_BUTTONS = [
    { id: "home", title: "Baby is home" },
    { id: "expecting", title: "Still expecting" },
    { id: "main_menu", title: "Main Menu" },
];

const SERVICE_BUTTONS = [
    { id: "nurse", title: "Certified Nurse" },
    { id: "japa", title: "Postnatal Caregiver" },
    { id: "main_menu", title: "Main Menu" },
];

const SHIFT_BUTTONS = [
    { id: "day", title: "Day care" },
    { id: "night", title: "Night care" },
    { id: "main_menu", title: "Main Menu" },
];

// ── Bot flow ──────────────────────────────────────────────────────────────────

async function sendMainMenu(waPhone: string, name?: string) {
    const greeting = name ? `Welcome back, ${name}! 🌸` : "Welcome back! 🌸";
    const msg = `${greeting}\n\nIs your little one already home, or are you still expecting?`;
    await sendButtonMessage(waPhone, msg, BABY_STATUS_BUTTONS);
    await storeMessage(waPhone, "outbound", msg);
}

async function handleMessage(waPhone: string, incomingText: string, waMessageId: string, profileName?: string) {
    const text = incomingText.trim();
    const session = await getSession(waPhone);

    console.log(`[WA] phone=${waPhone} step=${session?.step ?? "NEW"} text="${text}"`);

    await storeMessage(waPhone, "inbound", text, waMessageId);

    // ── Main Menu — restart flow from baby status ─────────────────────────────
    if (/^main menu$|^menu$/i.test(text) || text === "main_menu") {
        const name = session?.name || profileName;
        await upsertSession(waPhone, {
            step: "ask_baby_status",
            ...(name ? { name } : {}),
            baby_status: "", service: "", location: "", due_date: "", shift: "", time_slot: "",
        });
        await sendMainMenu(waPhone, name);
        return;
    }

    // ── New user or restart ───────────────────────────────────────────────────
    if (!session || session.step === "completed") {
        if (profileName) {
            await upsertSession(waPhone, { step: "ask_baby_status", name: profileName });
            const msg = `Hi ${profileName}! 🌸 Welcome to Cradlewell — Bengaluru's trusted newborn and postnatal care experts.\n\nIs your little one already home, or are you still expecting?`;
            await sendButtonMessage(waPhone, msg, BABY_STATUS_BUTTONS);
            await storeMessage(waPhone, "outbound", msg);
        } else {
            await upsertSession(waPhone, { step: "ask_name" });
            const msg = "Hi! 🌸 Welcome to Cradlewell — Bengaluru's trusted newborn and postnatal care experts.\n\nMay I know your name?";
            await sendMessage(waPhone, msg);
            await storeMessage(waPhone, "outbound", msg);
        }
        return;
    }

    // ── Collect name ──────────────────────────────────────────────────────────
    if (session.step === "ask_name") {
        const name = profileName || text;
        await upsertSession(waPhone, { name, step: "ask_baby_status" });
        const msg = `Nice to meet you, ${name}! 🌸\n\nIs your little one already home, or are you still expecting?`;
        await sendButtonMessage(waPhone, msg, BABY_STATUS_BUTTONS);
        await storeMessage(waPhone, "outbound", msg);
        return;
    }

    // ── Collect baby status ───────────────────────────────────────────────────
    if (session.step === "ask_baby_status") {
        const t = text.toLowerCase();
        let babyStatus = "";
        if (/^home$|^1$|baby.?is.?home|^born$|arrived|delivered/.test(t)) babyStatus = "Born";
        else if (/^expecting$|^2$|still.?expecting|pregnant|due/.test(t)) babyStatus = "Expecting";
        else {
            await sendButtonMessage(waPhone, "Please tap one of the options below:", BABY_STATUS_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please tap one of the options below:");
            return;
        }

        if (babyStatus === "Expecting") {
            // Single atomic update — step changes in same call
            await upsertSession(waPhone, { baby_status: babyStatus, step: "ask_location" });
            const msg = "Wonderful! 🌸 To check caregiver availability near you, please share your current location.";
            await sendLocationRequest(waPhone, msg);
            await storeMessage(waPhone, "outbound", msg);
        } else {
            await upsertSession(waPhone, { baby_status: babyStatus, step: "ask_service" });
            const msg = "Got it! 🌸 What kind of care are you looking for?";
            await sendButtonMessage(waPhone, msg, SERVICE_BUTTONS);
            await storeMessage(waPhone, "outbound", msg);
        }
        return;
    }

    // ── Collect location (text fallback — GPS share goes via handleLocation) ──
    if (session.step === "ask_location") {
        await upsertSession(waPhone, { location: text, step: "ask_service" });
        const msg = "Got it! 🌸 What kind of care are you looking for?";
        await sendButtonMessage(waPhone, msg, SERVICE_BUTTONS);
        await storeMessage(waPhone, "outbound", msg);
        return;
    }

    // ── Collect service ───────────────────────────────────────────────────────
    if (session.step === "ask_service") {
        const t = text.toLowerCase();
        let service = "";
        if (/^nurse$|^1$/.test(t)) service = "Nurse";
        else if (/^japa$|^2$/.test(t)) service = "Postnatal Caregiver (Japa/MOBA)";
        else {
            await sendButtonMessage(waPhone, "Please tap the type of care you need:", SERVICE_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please tap the type of care you need:");
            return;
        }
        await upsertSession(waPhone, { service, step: "ask_shift" });
        const msg = "Great choice! 🌸 Would you need *Day care* or *Night care*?";
        await sendButtonMessage(waPhone, msg, SHIFT_BUTTONS);
        await storeMessage(waPhone, "outbound", msg);
        return;
    }

    // ── Collect shift ─────────────────────────────────────────────────────────
    if (session.step === "ask_shift") {
        const t = text.toLowerCase();
        let shift = "";
        if (/^day$/.test(t)) shift = "Day";
        else if (/^night$/.test(t)) shift = "Night";
        else {
            await sendButtonMessage(waPhone, "Please tap your preferred shift:", SHIFT_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please tap your preferred shift:");
            return;
        }

        if (shift === "Day") {
            await upsertSession(waPhone, { shift, step: "ask_time_slot" });
            await sendDaySlotListMessage(waPhone);
            await storeMessage(waPhone, "outbound", "We have 8-hour morning shifts. Please select your preferred timing:");
        } else {
            const timeSlot = "9 PM – 6 AM";
            await upsertSession(waPhone, { shift, time_slot: timeSlot, step: "completed" });
            const finalSession: Session = { ...session, shift, time_slot: timeSlot };
            await pushLeadToCRM(finalSession, waPhone);
            const summary = buildSummary(finalSession);
            await sendMessage(waPhone, summary);
            await storeMessage(waPhone, "outbound", summary);
        }
        return;
    }

    // ── Collect time slot (day shift) ─────────────────────────────────────────
    if (session.step === "ask_time_slot") {
        const t = text.toLowerCase();
        let timeSlot = "";
        if (/8\s*(am|–)|slot_8/.test(t)) timeSlot = "8 AM – 4 PM";
        else if (/9\s*(am|–)|slot_9/.test(t)) timeSlot = "9 AM – 5 PM";
        else if (/10\s*(am|–)|slot_10/.test(t)) timeSlot = "10 AM – 6 PM";
        else {
            await sendDaySlotListMessage(waPhone);
            await storeMessage(waPhone, "outbound", "Please select your preferred timing:");
            return;
        }
        await upsertSession(waPhone, { time_slot: timeSlot, step: "completed" });
        const finalSession: Session = { ...session, time_slot: timeSlot };
        await pushLeadToCRM(finalSession, waPhone);
        const summary = buildSummary(finalSession);
        await sendMessage(waPhone, summary);
        await storeMessage(waPhone, "outbound", summary);
        return;
    }

    // ── Already completed ─────────────────────────────────────────────────────
    const msg = "Our care advisor will contact you very soon! 🌸 For urgent help, call +91 93638 93639.";
    await sendMessage(waPhone, msg);
    await storeMessage(waPhone, "outbound", msg);
}

// ── Handle incoming GPS location share ───────────────────────────────────────

async function handleLocation(waPhone: string, latitude: number, longitude: number, name?: string, address?: string) {
    const session = await getSession(waPhone);
    if (!session || session.step !== "ask_location") return;

    const parts = [name, address].filter(Boolean);
    const locationText = parts.length > 0 ? parts.join(", ") : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    await storeMessage(waPhone, "inbound", `📍 ${locationText}`);
    await upsertSession(waPhone, { location: locationText, step: "ask_service" });
    const msg = "Got it! 🌸 What kind of care are you looking for?";
    await sendButtonMessage(waPhone, msg, SERVICE_BUTTONS);
    await storeMessage(waPhone, "outbound", msg);
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
        const waMessageId: string = message.id;

        // ── Dedup: ignore if this message ID was already processed ────────────
        if (await isAlreadyProcessed(waMessageId)) {
            return NextResponse.json({ status: "ok" });
        }

        const contacts = body.entry?.[0]?.changes?.[0]?.value?.contacts;
        const profileName: string | undefined = contacts?.[0]?.profile?.name || undefined;

        // ── Handle GPS location share ─────────────────────────────────────────
        if (message.type === "location") {
            const { latitude, longitude, name, address } = message.location ?? {};
            await handleLocation(waPhone, latitude, longitude, name, address);
            return NextResponse.json({ status: "ok" });
        }

        // ── Extract text from message, button tap, or list selection ──────────
        // Use id (not title) for interactive replies — ids are programmatic and reliable
        let text: string | null = null;
        if (message.type === "text") {
            text = message.text?.body ?? null;
        } else if (message.type === "interactive") {
            console.log(`[WA] interactive raw:`, JSON.stringify(message.interactive));
            if (message.interactive?.type === "button_reply") {
                text = message.interactive.button_reply?.id ?? null;
            } else if (message.interactive?.type === "list_reply") {
                text = message.interactive.list_reply?.id ?? null;
            }
        }

        if (!text) return NextResponse.json({ status: "ok" });

        await handleMessage(waPhone, text, waMessageId, profileName);
        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("WhatsApp webhook error:", error);
        return NextResponse.json({ status: "ok" }); // always 200 to Meta
    }
}
