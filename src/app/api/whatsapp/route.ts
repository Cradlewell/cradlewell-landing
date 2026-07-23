import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { createHmac, timingSafeEqual } from "crypto";

const PHONE_NUMBER_ID     = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN        = process.env.WHATSAPP_ACCESS_TOKEN!;
const VERIFY_TOKEN        = process.env.WHATSAPP_VERIFY_TOKEN!;
const FLOW_DUE_DATE_ID    = process.env.WHATSAPP_FLOW_DUE_DATE_ID!;
const FLOW_CARE_DATE_ID   = process.env.WHATSAPP_FLOW_CARE_DATE_ID!;

// ── Shared Meta API caller ────────────────────────────────────────────────────
// All send functions go through here so Meta error responses are always logged.

async function callMetaAPI(payload: object, label: string): Promise<boolean> {
    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            console.error(`[WA] ${label} failed (HTTP ${res.status}):`, detail);
            return false;
        }
        return true;
    } catch (err) {
        console.error(`[WA] ${label} failed:`, err);
        return false;
    }
}

// ── Send plain text message ───────────────────────────────────────────────────

async function sendMessage(to: string, text: string): Promise<boolean> {
    return callMetaAPI(
        { messaging_product: "whatsapp", to, type: "text", text: { body: text } },
        "sendMessage"
    );
}

// ── Send interactive button message (max 3 buttons, title max 20 chars) ───────

async function sendButtonMessage(to: string, body: string, buttons: Array<{ id: string; title: string }>): Promise<boolean> {
    return callMetaAPI({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: { text: body },
            action: { buttons: buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.title } })) },
        },
    }, "sendButtonMessage");
}

// ── Send native location request ──────────────────────────────────────────────

async function sendLocationRequest(to: string, bodyText: string): Promise<boolean> {
    return callMetaAPI({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "location_request_message",
            body: { text: bodyText },
            action: { name: "send_location" },
        },
    }, "sendLocationRequest");
}

// ── Send pre-approved template message (required outside the 24-hour window) ──
// Templates must be created and approved in Meta Business Manager first.
// languageCode: use "en" for English or "en_IN" for Indian English templates.

export async function sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = "en",
    components?: unknown[]
): Promise<boolean> {
    return callMetaAPI({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
            name: templateName,
            language: { code: languageCode },
            ...(components?.length ? { components } : {}),
        },
    }, "sendTemplateMessage");
}

// ── Send 8-hour day time slot list (Nurse day & Japa 8hr) ────────────────────

async function sendDaySlotListMessage(to: string): Promise<boolean> {
    return callMetaAPI({
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
    }, "sendDaySlotListMessage");
}

// ── Send WhatsApp Flow (date picker) ─────────────────────────────────────────

async function sendFlowMessage(to: string, flowId: string, bodyText: string, ctaText: string): Promise<boolean> {
    return callMetaAPI({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "flow",
            body: { text: bodyText },
            action: {
                name: "flow",
                parameters: {
                    flow_message_version: "3",
                    flow_action: "navigate",
                    flow_token: "unused",
                    flow_id: flowId,
                    flow_cta: ctaText,
                    flow_action_payload: { screen: "MAIN" },
                },
            },
        },
    }, "sendFlowMessage");
}

// Returns true if isoDate is strictly before today (server local midnight)
function isDateInPast(isoDate: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(isoDate + "T00:00:00") < today;
}

// Format ISO date "2026-06-14" → "14 June 2026" for display
function formatDateDisplay(isoDate: string): string {
    try {
        return new Date(isoDate + "T00:00:00").toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric",
        });
    } catch {
        return isoDate;
    }
}

// ── Send baby age list ────────────────────────────────────────────────────────

async function sendBabyAgeListMessage(to: string): Promise<boolean> {
    return callMetaAPI({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "list",
            body: { text: "How old is your baby?" },
            action: {
                button: "Select Age",
                sections: [{
                    title: "Baby Age",
                    rows: [
                        { id: "age_7d",  title: "0-7 days" },
                        { id: "age_4w",  title: "1-4 weeks" },
                        { id: "age_3m",  title: "1-3 months" },
                        { id: "age_3mp", title: "3+ months" },
                    ],
                }],
            },
        },
    }, "sendBabyAgeListMessage");
}

// ── Send hospital selection list ─────────────────────────────────────────────

async function sendHospitalListMessage(to: string): Promise<boolean> {
    return callMetaAPI({
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
    }, "sendHospitalListMessage");
}

