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

type ServiceType = "nurse" | "japa" | null;
type CareType = "day" | "night" | null;
type Duration = "8" | "9" | "10" | "12" | null;

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

    for (const m of messages.filter((m) => m.role === "user")) {
        const t = m.content.trim().toLowerCase();
        if (/^(home|already home|yes home|baby home|baby is home|she'?s? home|he'?s? home)$/.test(t)) return true;
        if (/^(expecting|still expecting|yes expecting|pregnant|yes pregnant|due soon)$/.test(t)) return true;
    }

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
    const t = text.toLowerCase().replace(/\s+/g, "");
    if (/12/.test(t) || /twelve/.test(t)) return "12";
    if (/10/.test(t) || /ten/.test(t)) return "10";
    if (/\b9\b|nine/.test(text.toLowerCase())) return "9";
    if (/8/.test(t) || /eight/.test(t)) return "8";
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
    let serviceType: ServiceType = null;
    let careType: CareType = null;
    let duration: Duration = null;
    let timeSlot: string | null = null;

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role !== "user") continue;

        const prevAssistant = messages.slice(0, i).reverse().find((m) => m.role === "assistant")?.content ?? "";

        if (!serviceType && /nurse.*japa|japa.*nurse|certified nurse|postnatal caregiver/i.test(prevAssistant)) {
            const st = detectServiceType(msg.content);
            if (st) serviceType = st;
        }

        if (!careType && /day.*night|night.*day/i.test(prevAssistant)) {
            const ct = detectCareType(msg.content);
            if (ct) careType = ct;
        }

        if (!duration && /8.*10.*12|8-hour|10-hour|12-hour|8 hrs|10 hrs|12 hrs|which suits|which works|9 hrs|9 pm|8 pm/i.test(prevAssistant)) {
            const d = detectDuration(msg.content);
            if (d) duration = d;
        }

        if (!timeSlot && /8 am.*4 pm|9 am.*5 pm|10 am.*6 pm|which slot|which start time|which time/i.test(prevAssistant)) {
            const ts = detectTimeSlot(msg.content);
            if (ts) timeSlot = ts;
        }
    }

    return { serviceType, careType, duration, timeSlot };
}

function getFlowReply(state: FlowState, isFirstServiceQuestion: boolean): string {
    const { serviceType, careType, duration, timeSlot } = state;
    const TIME_SLOT_OPTIONS = "[[OPTIONS:8 AM–4 PM|9 AM–5 PM|10 AM–6 PM]]";

    if (!serviceType) {
        const welcome = isFirstServiceQuestion ? "Lovely, we're here to help! 🌸 " : "";
        return `${welcome}Are you looking for a Certified Nurse or a Postnatal Caregiver (Japa/MOBA)?\n[[OPTIONS:Certified Nurse|Postnatal Caregiver (Japa)]]`;
    }

    if (!careType) {
        const label = serviceType === "nurse" ? "Certified Nurse" : "Japa/MOBA caregiver";
        return `Great, a ${label} it is! Would you need day care or night care?\n[[OPTIONS:Day care|Night care]]`;
    }

    if (serviceType === "nurse") {
        if (careType === "night") {
            return "Our nurse night shift is 9 PM–6 AM (9 hrs). Let me get you connected!\n[[COLLECT_LEAD]]";
        }
        if (careType === "day") {
            if (!timeSlot) return `Which time slot works for you?\n${TIME_SLOT_OPTIONS}`;
            return `${timeSlot} — noted! Let me connect you with our care team.\n[[COLLECT_LEAD]]`;
        }
    }

    if (serviceType === "japa") {
        if (careType === "night") {
            if (!duration) return "We have two night options — 9 hrs (9 PM–6 AM) or 12 hrs (8 PM–8 AM). Which works for you?\n[[OPTIONS:9 hrs (9 PM–6 AM)|12 hrs (8 PM–8 AM)]]";
            const shift = duration === "12" ? "8 PM–8 AM" : "9 PM–6 AM";
            return `${shift} — great choice! Let me connect you with our care team.\n[[COLLECT_LEAD]]`;
        }
        if (careType === "day") {
            if (!duration) return `We have 8, 10, or 12-hour day shifts. Which suits you best?\n[[OPTIONS:8 hours|10 hours|12 hours]]`;
            if (duration === "8") {
                if (!timeSlot) return `Which slot works best for you?\n${TIME_SLOT_OPTIONS}`;
                return `${timeSlot} — perfect! Let me connect you with our care team.\n[[COLLECT_LEAD]]`;
            }
            if (duration === "10") return "That's our 9 AM–7 PM shift. Let me connect you with our care team.\n[[COLLECT_LEAD]]";
            if (duration === "12") return "That's our 8 AM–8 PM shift. Let me connect you with our care team.\n[[COLLECT_LEAD]]";
        }
    }

    return `Are you looking for a Certified Nurse or a Postnatal Caregiver (Japa/MOBA)?\n[[OPTIONS:Certified Nurse|Postnatal Caregiver (Japa)]]`;
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
        return `At Cradlewell, we provide Certified Nurse care and Japa/MOBA postnatal caregiver services — trained professionals who support your baby and you around the clock. To find the right fit, ${BABY_Q}`;
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
        return `All our caregivers are background-verified, trained professionals with experience in newborn and postnatal care. You're in safe hands. ${BABY_Q}`;
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
            const isFirstServiceQuestion = !/nurse.*japa|japa.*nurse|certified nurse|postnatal caregiver|day.*night|night.*day|8.*10.*12|which slot|which start time/i.test(lastAssistantMsg);
            const flowReply = getFlowReply(state, isFirstServiceQuestion);
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
