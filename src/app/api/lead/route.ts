import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { supabase } from "@/lib/supabase-server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

function sha256(value: string): string {
    return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// Indian mobile in the digits-with-country-code form Meta expects. Take the last
// ten digits first: the raw input may already carry 91 or +91, and prefixing
// again produced 91919741759254, whose hash matched nobody.
function normalizePhoneForMeta(raw: string): string {
    return `91${raw.replace(/\D/g, "").slice(-10)}`;
}

async function sendFacebookCAPIEvent(events: object[]) {
    const pixelId = process.env.FACEBOOK_PIXEL_ID;
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!pixelId || !accessToken) {
        // Silence here means every server-side conversion is lost with no trace,
        // which is indistinguishable from the integration working.
        console.warn("[CAPI] FACEBOOK_PIXEL_ID or FACEBOOK_ACCESS_TOKEN missing — server events not sent");
        return;
    }
    try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: events,
                access_token: accessToken,
                // Set FACEBOOK_TEST_EVENT_CODE to watch events land in the Events
                // Manager test tool; unset in normal operation.
                ...(process.env.FACEBOOK_TEST_EVENT_CODE ? { test_event_code: process.env.FACEBOOK_TEST_EVENT_CODE } : {}),
            }),
        });
        // A rejected payload returns 200-with-error or 4xx and was previously
        // discarded, so an expired token looked exactly like success.
        if (!res.ok) {
            console.error("[CAPI] Meta rejected the events:", res.status, await res.text().catch(() => ""));
            return;
        }
        const json = await res.json().catch(() => null);
        if (json?.error) console.error("[CAPI] Meta returned an error:", json.error);
    } catch (err) {
        console.error("[CAPI] request failed:", err);
    }
}

// Stages a lead only reaches once it is out of play. A fresh website submission
// from the same number is a new enquiry, so these are reset to "New Lead";
// anything mid-pipeline is left untouched so a re-submission cannot undo a rep's
// work. "Closed Won" is deliberately absent — that record should stay won.
const DEAD_STAGES = ["Invalid Lead", "Closed Lost", "Not Responding"];

// Timeline entry for the CRM lead drawer. Best-effort: a failure here must never
// affect the lead write itself.
async function logActivity(leadId: string, type: "created" | "note", message: string, at: Date) {
    const { error } = await supabase.from("activity_logs").insert({
        id: crypto.randomUUID(),
        lead_id: leadId,
        type,
        message,
        at: at.toISOString(),
    });
    if (error) console.error("Supabase activity log error:", error.message);
}

// Every string is length-bounded so a crafted payload cannot be used to spray
// oversized values into the sheet/CRM or as a cheap memory-pressure vector.
const short = (max: number) => z.string().max(max).optional().default("");
const LeadSchema = z.object({
    name: z.string().min(1).max(120),
    phone: z.string().min(6).max(20),
    service: short(80),
    babyStatus: short(60),
    hospitalName: short(120),
    birthStageStatus: short(80),
    babyAge: short(60),
    currentWeight: short(40),
    address: short(500),
    shiftType: short(40),
    shiftHours: short(40),
    shiftTime: short(60),
    careStartDate: short(40),
    serviceDays: short(20),
    pagePath: short(300),
    source: z.string().max(60).optional().default("Website"),
    // Shared with the browser Pixel so Meta collapses the two reports of the
    // same conversion into one instead of counting it twice.
    eventId: short(100),
    // Click id read from the fbclid query param when the cookie is not yet set.
    fbc: short(255),
    // legacy compat fields
    email: short(200),
    summary: short(2000),
});