// ── Send baby weight selection list ──────────────────────────────────────────

async function sendBabyWeightListMessage(to: string): Promise<boolean> {
    return callMetaAPI({
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
    }, "sendBabyWeightListMessage");
}

// ── Send Japa day hours list (8 / 10 / 12 hrs) ───────────────────────────────

async function sendJapaHoursListMessage(to: string): Promise<boolean> {
    return callMetaAPI({
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
                            { id: "hours_8", title: "8 hours" },
                            { id: "hours_10", title: "10 hours" },
                            { id: "hours_12", title: "12 hours" },
                        ],
                    },
                    { title: "Navigation", rows: [{ id: "main_menu", title: "Main Menu" }] },
                ],
            },
        },
    }, "sendJapaHoursListMessage");
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
    birth_stage?: string;
    baby_age?: string;
    baby_weight?: string;
    service?: string;
    shift?: string;
    japa_hours?: string;
    time_slot?: string;
    due_date?: string;
    care_start_date?: string;
    service_days?: string;
    agent_active?: boolean;
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
// Returns true on success, false on DB error (callers should abort if false).
// Pass `knownSession` from the caller to skip the redundant getSession() query.
async function upsertSession(
    waPhone: string,
    updates: Record<string, string>,
    knownSession?: Session | null
): Promise<boolean> {
    const now = new Date().toISOString();
    const existing = knownSession !== undefined ? knownSession : await getSession(waPhone);
    if (existing) {
        const { error } = await supabase
            .from("whatsapp_sessions")
            .update({ ...updates, updated_at: now })
            .eq("wa_phone", waPhone);
        if (error) { console.error("upsertSession update failed:", error); return false; }
        await syncLeadFromSession({ ...existing, ...updates }, waPhone);
    } else {
        const newSession = {
            id: crypto.randomUUID(),
            wa_phone: waPhone,
            step: "greeting",
            created_at: now,
            updated_at: now,
            ...updates,
        };
        const { error } = await supabase.from("whatsapp_sessions").insert(newSession);
        if (error) { console.error("upsertSession insert failed:", error); return false; }
        await syncLeadFromSession(newSession as unknown as Session, waPhone);
    }
    return true;
}

// ── Push lead to CRM ──────────────────────────────────────────────────────────

// Convert due date to ISO for date columns. Flow returns ISO directly; fallback handles "May 2025" text.
function parseDueDate(dueDate?: string): string | null {
    if (!dueDate) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return dueDate;
    const MONTHS_MAP: Record<string, string> = {
        January: "01", February: "02", March: "03", April: "04",
        May: "05", June: "06", July: "07", August: "08",
        September: "09", October: "10", November: "11", December: "12",
    };
    const m = dueDate.match(/^(\w+)\s+(\d{4})$/);
    if (m && MONTHS_MAP[m[1]]) return `${m[2]}-${MONTHS_MAP[m[1]]}-01`;
    return null;
}

// Derive shift hours from service/shift/japa_hours
function deriveShiftHours(session: Session): number | null {
    if (session.japa_hours) return parseInt(session.japa_hours) || null;
    if (session.shift === "Night") return 9; // 9 PM – 6 AM
    if (session.shift === "Day")   return 8; // all day slots are 8h
    return null;
}

// ── Sync session data → leads table (upsert on phone) ────────────────────────
// Creates the lead on first contact, then updates it as each step completes.

