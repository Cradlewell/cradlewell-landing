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

// ── Send 8-hour day time slot list (Nurse day & Japa 8hr) ────────────────────

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
                    body: { text: "Please select your preferred start time:" },
                    action: {
                        button: "Select Timing",
                        sections: [
                            {
                                title: "Morning Shifts (8 hrs)",
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

// ── Send due month list (next 9 months, generated dynamically) ───────────────

async function sendDueMonthListMessage(to: string) {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const now = new Date();
    const rows = Array.from({ length: 9 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
        return { id: `due_${d.getFullYear()}_${d.getMonth() + 1}`, title: label };
    });
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
                    body: { text: "When is your due date? Please select the month." },
                    action: {
                        button: "Select Month",
                        sections: [{ title: "Due Month", rows }],
                    },
                },
            }),
        });
    } catch (err) {
        console.error("sendDueMonthListMessage failed:", err);
    }
}

// ── Send hospital selection list ─────────────────────────────────────────────

async function sendHospitalListMessage(to: string) {
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
                    body: { text: "Which hospital welcomed your baby?" },
                    action: {
                        button: "Select Hospital",
                        sections: [
                            {
                                title: "Hospitals",
                                rows: [
                                    { id: "hosp_cloudnine", title: "Cloudnine" },
                                    { id: "hosp_motherhood", title: "Motherhood" },
                                    { id: "hosp_apollo", title: "Apollo Cradle" },
                                    { id: "hosp_rainbow", title: "Rainbow" },
                                    { id: "hosp_aster", title: "Aster CMI" },
                                    { id: "hosp_manipal", title: "Manipal" },
                                    { id: "hosp_fortis", title: "Fortis" },
                                    { id: "hosp_others", title: "Others" },
                                ],
                            },
                        ],
                    },
                },
            }),
        });
    } catch (err) {
        console.error("sendHospitalListMessage failed:", err);
    }
}

// ── Send baby weight selection list ──────────────────────────────────────────

async function sendBabyWeightListMessage(to: string) {
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
                    body: { text: "What is your baby's current weight?" },
                    action: {
                        button: "Select Weight",
                        sections: [
                            {
                                title: "Weight Range",
                                rows: [
                                    { id: "wt_lt2", title: "Less than 2 kg" },
                                    { id: "wt_2to25", title: "2 – 2.5 kg" },
                                    { id: "wt_25to3", title: "2.5 – 3 kg" },
                                    { id: "wt_3to35", title: "3 – 3.5 kg" },
                                    { id: "wt_gt35", title: "More than 3.5 kg" },
                                ],
                            },
                        ],
                    },
                },
            }),
        });
    } catch (err) {
        console.error("sendBabyWeightListMessage failed:", err);
    }
}

// ── Send Japa day hours list (8 / 10 / 12 hrs) ───────────────────────────────

async function sendJapaHoursListMessage(to: string) {
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
                    body: { text: "How many hours of day care do you need?" },
                    action: {
                        button: "Select Hours",
                        sections: [
                            {
                                title: "Day Shift Options",
                                rows: [
                                    { id: "hours_8", title: "8 hours", description: "Choose from 3 time slots" },
                                    { id: "hours_10", title: "10 hours", description: "9 AM – 7 PM" },
                                    { id: "hours_12", title: "12 hours", description: "8 AM – 8 PM" },
                                ],
                            },
                            { title: "Navigation", rows: [{ id: "main_menu", title: "Main Menu" }] },
                        ],
                    },
                },
            }),
        });
    } catch (err) {
        console.error("sendJapaHoursListMessage failed:", err);
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
    baby_status?: string;
    location?: string;
    hospital?: string;
    baby_weight?: string;
    service?: string;
    shift?: string;
    japa_hours?: string;
    time_slot?: string;
    due_date?: string;
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
            hospital_name: session.hospital || null,
            current_weight: session.baby_weight || null,
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
    const rows: string[] = [];
    if (session.name)        rows.push(`Name: ${session.name}`);
    if (session.baby_status) rows.push(`Status: ${session.baby_status === "Expecting" ? "Expecting" : "Baby at Home"}`);
    if (session.location)    rows.push(`Location: ${session.location}`);
    if (session.hospital)    rows.push(`Hospital: ${session.hospital}`);
    if (session.baby_weight) rows.push(`Baby Weight: ${session.baby_weight}`);
    if (session.service)     rows.push(`Service: ${session.service}`);
    if (session.shift)       rows.push(`Shift: ${session.shift}`);
    if (session.time_slot)   rows.push(`Timing: ${session.time_slot}`);

    return [
        `✅ *Care Request Confirmed*`,
        ``,
        ...rows,
        ``,
        `Our care advisor will call you shortly.`,
        `Urgent? Call +91 93638 93639`,
    ].join("\n");
}