export async function POST(req: NextRequest) {
    try {
        // Throttle form spam per IP before doing any downstream work.
        const limited = rateLimit(`lead:${clientIp(req)}`, 20, 10 * 60_000);
        if (limited) return limited;

        const body = await req.json();
        const lead = LeadSchema.parse(body);

        const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
        if (!webhookUrl) {
            console.error("GOOGLE_SHEET_WEBHOOK_URL is not set");
            return NextResponse.json({ success: false, error: "Webhook not configured" }, { status: 500 });
        }

        // Compute date / time / day in IST
        const now = new Date();

        const lead_generated_date = new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(now);

        const lead_generated_time = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        }).format(now);

        const lead_generated_day = new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            weekday: "long",
        }).format(now);

        const payload = {
            name: lead.name,
            phone_number: lead.phone,
            lead_generated_date,
            lead_generated_time,
            lead_generated_day,
            service: lead.service,
            baby_born_or_expecting: lead.babyStatus,
            hospital_name: lead.hospitalName,
            baby_birth_stage_status: lead.birthStageStatus,
            baby_age: lead.babyAge,
            current_weight: lead.currentWeight,
            address: lead.address,
            shift_type: lead.shiftType,
            shift_hours: lead.shiftHours,
            shift_time: lead.shiftTime,
            care_start_date: lead.careStartDate,
            service_days: lead.serviceDays,
        };

        // ── Write to Supabase CRM (never fails the form) ──────────────────────
        // Runs ahead of the Google Sheets write on purpose: a webhook outage
        // returns 500 below, and while this block sat after that return every
        // lead submitted during the outage was missing from the CRM entirely.
        // Normalize the phone to the last 10 digits so it matches WhatsApp-sourced
        // leads, and upsert on it so one number = one record (no duplicates).
        const dbPhone = lead.phone.replace(/\D/g, "").slice(-10);
        try {
            const { data: matches } = await supabase
                .from("leads")
                .select("id, stage")
                .eq("phone", dbPhone)
                .order("created_at", { ascending: true })
                .limit(1);
            const existing = matches?.[0];

            if (existing) {
                // Fill in details from the form without clobbering an existing
                // record's identity (keep original source/owner).
                const patch: Record<string, unknown> = {
                    last_activity_at: now.toISOString(),
                    // A known number filling the form is a fresh enquiry, not a
                    // touch on the old record. Leaving lead_date at its original
                    // value kept the row sitting at its months-old position in the
                    // Leads list, which is indistinguishable from the submission
                    // never having reached the CRM.
                    lead_date: now.toISOString(),
                };
                // Bring a lead back from a dead stage. Active pipeline stages are
                // left alone so a re-submission cannot walk back a rep's work.
                if (DEAD_STAGES.includes(existing.stage)) patch.stage = "New Lead";
                if (lead.name)             patch.name = lead.name;
                if (lead.service)          patch.service_required = lead.service;
                if (lead.babyStatus)       patch.baby_status = lead.babyStatus;
                if (lead.hospitalName)     patch.hospital_name = lead.hospitalName;
                if (lead.birthStageStatus) patch.baby_birth_stage_status = lead.birthStageStatus;
                if (lead.babyAge)          patch.baby_age = lead.babyAge;
                if (lead.currentWeight)    patch.current_weight = lead.currentWeight;
                if (lead.address)          patch.address = lead.address;
                if (lead.shiftType)        patch.preferred_shift = lead.shiftType;
                if (lead.shiftHours)       patch.shift_hours_count = parseInt(lead.shiftHours) || null;
                if (lead.shiftTime)        patch.shift_time = lead.shiftTime;
                if (lead.careStartDate)    patch.care_start_date = lead.careStartDate;
                if (lead.serviceDays)      patch.service_days = parseInt(lead.serviceDays) || null;
                const { error } = await supabase.from("leads").update(patch).eq("id", existing.id);
                if (error) console.error("Supabase lead update error:", error.message);
                else await logActivity(existing.id, "note", `Website form submitted — ${lead.service || "enquiry"}`, now);
            } else {
                const newId = crypto.randomUUID();
                const { error } = await supabase.from("leads").insert({
                    id: newId,
                    name: lead.name,
                    phone: dbPhone,
                    whatsapp: dbPhone,
                    source: lead.source || "Website",
                    lead_date: now.toISOString(),
                    service_required: lead.service,
                    baby_status: lead.babyStatus || "Unknown",
                    hospital_name: lead.hospitalName || null,
                    baby_birth_stage_status: lead.birthStageStatus || null,
                    baby_age: lead.babyAge || null,
                    current_weight: lead.currentWeight || null,
                    address: lead.address || null,
                    preferred_shift: lead.shiftType || null,
                    shift_hours_count: lead.shiftHours ? parseInt(lead.shiftHours) || null : null,
                    shift_time: lead.shiftTime || null,
                    care_start_date: lead.careStartDate || null,
                    service_days: lead.serviceDays ? parseInt(lead.serviceDays) || null : null,
                    owner: "Unassigned",
                    stage: "New Lead",
                    temperature: "Cold",
                    last_activity_at: now.toISOString(),
                    created_at: now.toISOString(),
                });
                // Race safety: concurrent insert already created it → update instead.
                if (error?.code === "23505") {
                    await supabase
                        .from("leads")
                        .update({ last_activity_at: now.toISOString(), lead_date: now.toISOString() })
                        .eq("phone", dbPhone);
                } else if (error) {
                    console.error("Supabase lead insert error:", error.message);
                } else {
                    await logActivity(newId, "created", `Lead created from website form — ${lead.service || "enquiry"}`, now);
                }
            }
        } catch (err) {
            console.error("Supabase lead upsert failed:", err);
        }

        // ── Write to Google Sheets (primary) ──────────────────────────────────
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("Google Sheet webhook error:", text);
            return NextResponse.json({ success: false, error: text }, { status: 500 });
        }

        // ── Facebook Conversions API (server-side) ────────────────────────────
        const eventTime = Math.floor(now.getTime() / 1000);
        const nameParts = lead.name.trim().split(/\s+/);
        const lastName = nameParts.slice(1).join(" ");

        // The browser cookies Meta matches on. _fbp identifies the browser and
        // _fbc carries the ad click — together they are the strongest signals
        // available, and sending neither was capping match quality.
        const fbp = req.cookies.get("_fbp")?.value;
        const fbc = req.cookies.get("_fbc")?.value || lead.fbc || undefined;
        const forwardedFor = req.headers.get("x-forwarded-for");
        const clientIpAddr = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;

        const userData = {
            ph: [sha256(normalizePhoneForMeta(lead.phone))],
            fn: [sha256(nameParts[0] ?? "")],
            // Omit rather than repeating the first name when there is no surname —
            // a wrong hash is worse than an absent one.
            ...(lastName ? { ln: [sha256(lastName)] } : {}),
            ...(lead.email ? { em: [sha256(lead.email)] } : {}),
            ...(fbp ? { fbp } : {}),
            ...(fbc ? { fbc } : {}),
            ...(clientIpAddr ? { client_ip_address: clientIpAddr } : {}),
            ...(req.headers.get("user-agent") ? { client_user_agent: req.headers.get("user-agent") } : {}),
        };

        // Real converting page rather than a hardcoded home page, so attribution
        // can tell which landing page produced the lead.
        const origin = req.headers.get("origin") || "https://www.cradlewell.com";
        const eventSourceUrl = lead.pagePath ? `${origin}${lead.pagePath}` : origin;

        // Same event_id on both names is safe — Meta deduplicates on the
        // (event_name, event_id) pair, and each name is reported once per side.
        const dedupe = lead.eventId ? { event_id: lead.eventId } : {};
        await sendFacebookCAPIEvent([
            { event_name: "Schedule", event_time: eventTime, action_source: "website", event_source_url: eventSourceUrl, user_data: userData, ...dedupe },
            { event_name: "Lead",     event_time: eventTime, action_source: "website", event_source_url: eventSourceUrl, user_data: userData, ...dedupe },
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Lead route error:", error);
        return NextResponse.json({ success: false, error: "Failed to save lead" }, { status: 500 });
    }
}