async function syncLeadFromSession(session: Partial<Session> & { wa_phone: string; step: string }, waPhone: string) {
    const phone = waPhone.replace(/\D/g, "").slice(-10);
    if (!phone) return;
    const now = new Date().toISOString();

    // Build the update patch (fields we always want to keep fresh from the bot).
    // whatsapp_stage tracks funnel position so drop-offs are visible in the CRM.
    const patch: Record<string, unknown> = { last_activity_at: now, whatsapp_stage: session.step };
    if (session.name)        patch.name = session.name;
    if (session.baby_status) patch.baby_status = session.baby_status;
    if (session.location)    patch.address = session.location;
    if (session.hospital)    patch.hospital_name = session.hospital;
    if (session.birth_stage) patch.baby_birth_stage_status = session.birth_stage;
    if (session.baby_age)    patch.baby_age = session.baby_age;
    if (session.baby_weight) patch.current_weight = session.baby_weight;
    if (session.service)     patch.service_required = session.service;
    if (session.shift)       patch.preferred_shift = session.shift;
    const hrs = deriveShiftHours(session as Session);
    if (hrs !== null)        patch.shift_hours_count = hrs;
    if (session.time_slot)   patch.shift_time = session.time_slot;
    const careDate = session.baby_status === "Born"
        ? (session.care_start_date || null)
        : parseDueDate(session.due_date);
    if (careDate)            patch.care_start_date = careDate;
    if (session.service_days) patch.service_days = parseInt(session.service_days) || null;

    try {
        // Find the existing lead for this number. Ordered + limit(1) (not
        // maybeSingle) so a pre-existing duplicate doesn't error us into
        // inserting yet another row.
        const { data: matches } = await supabase
            .from("leads")
            .select("id")
            .eq("phone", phone)
            .order("created_at", { ascending: true })
            .limit(1);
        const existing = matches?.[0];

        if (existing) {
            await supabase.from("leads").update(patch).eq("id", existing.id);
            return;
        }

        // New number → create the lead on this very first message so drop-offs
        // are captured. baby_status must never be null (NOT NULL column).
        const { error } = await supabase.from("leads").insert({
            id: crypto.randomUUID(),
            name: session.name || "WhatsApp User",
            phone,
            whatsapp: phone,
            source: "WhatsApp",
            lead_date: now,
            service_required: session.service || "",
            baby_status: session.baby_status || "",
            address: session.location || null,
            hospital_name: session.hospital || null,
            baby_birth_stage_status: session.birth_stage || null,
            baby_age: session.baby_age || null,
            current_weight: session.baby_weight || null,
            care_start_date: careDate,
            preferred_shift: session.shift || null,
            shift_hours_count: deriveShiftHours(session as Session),
            shift_time: session.time_slot || null,
            service_days: session.service_days ? parseInt(session.service_days) || null : null,
            owner: "Unassigned",
            stage: "New Lead",
            temperature: "Cold",
            whatsapp_stage: session.step,
            last_activity_at: now,
            created_at: now,
        });

        // Race safety: if another concurrent webhook inserted first, the unique
        // phone index rejects this one (23505) — fall back to updating that row.
        if (error?.code === "23505") {
            await supabase.from("leads").update(patch).eq("phone", phone);
        } else if (error) {
            console.error("syncLeadFromSession insert failed:", error);
        }
    } catch (err) {
        console.error("syncLeadFromSession failed:", err);
    }
}

// ── Build summary thank-you message ──────────────────────────────────────────

function buildSummary(session: Session): string {
    const rows: string[] = [];
    if (session.name)        rows.push(`Name: ${session.name}`);
    if (session.baby_status) rows.push(`Status: ${session.baby_status === "Expecting" ? "Expecting" : "Baby at Home"}`);
    if (session.location)     rows.push(`Location: ${session.location}`);
    if (session.baby_status === "Expecting" && session.due_date) rows.push(`Due Date: ${formatDateDisplay(session.due_date)}`);
    if (session.baby_status === "Born" && session.care_start_date) rows.push(`Care Start: ${formatDateDisplay(session.care_start_date)}`);
    if (session.hospital)     rows.push(`Hospital: ${session.hospital}`);
    if (session.birth_stage)  rows.push(`Birth Stage: ${session.birth_stage}`);
    if (session.baby_age)     rows.push(`Baby Age: ${session.baby_age}`);
    if (session.baby_weight)  rows.push(`Baby Weight: ${session.baby_weight}`);
    if (session.service)      rows.push(`Service: ${session.service}`);
    if (session.shift)        rows.push(`Shift: ${session.shift}`);
    if (session.time_slot)    rows.push(`Timing: ${session.time_slot}`);
    if (session.service_days) rows.push(`Support Days: ${session.service_days}`);

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
];

const SERVICE_BUTTONS = [
    { id: "nurse", title: "Certified Nurse" },
    { id: "japa", title: "Japa/Moba" },
    { id: "main_menu", title: "Main Menu" },
];

const BIRTH_STAGE_BUTTONS = [
    { id: "normal",  title: "Normal" },
    { id: "preterm", title: "Preterm/Early birth" },
];

const SERVICE_DAYS_BUTTONS = [
    { id: "trial",  title: "3 Day Trial" },
    { id: "days30", title: "30 Days" },
    { id: "days60", title: "60 Days" },
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

function matchBirthStage(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "normal"  || /^normal$/.test(t))                   return "Normal";
    if (t === "preterm" || /preterm|early.?birth/.test(t))        return "Preterm/Early birth";
    return "";
}

