import { NextRequest, NextResponse } from "next/server";
import { supabase, isAuthed } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
    if (!isAuthed(req.cookies.get("crm_auth")?.value)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const phone = searchParams.get("phone");

    if (type === "contacts") {
        const [sessionsRes, messagesRes] = await Promise.all([
            supabase
                .from("whatsapp_sessions")
                .select("*")
                .order("updated_at", { ascending: false }),
            supabase
                .from("whatsapp_messages")
                .select("wa_phone, message, direction, created_at")
                .order("created_at", { ascending: false })
                .limit(1000),
        ]);

        const lastMsgMap: Record<string, { message: string; direction: string; created_at: string }> = {};
        for (const msg of messagesRes.data ?? []) {
            if (!lastMsgMap[msg.wa_phone]) {
                lastMsgMap[msg.wa_phone] = {
                    message: msg.message,
                    direction: msg.direction,
                    created_at: msg.created_at,
                };
            }
        }

        const contacts = (sessionsRes.data ?? []).map((s) => ({
            ...s,
            lastMessage: lastMsgMap[s.wa_phone] ?? null,
        }));

        return NextResponse.json({ contacts });
    }

    if (type === "messages" && phone) {
        const { data, error } = await supabase
            .from("whatsapp_messages")
            .select("*")
            .eq("wa_phone", phone)
            .order("created_at", { ascending: true });

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ messages: data ?? [] });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