// ── Button / option constants ─────────────────────────────────────────────────

const BABY_STATUS_BUTTONS = [
    { id: "home", title: "Baby is home" },
    { id: "expecting", title: "Still expecting" },
    { id: "main_menu", title: "Main Menu" },
];

const SERVICE_BUTTONS = [
    { id: "nurse", title: "Certified Nurse" },
    { id: "japa", title: "Japa/Moba" },
    { id: "main_menu", title: "Main Menu" },
];

// Nurse gets day + night; Japa only gets day (no night care available)
const NURSE_SHIFT_BUTTONS = [
    { id: "day", title: "Day care" },
    { id: "night", title: "Night care" },
    { id: "main_menu", title: "Main Menu" },
];

const JAPA_SHIFT_BUTTONS = [
    { id: "day", title: "Day care" },
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
    if (t === "japa" || t === "postnatal caregiver") return "Japa/Moba";
    if (/^1$|certified.?nurse/.test(t)) return "Nurse";
    if (/^2$|postnatal|caregiver|moba/.test(t)) return "Japa/Moba";
    return "";
}

function matchShift(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "day" || t === "day care") return "Day";
    if (t === "night" || t === "night care") return "Night";
    if (/day.?care/.test(t)) return "Day";
    if (/night.?care/.test(t)) return "Night";
    return "";
}

function matchHospital(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "hosp_cloudnine" || /cloudnine/.test(t)) return "Cloudnine";
    if (t === "hosp_motherhood" || /motherhood/.test(t)) return "Motherhood";
    if (t === "hosp_apollo" || /apollo/.test(t)) return "Apollo Cradle";
    if (t === "hosp_rainbow" || /rainbow/.test(t)) return "Rainbow";
    if (t === "hosp_aster" || /aster/.test(t)) return "Aster CMI";
    if (t === "hosp_manipal" || /manipal/.test(t)) return "Manipal";
    if (t === "hosp_fortis" || /fortis/.test(t)) return "Fortis";
    if (t === "hosp_others" || t === "others" || t === "other") return "Others";
    return text.trim(); // accept free text as-is
}

function matchBabyWeight(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "wt_lt2" || /less.?than.?2|<\s*2/.test(t)) return "Less than 2 kg";
    if (t === "wt_2to25" || /^2\s*[-–]\s*2\.5/.test(t)) return "2 – 2.5 kg";
    if (t === "wt_25to3" || /^2\.5\s*[-–]\s*3/.test(t)) return "2.5 – 3 kg";
    if (t === "wt_3to35" || /^3\s*[-–]\s*3\.5/.test(t)) return "3 – 3.5 kg";
    if (t === "wt_gt35" || /more.?than.?3\.5|>\s*3\.5/.test(t)) return "More than 3.5 kg";
    return text.trim(); // accept free text as-is
}

function matchJapaHours(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "hours_8" || t === "8 hours" || /^8$|^8.?hr/.test(t)) return "8";
    if (t === "hours_10" || t === "10 hours" || /^10$|^10.?hr/.test(t)) return "10";
    if (t === "hours_12" || t === "12 hours" || /^12$|^12.?hr/.test(t)) return "12";
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
    const greeting = name ? `Welcome back, ${name}!` : "Welcome back!";
    const msg = `${greeting}\n\nIs your little one already home, or are you still expecting?`;
    await sendButtonMessage(waPhone, msg, BABY_STATUS_BUTTONS);
    await storeMessage(waPhone, "outbound", msg);
}

