import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase-server";

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

        // ── Write to Supabase CRM (secondary — never fail the form) ───────────
        try {
            const { error } = await supabase.from("leads").insert({
                id: crypto.randomUUID(),
                name: lead.name,
                phone: lead.phone,
                whatsapp: lead.phone,
                source: "Website",
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
            if (error) console.error("Supabase lead insert error:", error.message);
        } catch (err) {
            console.error("Supabase lead insert failed:", err);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Lead route error:", error);
        return NextResponse.json({ success: false, error: "Failed to save lead" }, { status: 500 });
    }
}
