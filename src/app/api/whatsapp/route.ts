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

// ── Send day time slot list ───────────────────────────────────────────────────

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

// ── Store message in Supabase ─────────────────────────────────────────────────
// For inbound messages with a waMessageId, the unique constraint on wa_message_id
// acts as an atomic dedup lock — returns false if this is a duplicate delivery.

async function storeMessage(
    waPhone: string,
    direction: "inbound" | "outbound",
    message: string,
    waMessageId?: string
): Promise<boolean> {
    const { error } = await supabase.from("whatsapp_messages").insert({
        id: crypto.randomUUID(),
        wa_phone: waPhone,
        direction,
        message,
        wa_message_id: waMessageId ?? null,
        created_at: new Date().toISOString(),
    });
    if (error && error.code === "23505") return false;
    if (error) console.error("storeMessage failed:", error);
    return true;
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
    const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("wa_phone", waPhone)
        .maybeSingle();
    if (error) {
        console.error("getSession failed:", error);
        return null;
    }
    return data as Session | null;
}

// Read-then-write is safe here because inbound message dedup (wa_message_id
// unique constraint) guarantees only one handleMessage call runs per message.
async function upsertSession(waPhone: string, updates: Record<string, string>) {
    const now = new Date().toISOString();
    const existing = await getSession(waPhone);
    if (existing) {
        const { error } = await supabase
            .from("whatsapp_sessions")
            .update({ ...updates, updated_at: now })
            .eq("wa_phone", waPhone);
        if (error) console.error("upsertSession update failed:", error);
    } else {
        const { error } = await supabase.from("whatsapp_sessions").insert({
            id: crypto.randomUUID(),
            wa_phone: waPhone,
            step: "greeting",
            created_at: now,
            updated_at: now,
            ...updates,
        });
        if (error) console.error("upsertSession insert failed:", error);
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

// ── Match helpers — accept both button IDs and button title text ──────────────

function matchBabyStatus(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "home" || t === "baby is home") return "Born";
    if (t === "expecting" || t === "still expecting") return "Expecting";
    if (/^1$|baby.?is.?home|already.?home|^born$|arrived|delivered/.test(t)) return "Born";
    if (/^2$|still.?expecting|pregnant|^due$/.test(t)) return "Expecting";
    return "";
}

function matchService(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "nurse" || t === "certified nurse") return "Nurse";
    if (t === "japa" || t === "postnatal caregiver") return "Postnatal Caregiver (Japa/MOBA)";
    if (/^1$|certified.?nurse/.test(t)) return "Nurse";
    if (/^2$|postnatal|caregiver|moba/.test(t)) return "Postnatal Caregiver (Japa/MOBA)";
    return "";
}

function matchShift(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "day" || t === "day care") return "Day";
    if (t === "night" || t === "night care") return "Night";
    if (/^day$|day.?care/.test(t)) return "Day";
    if (/^night$|night.?care/.test(t)) return "Night";
    return "";
}

function matchTimeSlot(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "slot_8" || /8\s*am/.test(t)) return "8 AM – 4 PM";
    if (t === "slot_9" || /9\s*am/.test(t)) return "9 AM – 5 PM";
    if (t === "slot_10" || /10\s*am/.test(t)) return "10 AM – 6 PM";
    return "";
}

function isMainMenu(text: string): boolean {
    const t = text.trim().toLowerCase();
    return t === "main_menu" || t === "main menu" || t === "menu";
}

// ── Bot flow ──────────────────────────────────────────────────────────────────

async function sendMainMenu(waPhone: string, name?: string) {
    const greeting = name ? `Welcome back, ${name}! 🌸` : "Welcome back! 🌸";
    const msg = `${greeting}\n\nIs your little one already home, or are you still expecting?`;
    await sendButtonMessage(waPhone, msg, BABY_STATUS_BUTTONS);
    await storeMessage(waPhone, "outbound", msg);
}

async function handleMessage(waPhone: string, incomingText: string, profileName?: string) {
    const text = incomingText.trim();
    const session = await getSession(waPhone);

    console.log(`[WA] phone=${waPhone} step=${session?.step ?? "NEW"} text="${text}"`);

    // ── Main Menu — restart flow ──────────────────────────────────────────────
    if (isMainMenu(text)) {
        const name = session?.name || profileName;
        await upsertSession(waPhone, {
            step: "ask_baby_status",
            ...(name ? { name } : {}),
            baby_status: "", service: "", location: "", due_date: "", shift: "", time_slot: "",
        });
        await sendMainMenu(waPhone, name);
        return;
    }

    // ── New user or completed — restart ───────────────────────────────────────
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
        const babyStatus = matchBabyStatus(text);
        if (!babyStatus) {
            await sendButtonMessage(waPhone, "Please tap one of the options below:", BABY_STATUS_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please tap one of the options below:");
            return;
        }
        if (babyStatus === "Expecting") {
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
        const service = matchService(text);
        if (!service) {
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
        const shift = matchShift(text);
        if (!shift) {
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
        const timeSlot = matchTimeSlot(text);
        if (!timeSlot) {
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

    // ── Already completed / unknown ───────────────────────────────────────────
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

        const contacts = body.entry?.[0]?.changes?.[0]?.value?.contacts;
        const profileName: string | undefined = contacts?.[0]?.profile?.name || undefined;

        // ── Handle GPS location share ─────────────────────────────────────────
        if (message.type === "location") {
            const { latitude, longitude, name, address } = message.location ?? {};
            const stored = await storeMessage(waPhone, "inbound", "📍 location", waMessageId);
            if (!stored) {
                console.log(`[WA] duplicate location skipped: ${waMessageId}`);
                return NextResponse.json({ status: "ok" });
            }
            await handleLocation(waPhone, latitude, longitude, name, address);
            return NextResponse.json({ status: "ok" });
        }

        // ── Extract text from message, button tap, or list selection ──────────
        let text: string | null = null;
        if (message.type === "text") {
            text = message.text?.body ?? null;
        } else if (message.type === "interactive") {
            console.log(`[WA] interactive raw:`, JSON.stringify(message.interactive));
            if (message.interactive?.type === "button_reply") {
                const id = message.interactive.button_reply?.id;
                const title = message.interactive.button_reply?.title;
                console.log(`[WA] button_reply id="${id}" title="${title}"`);
                text = id ?? title ?? null;
            } else if (message.interactive?.type === "list_reply") {
                const id = message.interactive.list_reply?.id;
                const title = message.interactive.list_reply?.title;
                console.log(`[WA] list_reply id="${id}" title="${title}"`);
                text = id ?? title ?? null;
            }
        }

        if (!text) {
            console.log(`[WA] no text extracted from message type=${message.type}`);
            return NextResponse.json({ status: "ok" });
        }

        // ── Atomic dedup: if wa_message_id already exists, skip ───────────────
        const stored = await storeMessage(waPhone, "inbound", text, waMessageId);
        if (!stored) {
            console.log(`[WA] duplicate message skipped: ${waMessageId}`);
            return NextResponse.json({ status: "ok" });
        }

        await handleMessage(waPhone, text, profileName);
        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("WhatsApp webhook error:", error);
        return NextResponse.json({ status: "ok" });
    }
}