// After location is collected, route based on baby status
async function afterLocation(waPhone: string, session: Session, locationText: string) {
    if (session.baby_status === "Born") {
        await upsertSession(waPhone, { location: locationText, step: "ask_hospital" });
        await sendHospitalListMessage(waPhone);
        await storeMessage(waPhone, "outbound", "🏥 Which hospital welcomed your baby?");
    } else {
        // Expecting — ask due month before service
        await upsertSession(waPhone, { location: locationText, step: "ask_due_month" });
        await sendDueMonthListMessage(waPhone);
        await storeMessage(waPhone, "outbound", "When is your due date? Please select the month.");
    }
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
            baby_status: "", location: "", hospital: "", baby_weight: "",
            service: "", shift: "", japa_hours: "", time_slot: "", due_date: "",
        });
        await sendMainMenu(waPhone, name);
        return;
    }

    // ── New user or completed — restart ───────────────────────────────────────
    if (!session || session.step === "completed") {
        if (profileName) {
            await upsertSession(waPhone, { step: "ask_baby_status", name: profileName });
            const msg = `Hi ${profileName}! Welcome to Cradlewell — Bengaluru's trusted newborn and postnatal care experts.\n\nIs your little one already home, or are you still expecting?`;
            await sendButtonMessage(waPhone, msg, BABY_STATUS_BUTTONS);
            await storeMessage(waPhone, "outbound", msg);
        } else {
            await upsertSession(waPhone, { step: "ask_name" });
            const msg = "Hi! Welcome to Cradlewell — Bengaluru's trusted newborn and postnatal care experts.\n\nMay I know your name?";
            await sendMessage(waPhone, msg);
            await storeMessage(waPhone, "outbound", msg);
        }
        return;
    }

    // ── Collect name ──────────────────────────────────────────────────────────
    if (session.step === "ask_name") {
        const name = profileName || text;
        await upsertSession(waPhone, { name, step: "ask_baby_status" });
        const msg = `Nice to meet you, ${name}.\n\nIs your little one already home, or are you still expecting?`;
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
        // Both paths ask location first
        await upsertSession(waPhone, { baby_status: babyStatus, step: "ask_location" });
        const msg = "To check caregiver availability near you, please share your current location.";
        await sendLocationRequest(waPhone, msg);
        await storeMessage(waPhone, "outbound", msg);
        return;
    }

    // ── Collect location (text fallback — GPS share goes via handleLocation) ──
    if (session.step === "ask_location") {
        await afterLocation(waPhone, session, text);
        return;
    }

    // ── Collect due month (Expecting path only) ───────────────────────────────
    if (session.step === "ask_due_month") {
        const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        const match = text.match(/^due_(\d+)_(\d+)$/);
        const resolved = match ? `${MONTHS[parseInt(match[2]) - 1]} ${match[1]}` : text;
        await upsertSession(waPhone, { due_date: resolved, step: "ask_service" });
        const msg = "What kind of care are you looking for?";
        await sendButtonMessage(waPhone, msg, SERVICE_BUTTONS);
        await storeMessage(waPhone, "outbound", msg);
        return;
    }

    // ── Collect hospital name (Baby is Home path only) ────────────────────────
    if (session.step === "ask_hospital") {
        const hospital = matchHospital(text);
        await upsertSession(waPhone, { hospital, step: "ask_baby_weight" });
        await sendBabyWeightListMessage(waPhone);
        await storeMessage(waPhone, "outbound", "⚖️ What is your baby's current weight?");
        return;
    }

    // ── Collect baby weight ───────────────────────────────────────────────────
    if (session.step === "ask_baby_weight") {
        const baby_weight = matchBabyWeight(text);
        await upsertSession(waPhone, { baby_weight, step: "ask_service" });
        const msg = "What kind of care are you looking for?";
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
        const isJapa = service.includes("Japa");
        const msg = isJapa
            ? "Japa care is available as a *Day shift*. Would you like to proceed?"
            : "Would you need *Day care* or *Night care*?";
        await sendButtonMessage(waPhone, msg, isJapa ? JAPA_SHIFT_BUTTONS : NURSE_SHIFT_BUTTONS);
        await storeMessage(waPhone, "outbound", msg);
        return;
    }

    // ── Collect shift ─────────────────────────────────────────────────────────
    if (session.step === "ask_shift") {
        const shift = matchShift(text);
        if (!shift) {
            const isJapa = session.service?.includes("Japa");
            await sendButtonMessage(waPhone, "Please tap your preferred shift:", isJapa ? JAPA_SHIFT_BUTTONS : NURSE_SHIFT_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please tap your preferred shift:");
            return;
        }

        const isJapa = session.service?.includes("Japa");

        if (isJapa) {
            // Japa has no night care
            if (shift === "Night") {
                const msg = "Japa/MOBA caregivers are only available for day shifts. Please select *Day care* to continue.";
                await sendButtonMessage(waPhone, msg, JAPA_SHIFT_BUTTONS);
                await storeMessage(waPhone, "outbound", msg);
                return;
            }
            // Japa + Day → ask hours
            await upsertSession(waPhone, { shift, step: "ask_japa_hours" });
            await sendJapaHoursListMessage(waPhone);
            await storeMessage(waPhone, "outbound", "How many hours of day care do you need?");
        } else {
            // Nurse
            if (shift === "Night") {
                const timeSlot = "9 PM – 6 AM";
                await upsertSession(waPhone, { shift, time_slot: timeSlot, step: "completed" });
                const finalSession: Session = { ...session, shift, time_slot: timeSlot };
                await pushLeadToCRM(finalSession, waPhone);
                const summary = buildSummary(finalSession);
                await sendMessage(waPhone, summary);
                await storeMessage(waPhone, "outbound", summary);
            } else {
                // Nurse + Day → time slot
                await upsertSession(waPhone, { shift, step: "ask_time_slot" });
                await sendDaySlotListMessage(waPhone);
                await storeMessage(waPhone, "outbound", "Please select your preferred start time:");
            }
        }
        return;
    }

    // ── Collect Japa hours (8 / 10 / 12) ─────────────────────────────────────
    if (session.step === "ask_japa_hours") {
        const hours = matchJapaHours(text);
        if (!hours) {
            await sendJapaHoursListMessage(waPhone);
            await storeMessage(waPhone, "outbound", "Please select your preferred hours:");
            return;
        }

        if (hours === "8") {
            await upsertSession(waPhone, { japa_hours: hours, step: "ask_time_slot" });
            await sendDaySlotListMessage(waPhone);
            await storeMessage(waPhone, "outbound", "Please select your preferred start time:");
        } else {
            const timeSlot = hours === "10" ? "9 AM – 7 PM" : "8 AM – 8 PM";
            await upsertSession(waPhone, { japa_hours: hours, time_slot: timeSlot, step: "completed" });
            const finalSession: Session = { ...session, japa_hours: hours, time_slot: timeSlot };
            await pushLeadToCRM(finalSession, waPhone);
            const summary = buildSummary(finalSession);
            await sendMessage(waPhone, summary);
            await storeMessage(waPhone, "outbound", summary);
        }
        return;
    }

    // ── Collect time slot (Nurse day & Japa 8hr) ──────────────────────────────
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
    const msg = "Our care advisor will contact you very soon. For urgent help, call +91 93638 93639.";
    await sendMessage(waPhone, msg);
    await storeMessage(waPhone, "outbound", msg);
}

// ── Handle incoming GPS location share ───────────────────────────────────────

async function handleLocation(waPhone: string, latitude: number, longitude: number, name?: string, address?: string) {
    const session = await getSession(waPhone);
    if (!session || session.step !== "ask_location") return;

    const parts = [name, address].filter(Boolean);
    const locationText = parts.length > 0 ? parts.join(", ") : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    await afterLocation(waPhone, session, locationText);
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
