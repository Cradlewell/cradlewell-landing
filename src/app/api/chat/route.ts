import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

type CareType = "day" | "night" | null;

interface FlowState {
    careType: CareType;
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

    for (const m of messages.filter((m) => m.role === "user")) {
        const t = m.content.trim().toLowerCase();
        if (/^(home|already home|yes home|baby home|baby is home|she'?s? home|he'?s? home)$/.test(t)) return true;
        if (/^(expecting|still expecting|yes expecting|pregnant|yes pregnant|due soon)$/.test(t)) return true;
    }

    return false;
}

// ── State machine helpers ─────────────────────────────────────────────────────

function detectCareType(text: string): CareType {
    const t = text.toLowerCase();
    if (/\bnight\b/.test(t)) return "night";
    if (/\bday\b/.test(t)) return "day";
    return null;
}

function detectTimeSlot(text: string): string | null {
    const t = text.toLowerCase();
    if (/10\s*am|10am|10\s*(to|-)\s*6/.test(t)) return "10 AM–6 PM";
    if (/9\s*am|9am|9\s*(to|-)\s*5/.test(t)) return "9 AM–5 PM";
    if (/8\s*am|8am|8\s*(to|-)\s*4/.test(t)) return "8 AM–4 PM";
    return null;
}

function parseFlowState(messages: Array<{ role: string; content: string }>): FlowState {
    let careType: CareType = null;
    let timeSlot: string | null = null;

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role !== "user") continue;

        const prevAssistant = messages.slice(0, i).reverse().find((m) => m.role === "assistant")?.content ?? "";

        if (!careType && /day care or night care|day.*night|night.*day/i.test(prevAssistant)) {
            const ct = detectCareType(msg.content);
            if (ct) careType = ct;
        }

        if (!timeSlot && /8 am.*4 pm|9 am.*5 pm|10 am.*6 pm|which slot|which start time|which time/i.test(prevAssistant)) {
            const ts = detectTimeSlot(msg.content);
            if (ts) timeSlot = ts;
        }
    }

    return { careType, timeSlot };
}

function getFlowReply(state: FlowState, isFirstQuestion: boolean): string {
    const { careType, timeSlot } = state;
    const TIME_SLOT_OPTIONS = "[[OPTIONS:8 AM–4 PM|9 AM–5 PM|10 AM–6 PM]]";

    if (!careType) {
        const welcome = isFirstQuestion ? "Lovely, we're here to help! 🌸 " : "";
        return `${welcome}Our certified nurses are available for day care or night care — which would you like?\n[[OPTIONS:Day care|Night care]]`;
    }

    if (careType === "night") {
        return "Our nurse night shift is 9 PM–6 AM (9 hrs). Let me get you connected!\n[[COLLECT_LEAD]]";
    }

    // day care
    if (!timeSlot) return `Which time slot works for you?\n${TIME_SLOT_OPTIONS}`;
    return `${timeSlot} — noted! Let me connect you with our care team.\n[[COLLECT_LEAD]]`;
}

// ── Pre-flow greeting: deterministic scripted replies ─────────────────────────

function getGreetingReply(lastUserMsg: string): string {
    const t = lastUserMsg.toLowerCase().trim();
    const BABY_Q = "Is your little one already home, or are you still expecting?\n[[OPTIONS:Baby is home|Still expecting]]";

    // Pure greetings
    if (/^(hi+|hello|hey+|helo|namaste|good\s*(morning|evening|afternoon|night)|greetings)[\s!.,]*$/.test(t)) {
        return `Hi there! 🌸 Welcome to Cradlewell — Bengaluru's trusted newborn and postnatal care experts. ${BABY_Q}`;
    }

    // What do you do / services
    if (/what.*(do|offer|provide|serv)|serv|nurse|japa|moba|caregiver|nanny|postnatal|newborn care/.test(t)) {
        return `At Cradlewell, we provide Certified Nurse care — day or night — trained healthcare professionals who support your baby and you around the clock. To find the right fit, ${BABY_Q}`;
    }

    // Pricing / cost
    if (/price|cost|fee|charge|rate|how much|expensive|affordable|package|quote/.test(t)) {
        return `Our packages are tailored to your shift type and duration — very competitive for Bengaluru. To give you an accurate quote, ${BABY_Q}`;
    }

    // Availability / urgent
    if (/available|urgent|immediately|today|tomorrow|asap|soon/.test(t)) {
        return `We have care professionals available across Bengaluru and can usually arrange care quickly. ${BABY_Q}`;
    }

    // Need help / want service
    if (/help|need|want|looking|require|book|hire|get/.test(t)) {
        return `We're so glad you reached out! 🌸 Cradlewell is here to make this journey smoother for you. ${BABY_Q}`;
    }

    // Experience / trust
    if (/experience|trust|safe|background|trained|qualify|certif/.test(t)) {
        return `All our nurses are background-verified, trained healthcare professionals with experience in newborn and postnatal care. You're in safe hands. ${BABY_Q}`;
    }

    // Area / location
    if (/area|location|bengaluru|bangalore|city|where|cover/.test(t)) {
        return `We currently serve families across Bengaluru — Whitefield, Koramangala, HSR Layout, Indiranagar, Hebbal, and many more areas. ${BABY_Q}`;
    }

    // Default — steer to the flow
    return `Thanks for reaching out to Cradlewell! 🌸 We're here to make your postpartum journey as smooth as possible. ${BABY_Q}`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const json = await req.json();
        const { messages } = RequestSchema.parse(json);

        const babyStageConfirmed = isBabyStageConfirmed(messages);
        const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

        // ── SERVICE FLOW: pure state machine ──────────────────────────────────
        if (babyStageConfirmed) {
            const state = parseFlowState(messages);
            const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
            const isFirstQuestion = !/day care or night care|day.*night|night.*day|which time slot|which slot|which start time/i.test(lastAssistantMsg);
            const flowReply = getFlowReply(state, isFirstQuestion);
            return NextResponse.json({ reply: flowReply });
        }

        // ── GREETING MODE: fully scripted, no AI ─────────────────────────────
        const reply = getGreetingReply(lastUserMsg);
        return NextResponse.json({ reply });

    } catch (error) {
        console.error("Chat route error:", error);
        return NextResponse.json(
            { reply: "Sorry, something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
