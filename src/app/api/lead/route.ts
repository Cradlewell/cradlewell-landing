import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LeadSchema = z.object({
    name: z.string().min(1),
    phone: z.string().min(6),
    email: z.string().optional().default(""),
    city: z.string().optional().default(""),
    service: z.string().optional().default(""),
    babyStage: z.string().optional().default(""),
    preferredStartDate: z.string().optional().default(""),
    summary: z.string().optional().default(""),
    pagePath: z.string().optional().default(""),
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

        const payload = {
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            city: lead.city,
            service: lead.service,
            babyStage: lead.babyStage,
            preferredStartDate: lead.preferredStartDate,
            pagePath: lead.pagePath,
            summary: lead.summary,
            submittedAt: (() => {
                const now = new Date();
                const dd = String(now.getDate()).padStart(2, "0");
                const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const mon = months[now.getMonth()];
                const yyyy = now.getFullYear();
                let h = now.getHours();
                const min = String(now.getMinutes()).padStart(2, "0");
                const ampm = h >= 12 ? "PM" : "AM";
                h = h % 12 || 12;
                return `${dd} ${mon} ${yyyy}, ${h}:${min} ${ampm}`;
            })(),
        };

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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Lead route error:", error);
        return NextResponse.json({ success: false, error: "Failed to save lead" }, { status: 500 });
    }
}