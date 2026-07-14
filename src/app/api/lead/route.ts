import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { supabase } from "@/lib/supabase-server";

function sha256(value: string): string {
    return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

async function sendFacebookCAPIEvent(events: object[]) {
    const pixelId = process.env.FACEBOOK_PIXEL_ID;
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!pixelId || !accessToken) return;
    try {
        await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: events, access_token: accessToken }),
        });
    } catch (err) {
        console.error("Facebook CAPI error:", err);
    }
}

const LeadSchema = z.object({
    name: z.string().min(1),
    phone: z.string().min(6),
    service: z.string().optional().default(""),
    babyStatus: z.string().optional().default(""),
    hospitalName: z.string().optional().default(""),
    birthStageStatus: z.string().optional().default(""),
    babyAge: z.string().optional().default(""),
    currentWeight: z.string().optional().default(""),
    address: z.string().optional().default(""),
    shiftType: z.string().optional().default(""),
    shiftHours: z.string().optional().default(""),
    shiftTime: z.string().optional().default(""),
    careStartDate: z.string().optional().default(""),
    serviceDays: z.string().optional().default(""),
    pagePath: z.string().optional().default(""),
    source: z.string().optional().default("Website"),
    // legacy compat fields
    email: z.string().optional().default(""),
    summary: z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
    try {
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
        const phone = `91${lead.phone.replace(/\D/g, "")}`;
        const eventTime = Math.floor(now.getTime() / 1000);
        const userData = {
            ph: [sha256(phone)],
            fn: [sha256(lead.name.split(" ")[0])],
            ln: [sha256(lead.name.split(" ").slice(1).join(" ") || lead.name)],
        };
        const eventSourceUrl = "https://cradlewell.com/";
        await sendFacebookCAPIEvent([
            { event_name: "Schedule", event_time: eventTime, action_source: "website", event_source_url: eventSourceUrl, user_data: userData },
            { event_name: "Lead",     event_time: eventTime, action_source: "website", event_source_url: eventSourceUrl, user_data: userData },
        ]);

        // ── Write to Supabase CRM (secondary — never fail the form) ───────────
        // Normalize the phone to the last 10 digits so it matches WhatsApp-sourced
        // leads, and upsert on it so one number = one record (no duplicates).
        const dbPhone = lead.phone.replace(/\D/g, "").slice(-10);
        try {
            const { data: matches } = await supabase
                .from("leads")
                .select("id")
                .eq("phone", dbPhone)
                .order("created_at", { ascending: true })
                .limit(1);
            const existing = matches?.[0];

            if (existing) {
                // Fill in details from the form without clobbering an existing
                // record's identity (keep original source/stage/owner).
                const patch: Record<string, unknown> = { last_activity_at: now.toISOString() };
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
            } else {
                const { error } = await supabase.from("leads").insert({
                    id: crypto.randomUUID(),
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
                    await supabase.from("leads").update({ last_activity_at: now.toISOString() }).eq("phone", dbPhone);
                } else if (error) {
                    console.error("Supabase lead insert error:", error.message);
                }
            }
        } catch (err) {
            console.error("Supabase lead upsert failed:", err);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Lead route error:", error);
        return NextResponse.json({ success: false, error: "Failed to save lead" }, { status: 500 });
    }
}
