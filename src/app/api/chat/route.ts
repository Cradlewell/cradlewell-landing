import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CRADLEWELL_KNOWLEDGE } from "@/lib/cradlewell-knowledge";

const RequestSchema = z.object({
    messages: z.array(
        z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1),
        })
    ),
    pagePath: z.string().optional().default("/"),
    pageTitle: z.string().optional().default("Unknown Page"),
});

type ServiceType = "nurse" | "japa" | null;
type CareType = "day" | "night" | null;
type Duration = "8" | "10" | "12" | null;

interface FlowState {
    serviceType: ServiceType;
    careType: CareType;
    duration: Duration;
    timeSlot: string | null;
}

// ── Baby stage detection ──────────────────────────────────────────────────────

function isBabyStageConfirmed(messages: Array<{ role: string; content: string }>): boolean {
    const userText = messages.filter((m) => m.role === "user").map((m) => m.content.toLowerCase()).join(" ");

    if (/baby is home|expecting soon/i.test(userText)) return true;
    if (/\balready (home|arrived|here|born)\b/i.test(userText)) return true;
    if (/\b(baby|newborn|little one|she|he)\b.{0,30}\b(home|arrived|here|born|with us|came)\b/i.test(userText)) return true;
    if (/\b(just had|just delivered|gave birth|delivered|baby born)\b/i.test(userText)) return true;
    if (/\b(baby came|baby arrived|arrived home|home with baby|brought baby home)\b/i.test(userText)) return true;
    if (/\b(arrived|delivered|born|came home)\b/i.test(userText)) return true;
    if (/\b(expecting|pregnant|due date|due in|due next|weeks pregnant|months pregnant|trimester)\b/i.test(userText)) return true;

    // Single-word replies that clearly indicate baby stage
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content.trim().toLowerCase() ?? "";
    if (/^(home|already home|yes home|baby home|baby is home|she'?s? home|he'?s? home)$/.test(lastUser)) return true;
    if (/^(expecting|still expecting|yes expecting|pregnant|yes pregnant|due soon)$/.test(lastUser)) return true;

    return false;
}

// ── State machine helpers ─────────────────────────────────────────────────────

function detectServiceType(text: string): ServiceType {
    const t = text.toLowerCase();
    if (/\bnurse\b/.test(t)) return "nurse";
    if (/\bjapa\b|\bmoba\b|\bcaregiver\b|\bpostnatal caregiver\b/.test(t)) return "japa";
    return null;
}

function detectCareType(text: string): CareType {
    const t = text.toLowerCase();
    if (/\bnight\b/.test(t)) return "night";
    if (/\bday\b/.test(t)) return "day";
    return null;
}

function detectDuration(text: string): Duration {
    const t = text.toLowerCase();
    if (/\b12\b|\btwelve\b/.test(t)) return "12";
    if (/\b10\b|\bten\b/.test(t)) return "10";
    if (/\b8\b|\beight\b/.test(t)) return "8";
    return null;
}

function detectTimeSlot(text: string): string | null {
    const t = text.toLowerCase();
    if (/\b10\s*am\b|10am/.test(t)) return "10 AM–6 PM";
    if (/\b9\s*am\b|9am/.test(t)) return "9 AM–5 PM";
    if (/\b8\s*am\b|8am/.test(t)) return "8 AM–4 PM";
    return null;
}

function parseFlowState(messages: Array<{ role: string; content: string }>): FlowState {
    let serviceType: ServiceType = null;
    let careType: CareType = null;
    let duration: Duration = null;
    let timeSlot: string | null = null;

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role !== "user") continue;

        // Find the most recent assistant message before this user message
        const prevAssistant = messages.slice(0, i).reverse().find((m) => m.role === "assistant")?.content ?? "";

        // Service type: assistant asked nurse vs japa
        if (!serviceType && /nurse.*japa|japa.*nurse|certified nurse|postnatal caregiver/i.test(prevAssistant)) {
            const st = detectServiceType(msg.content);
            if (st) serviceType = st;
        }

        // Care type: assistant asked day vs night
        if (!careType && /day.*night|night.*day/i.test(prevAssistant)) {
            const ct = detectCareType(msg.content);
            if (ct) careType = ct;
        }

        // Duration: assistant offered duration options
        if (!duration && /8.*10.*12|8-hour|10-hour|12-hour|8 hrs|10 hrs|12 hrs|which suits|which works/i.test(prevAssistant)) {
            const d = detectDuration(msg.content);
            if (d) duration = d;
        }

        // Time slot: assistant asked for time slot
        if (!timeSlot && /8 am.*4 pm|9 am.*5 pm|which slot|which start time|which time/i.test(prevAssistant)) {
            const ts = detectTimeSlot(msg.content);
            if (ts) timeSlot = ts;
        }
    }

    return { serviceType, careType, duration, timeSlot };
}