function matchBabyAge(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "age_7d"  || /0.?7.?day/.test(t))                  return "0-7 days";
    if (t === "age_4w"  || /1.?4.?week/.test(t))                 return "1-4 weeks";
    if (t === "age_3m"  || /1.?3.?month/.test(t))                return "1-3 months";
    if (t === "age_3mp" || /3\+|three.?plus|3.?plus/.test(t))    return "3+ months";
    return "";
}

function matchServiceDays(text: string): string {
    const t = text.trim().toLowerCase();
    if (t === "trial"  || /trial|3.?day/.test(t))                return "3 Day Trial";
    if (t === "days30" || /^30/.test(t))                         return "30 Days";
    if (t === "days60" || /^60/.test(t))                         return "60 Days";
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
        await upsertSession(waPhone, { location: locationText, step: "ask_hospital" }, session);
        await sendHospitalListMessage(waPhone);
        await storeMessage(waPhone, "outbound", "🏥 Which hospital welcomed your baby?");
    } else {
        // Expecting — ask due date via date picker flow
        await upsertSession(waPhone, { location: locationText, step: "ask_due_date" }, session);
        const msg = "When is your baby due?";
        await sendFlowMessage(waPhone, FLOW_DUE_DATE_ID, msg, "Pick Due Date");
        await storeMessage(waPhone, "outbound", msg);
    }
}