function getFlowReply(state: FlowState): string {
    const { serviceType, careType, duration, timeSlot } = state;

    // Step 1: Ask service type
    if (!serviceType) {
        return "Certified Nurse or Postnatal Caregiver (Japa/MOBA)?";
    }

    // Step 2: Ask care type
    if (!careType) {
        return "Day care or night care?";
    }

    // Step 3+: Branch by service + care type
    if (serviceType === "nurse") {
        if (careType === "night") {
            // Fixed shift — go straight to lead form
            return "Our nurse night shift is 9 PM–6 AM (9 hrs). Let me connect you with our care team.\n[[COLLECT_LEAD]]";
        }
        if (careType === "day") {
            // Nurse day: all slots are 8 hrs, just ask which time
            if (!timeSlot) {
                return "Which slot works for you? 8 AM–4 PM, 9 AM–5 PM, or 10 AM–6 PM?";
            }
            return `${timeSlot} it is. Let me connect you with our care team.\n[[COLLECT_LEAD]]`;
        }
    }

    if (serviceType === "japa") {
        if (careType === "night") {
            if (!duration) {
                return "We offer 9 hrs (9 PM–6 AM) or 12 hrs (8 PM–8 AM). Which works for you?";
            }
            const shift = duration === "12" ? "8 PM–8 AM" : "9 PM–6 AM";
            return `${shift} it is. Let me connect you with our care team.\n[[COLLECT_LEAD]]`;
        }
        if (careType === "day") {
            if (!duration) {
                return "We have 8, 10, or 12-hour day shifts. Which suits you?";
            }
            if (duration === "8") {
                if (!timeSlot) {
                    return "Which slot works? 8 AM–4 PM, 9 AM–5 PM, or 10 AM–6 PM?";
                }
                return `${timeSlot} it is. Let me connect you with our care team.\n[[COLLECT_LEAD]]`;
            }
            if (duration === "10") {
                return "That's 9 AM–7 PM. Let me connect you with our care team.\n[[COLLECT_LEAD]]";
            }
            if (duration === "12") {
                return "That's 8 AM–8 PM. Let me connect you with our care team.\n[[COLLECT_LEAD]]";
            }
        }
    }

    // Fallback: re-ask service type
    return "Certified Nurse or Postnatal Caregiver (Japa/MOBA)?";
}

// ── Is this an informational question? ───────────────────────────────────────

function isInfoQuestion(text: string): boolean {
    return /\?/.test(text) || /\b(what|how|why|difference|explain|tell me|cost|price|pricing|meaning|which is better)\b/i.test(text);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { reply: "Server configuration error: ANTHROPIC_API_KEY is missing." },
                { status: 500 }
            );
        }

        const json = await req.json();
        const { messages } = RequestSchema.parse(json);

        const babyStageConfirmed = isBabyStageConfirmed(messages);
        const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

        // ── SERVICE FLOW: pure state machine ──────────────────────────────────
        if (babyStageConfirmed) {
            const state = parseFlowState(messages);
            const flowReply = getFlowReply(state);

            // If user asked an informational question, let Claude answer it,
            // then append the next flow step at the end
            if (isInfoQuestion(lastUserMsg) && !flowReply.includes("[[COLLECT_LEAD]]")) {
                const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
                const nextStep = flowReply;
                const completion = await client.messages.create({
                    model: "claude-sonnet-4-6",
                    max_tokens: 200,
                    temperature: 0.3,
                    system: `You are Aria from Cradlewell. Answer the user's question in 1–2 short plain text sentences. No markdown, no bullet points, no bold text.\n\nKnowledge:\n${CRADLEWELL_KNOWLEDGE}\n\nAfter answering, always end with: "${nextStep}"`,
                    messages: messages.map((m) => ({ role: m.role, content: m.content })),
                });
                const aiAnswer = (completion.content[0]?.type === "text" ? completion.content[0].text : "").trim();
                return NextResponse.json({ reply: aiAnswer || nextStep });
            }

            // Happy path: return deterministic reply
            return NextResponse.json({ reply: flowReply });
        }

        // ── GREETING MODE: Claude AI (before baby stage confirmed) ────────────
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const completion = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 128,
            temperature: 0.5,
            system: `You are Aria from Cradlewell — warm and caring.

RULES:
- Reply in 1 sentence only. Maximum 15 words.
- Never mention services, nurses, caregivers, pricing, or shifts.
- Ask ONCE: "Is your little one already home, or are you still expecting?"
- If already answered, do not repeat the question.
- No markdown, no bullet points.`,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        const reply =
            (completion.content[0]?.type === "text" ? completion.content[0].text : "").trim() ||
            "Is your little one already home, or are you still expecting?";

        return NextResponse.json({ reply });

    } catch (error) {
        console.error("Chat route error:", error);
        return NextResponse.json(
            { reply: "Sorry, something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