async function handleMessage(waPhone: string, incomingText: string, profileName?: string) {
    const text = incomingText.trim();
    const session = await getSession(waPhone);

    console.log(`[WA] phone=${waPhone} step=${session?.step ?? "NEW"} text="${text}"`);

    // ── Opt-out: STOP and variants — MUST run before any other check ─────────
    // Meta policy: opt-out must be honored immediately regardless of state.
    const STOP_WORDS = ["stop", "unsubscribe", "opt out", "optout", "don't contact", "do not contact"];
    if (STOP_WORDS.some(w => text.toLowerCase().includes(w))) {
        await upsertSession(waPhone, { step: "opted_out" }, session);
        // Also clear agent_active so the CRM shows opted-out state correctly
        await supabase.from("whatsapp_sessions").update({ agent_active: false }).eq("wa_phone", waPhone);
        const msg = "You've been unsubscribed from Cradlewell messages. We won't contact you again.\n\nReply *START* anytime to re-subscribe.";
        await sendMessage(waPhone, msg);
        await storeMessage(waPhone, "outbound", msg);
        return;
    }

    // ── Agent takeover — notify once, then stay silent ───────────────────────
    if (session?.agent_active) {
        if (session.step !== "agent_handoff") {
            await upsertSession(waPhone, { step: "agent_handoff" }, session);
            const msg = "You're now connected with our care advisor. They'll respond shortly.\n\nFor urgent help, call *+91 93638 93639*.";
            await sendMessage(waPhone, msg);
            await storeMessage(waPhone, "outbound", msg);
        }
        return;
    }

    // ── Opted-out users: request explicit re-consent ─────────────────────────
    if (session?.step === "opted_out") {
        if (/^(start|hi|hello|hey)$/i.test(text.trim())) {
            await upsertSession(waPhone, { step: "confirm_resubscribe" }, session);
            const msg = "You previously unsubscribed from Cradlewell messages.\n\nWould you like to receive care-related updates again?";
            await sendButtonMessage(waPhone, msg, [
                { id: "resubscribe_yes", title: "Yes, subscribe me" },
                { id: "resubscribe_no", title: "No thanks" },
            ]);
            await storeMessage(waPhone, "outbound", msg);
        }
        return;
    }

    // ── Main Menu — restart flow ──────────────────────────────────────────────
    if (isMainMenu(text)) {
        const name = session?.name || profileName;
        await upsertSession(waPhone, {
            step: "ask_baby_status",
            ...(name ? { name } : {}),
            baby_status: "", location: "", hospital: "", birth_stage: "", baby_age: "", baby_weight: "",
            service: "", shift: "", japa_hours: "", time_slot: "", due_date: "", care_start_date: "", service_days: "",
        }, session ?? null);
        await sendMainMenu(waPhone, name);
        return;
    }

    // ── Completed — flow is finished; stay silent so we never re-open the bot ─
    // The client has confirmed a care request ("✅ Care Request Confirmed"); a
    // human advisor takes over from here. STOP/opt-out and agent takeover are
    // handled above, and the Main Menu check above still lets them start a fresh
    // request explicitly by typing "menu" — but any other message gets no reply.
    if (session?.step === "completed") {
        return;
    }

    // ── New user — start intake ───────────────────────────────────────────────
    const CLEAR_FIELDS = {
        baby_status: "", location: "", hospital: "", birth_stage: "", baby_age: "", baby_weight: "",
        service: "", shift: "", japa_hours: "", time_slot: "", due_date: "", care_start_date: "", service_days: "",
    };

    // ── Confirm re-subscribe (explicit opt-in after previous opt-out) ─────────
    if (session?.step === "confirm_resubscribe") {
        const t = text.trim().toLowerCase();
        if (t === "resubscribe_yes" || /^yes/.test(t)) {
            const name = session.name || profileName;
            await upsertSession(waPhone, { step: "ask_baby_status", ...CLEAR_FIELDS, ...(name ? { name } : {}) }, session);
            const greet = name
                ? `Welcome back, ${name}! You're now re-subscribed to Cradlewell.`
                : `Welcome back! You're now re-subscribed to Cradlewell.`;
            await sendMessage(waPhone, greet);
            await storeMessage(waPhone, "outbound", greet);
            const msg = "Is your little one already home, or are you still expecting?";
            await sendButtonMessage(waPhone, msg, BABY_STATUS_BUTTONS);
            await storeMessage(waPhone, "outbound", msg);
        } else if (t === "resubscribe_no" || /^no/.test(t)) {
            await upsertSession(waPhone, { step: "opted_out" }, session);
            const msg = "No problem. You won't receive any messages from us.\n\nReply *START* anytime if you change your mind.";
            await sendMessage(waPhone, msg);
            await storeMessage(waPhone, "outbound", msg);
        } else {
            const msg = "Please tap one of the options below:";
            await sendButtonMessage(waPhone, msg, [
                { id: "resubscribe_yes", title: "Yes, subscribe me" },
                { id: "resubscribe_no", title: "No thanks" },
            ]);
            await storeMessage(waPhone, "outbound", msg);
        }
        return;
    }

    if (!session) {
        if (profileName) {
            await upsertSession(waPhone, { step: "ask_baby_status", name: profileName, ...CLEAR_FIELDS }, session ?? null);
            const greet = `Hi ${profileName}! Welcome to Cradlewell — Bengaluru's trusted newborn and postnatal care experts.`;
            await sendMessage(waPhone, greet);
            await storeMessage(waPhone, "outbound", greet);
            const msg = `We'll send you care-related updates via WhatsApp. Reply *STOP* anytime to unsubscribe.\n\nIs your little one already home, or are you still expecting?`;
            await sendButtonMessage(waPhone, msg, BABY_STATUS_BUTTONS);
            await storeMessage(waPhone, "outbound", msg);
        } else {
            await upsertSession(waPhone, { step: "ask_name", ...CLEAR_FIELDS }, session ?? null);
            const greet = "Hi! Welcome to Cradlewell — Bengaluru's trusted newborn and postnatal care experts.";
            await sendMessage(waPhone, greet);
            await storeMessage(waPhone, "outbound", greet);
            const msg = "We'll send you care-related updates via WhatsApp. Reply *STOP* anytime to unsubscribe.\n\nMay I know your name?";
            await sendMessage(waPhone, msg);
            await storeMessage(waPhone, "outbound", msg);
        }
        return;
    }

    // ── Collect name ──────────────────────────────────────────────────────────
    if (session.step === "ask_name") {
        const name = profileName || text;
        await upsertSession(waPhone, { name, step: "ask_baby_status" }, session);
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
        await upsertSession(waPhone, { baby_status: babyStatus, step: "ask_location" }, session);
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

    // ── Collect due date from flow (Expecting path only) ─────────────────────
    if (session.step === "ask_due_date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            const msg = "Please tap the button below to select your due date.";
            await sendFlowMessage(waPhone, FLOW_DUE_DATE_ID, msg, "Pick Due Date");
            await storeMessage(waPhone, "outbound", msg);
            return;
        }
        if (isDateInPast(text)) {
            await sendMessage(waPhone, "❌ That date has already passed. Please select a future due date.");
            await storeMessage(waPhone, "outbound", "❌ That date has already passed. Please select a future due date.");
            const retry = "When is your baby due?";
            await sendFlowMessage(waPhone, FLOW_DUE_DATE_ID, retry, "Pick Due Date");
            await storeMessage(waPhone, "outbound", retry);
            return;
        }
        await upsertSession(waPhone, { due_date: text, service: "Nurse", step: "ask_shift" }, session);
        const msg = "Would you need *Day care* or *Night care*?";
        await sendButtonMessage(waPhone, msg, NURSE_SHIFT_BUTTONS);
        await storeMessage(waPhone, "outbound", msg);
        return;
    }

    // ── Collect care start date from flow (Born path only) ───────────────────
    if (session.step === "ask_care_date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
            const msg = "Please tap the button below to select when you'd like care to start.";
            await sendFlowMessage(waPhone, FLOW_CARE_DATE_ID, msg, "Pick Start Date");
            await storeMessage(waPhone, "outbound", msg);
            return;
        }
        if (isDateInPast(text)) {
            await sendMessage(waPhone, "❌ That date has already passed. Please select today or a future date.");
            await storeMessage(waPhone, "outbound", "❌ That date has already passed. Please select today or a future date.");
            const retry = "When would you like care to start?";
            await sendFlowMessage(waPhone, FLOW_CARE_DATE_ID, retry, "Pick Start Date");
            await storeMessage(waPhone, "outbound", retry);
            return;
        }
        const saved = await upsertSession(waPhone, { care_start_date: text, step: "ask_service_days" }, session);
        if (!saved) return; // DB error — don't advance; user will retry
        const msg = "How many days of support would you like?";
        await sendButtonMessage(waPhone, msg, SERVICE_DAYS_BUTTONS);
        await storeMessage(waPhone, "outbound", msg);
        return;
    }

    // ── Collect hospital name (Baby is Home path only) ────────────────────────
    if (session.step === "ask_hospital") {
        const hospital = matchHospital(text);
        await upsertSession(waPhone, { hospital, step: "ask_birth_stage" }, session);
        const msg = "What was your baby's birth stage?";
        await sendButtonMessage(waPhone, msg, BIRTH_STAGE_BUTTONS);
        await storeMessage(waPhone, "outbound", msg);
        return;
    }

    // ── Collect birth stage ───────────────────────────────────────────────────
    if (session.step === "ask_birth_stage") {
        const birth_stage = matchBirthStage(text);
        if (!birth_stage) {
            await sendButtonMessage(waPhone, "Please select your baby's birth stage:", BIRTH_STAGE_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please select your baby's birth stage:");
            return;
        }
        await upsertSession(waPhone, { birth_stage, step: "ask_baby_age" }, session);
        await sendBabyAgeListMessage(waPhone);
        await storeMessage(waPhone, "outbound", "How old is your baby?");
        return;
    }

    // ── Collect baby age ──────────────────────────────────────────────────────
    if (session.step === "ask_baby_age") {
        const baby_age = matchBabyAge(text);
        if (!baby_age) {
            await sendBabyAgeListMessage(waPhone);
            await storeMessage(waPhone, "outbound", "Please select your baby's age:");
            return;
        }
        await upsertSession(waPhone, { baby_age, step: "ask_baby_weight" }, session);
        await sendBabyWeightListMessage(waPhone);
        await storeMessage(waPhone, "outbound", "⚖️ What is your baby's current weight?");
        return;
    }

    // ── Collect baby weight ───────────────────────────────────────────────────
    if (session.step === "ask_baby_weight") {
        const baby_weight = matchBabyWeight(text);
        await upsertSession(waPhone, { baby_weight, service: "Nurse", step: "ask_shift" }, session);
        const msg = "Would you need *Day care* or *Night care*?";
        await sendButtonMessage(waPhone, msg, NURSE_SHIFT_BUTTONS);
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
        const isJapa = service.includes("Japa");
        if (isJapa) {
            // Japa is day-only — skip shift question, go straight to hours
            await upsertSession(waPhone, { service, shift: "Day", step: "ask_japa_hours" }, session);
            await sendJapaHoursListMessage(waPhone);
            await storeMessage(waPhone, "outbound", "How many hours of day care do you need?");
        } else {
            await upsertSession(waPhone, { service, step: "ask_shift" }, session);
            const msg = "Would you need *Day care* or *Night care*?";
            await sendButtonMessage(waPhone, msg, NURSE_SHIFT_BUTTONS);
            await storeMessage(waPhone, "outbound", msg);
        }
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
            await upsertSession(waPhone, { shift, step: "ask_japa_hours" }, session);
            await sendJapaHoursListMessage(waPhone);
            await storeMessage(waPhone, "outbound", "How many hours of day care do you need?");
        } else {
            // Nurse
            if (shift === "Night") {
                const timeSlot = "9 PM – 6 AM";
                if (session.baby_status === "Born") {
                    await upsertSession(waPhone, { shift, time_slot: timeSlot, step: "ask_care_date" }, session);
                    const msg = "When would you like care to start?";
                    await sendFlowMessage(waPhone, FLOW_CARE_DATE_ID, msg, "Pick Start Date");
                    await storeMessage(waPhone, "outbound", msg);
                } else {
                    await upsertSession(waPhone, { shift, time_slot: timeSlot, step: "ask_service_days" }, session);
                    const msg = "How many days of support would you like?";
                    await sendButtonMessage(waPhone, msg, SERVICE_DAYS_BUTTONS);
                    await storeMessage(waPhone, "outbound", msg);
                }
            } else {
                // Nurse + Day → time slot
                await upsertSession(waPhone, { shift, step: "ask_time_slot" }, session);
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
            await upsertSession(waPhone, { japa_hours: hours, step: "ask_time_slot" }, session);
            await sendDaySlotListMessage(waPhone);
            await storeMessage(waPhone, "outbound", "Please select your preferred start time:");
        } else {
            const timeSlot = hours === "10" ? "9 AM – 7 PM" : "8 AM – 8 PM";
            if (session.baby_status === "Born") {
                await upsertSession(waPhone, { japa_hours: hours, time_slot: timeSlot, step: "ask_care_date" }, session);
                const msg = "When would you like care to start?";
                await sendFlowMessage(waPhone, FLOW_CARE_DATE_ID, msg, "Pick Start Date");
                await storeMessage(waPhone, "outbound", msg);
            } else {
                await upsertSession(waPhone, { japa_hours: hours, time_slot: timeSlot, step: "ask_service_days" }, session);
                const msg = "How many days of support would you like?";
                await sendButtonMessage(waPhone, msg, SERVICE_DAYS_BUTTONS);
                await storeMessage(waPhone, "outbound", msg);
            }
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
        if (session.baby_status === "Born") {
            await upsertSession(waPhone, { time_slot: timeSlot, step: "ask_care_date" }, session);
            const msg = "When would you like care to start?";
            await sendFlowMessage(waPhone, FLOW_CARE_DATE_ID, msg, "Pick Start Date");
            await storeMessage(waPhone, "outbound", msg);
        } else {
            await upsertSession(waPhone, { time_slot: timeSlot, step: "ask_service_days" }, session);
            const daysMsg = "How many days of support would you like?";
            await sendButtonMessage(waPhone, daysMsg, SERVICE_DAYS_BUTTONS);
            await storeMessage(waPhone, "outbound", daysMsg);
        }
        return;
    }

    // ── Collect service days ──────────────────────────────────────────────────
    if (session.step === "ask_service_days") {
        // Guard: Born users must have care_start_date before reaching this step
        if (session.baby_status === "Born" && !session.care_start_date) {
            await upsertSession(waPhone, { step: "ask_care_date" }, session);
            const msg = "When would you like care to start?";
            await sendFlowMessage(waPhone, FLOW_CARE_DATE_ID, msg, "Pick Start Date");
            await storeMessage(waPhone, "outbound", msg);
            return;
        }
        const service_days = matchServiceDays(text);
        if (!service_days) {
            await sendButtonMessage(waPhone, "Please select your preferred support duration:", SERVICE_DAYS_BUTTONS);
            await storeMessage(waPhone, "outbound", "Please select your preferred support duration:");
            return;
        }
        await upsertSession(waPhone, { service_days, step: "completed" }, session);
        const finalSession: Session = { ...session, service_days };
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

// ── Reverse geocode lat/lon → full address (OpenStreetMap Nominatim) ─────────

async function reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
            { headers: { "User-Agent": "CradlewellBot/1.0" } }
        );
        const data = await res.json();
        return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    } catch {
        return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }
}

// ── Handle incoming GPS location share ───────────────────────────────────────

async function handleLocation(waPhone: string, latitude: number, longitude: number, name?: string, address?: string) {
    const session = await getSession(waPhone);
    if (!session || session.step !== "ask_location") return;

    const locationText = (name || address)
        ? [name, address].filter(Boolean).join(", ")
        : await reverseGeocode(latitude, longitude);

    // Save coordinates to leads so Ops can do proximity ranking
    const phone = waPhone.replace(/\D/g, "").slice(-10);
    await supabase.from("leads").update({ home_lat: latitude, home_lng: longitude }).eq("phone", phone);

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
        const rawBody = await req.text();
        const sig = req.headers.get("x-hub-signature-256") ?? "";
        const appSecret = process.env.WHATSAPP_APP_SECRET;
        if (!appSecret) {
            console.error("[WA] WHATSAPP_APP_SECRET is not configured — rejecting webhook");
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
        const sigBuf = Buffer.from(sig.padEnd(expected.length));
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const body = JSON.parse(rawBody);

        // ── account_update: Meta policy violation / restriction alerts ────────
        const changeField = body.entry?.[0]?.changes?.[0]?.field;
        if (changeField === "account_update") {
            const value = body.entry[0].changes[0].value;
            console.error("[WA] ⚠️ account_update event from Meta:", JSON.stringify(value));
            // Store in Supabase for visibility
            await supabase.from("whatsapp_events").insert({
                id: crypto.randomUUID(),
                event_type: "account_update",
                payload: value,
                created_at: new Date().toISOString(),
            }).then(({ error }) => {
                if (error) console.error("[WA] Failed to store account_update:", error.message);
            });
            return NextResponse.json({ status: "ok" });
        }

        // ── Message status updates (sent / delivered / read / failed) ─────────
        // These carry Meta's `pricing` object, which tells us whether a message
        // was billable and its category — this is how the CRM shows if money is
        // being deducted for template / marketing sends.
        const statuses = body.entry?.[0]?.changes?.[0]?.value?.statuses;
        if (statuses?.length) {
            for (const st of statuses) {
                await supabase.from("whatsapp_events").insert({
                    id: crypto.randomUUID(),
                    event_type: "message_status",
                    payload: {
                        wamid: st.id ?? null,
                        status: st.status ?? null,
                        recipient_id: st.recipient_id ?? null,
                        billable: st.pricing?.billable ?? null,
                        category: st.pricing?.category ?? st.conversation?.origin?.type ?? null,
                        pricing_model: st.pricing?.pricing_model ?? null,
                        errors: st.errors ?? null,
                    },
                    created_at: new Date().toISOString(),
                }).then(({ error }) => {
                    if (error) console.error("[WA] Failed to store message_status:", error.message);
                });
            }
            return NextResponse.json({ status: "ok" });
        }

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
            const locationText =
                latitude != null && longitude != null
                    ? `📍 location:${latitude},${longitude}`
                    : "📍 location";
            const stored = await storeMessage(waPhone, "inbound", locationText, waMessageId);
            if (!stored) {
                console.log(`[WA] duplicate location skipped: ${waMessageId}`);
                return NextResponse.json({ status: "ok" });
            }
            await handleLocation(waPhone, latitude, longitude, name, address);
            return NextResponse.json({ status: "ok" });
        }

        // ── Extract text from message, button tap, or list selection ──────────
        let text: string | null = null;       // ID used for bot logic
        let displayText: string | null = null; // Human-readable label stored in DB
        if (message.type === "text") {
            text = message.text?.body ?? null;
            displayText = text;
        } else if (message.type === "interactive") {
            console.log(`[WA] interactive raw:`, JSON.stringify(message.interactive));
            if (message.interactive?.type === "button_reply") {
                const id = message.interactive.button_reply?.id;
                const title = message.interactive.button_reply?.title;
                console.log(`[WA] button_reply id="${id}" title="${title}"`);
                text = id ?? title ?? null;
                displayText = title ?? id ?? null;
            } else if (message.interactive?.type === "list_reply") {
                const id = message.interactive.list_reply?.id;
                const title = message.interactive.list_reply?.title;
                console.log(`[WA] list_reply id="${id}" title="${title}"`);
                text = id ?? title ?? null;
                displayText = title ?? id ?? null;
            } else if (message.interactive?.type === "nfm_reply") {
                const responseJson = message.interactive.nfm_reply?.response_json;
                console.log(`[WA] nfm_reply response_json="${responseJson}"`);
                if (responseJson) {
                    try {
                        const data = JSON.parse(responseJson);
                        const isoDate: string | undefined = data.due_date || data.care_start_date;
                        if (isoDate) {
                            text = isoDate;
                            displayText = formatDateDisplay(isoDate);
                        }
                    } catch {}
                }
            }
        }

        if (!text) {
            console.log(`[WA] no text extracted from message type=${message.type}`);
            return NextResponse.json({ status: "ok" });
        }

        // ── Atomic dedup: if wa_message_id already exists, skip ───────────────
        const stored = await storeMessage(waPhone, "inbound", displayText ?? text, waMessageId);
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
