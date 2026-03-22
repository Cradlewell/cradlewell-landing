import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { CRADLEWELL_KNOWLEDGE } from "@/lib/cradlewell-knowledge";
import { buildConversationSummary, detectLeadIntent } from "@/lib/chat-utils";

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

/** Returns true once the user has confirmed their baby stage */
function isBabyStageConfirmed(messages: Array<{ role: string; content: string }>): boolean {
    const userText = messages
        .filter((m) => m.role === "user")
        .map((m) => m.content.toLowerCase())
        .join(" ");

    // Quick-reply button values
    if (/baby is home|expecting soon/i.test(userText)) return true;

    // Natural language patterns
    if (/\b(baby|newborn|little one|lo)\b.{0,25}\b(home|arrived|here|born|with us|came)\b/i.test(userText)) return true;
    if (/\b(just had|just delivered|gave birth|delivered|baby born|she was born|he was born)\b/i.test(userText)) return true;
    if (/\b(expecting|pregnant|due date|due in|due next|weeks pregnant|months pregnant|trimester|delivery date)\b/i.test(userText)) return true;
    if (/\b(baby came|baby arrived|arrived home|home with baby|brought baby home)\b/i.test(userText)) return true;

    return false;
}

function getPageContext(pagePath: string, pageTitle: string) {
    const lower = `${pagePath} ${pageTitle}`.toLowerCase();
    if (lower.includes("price")) return "The user is likely comparing care plans or pricing.";
    if (lower.includes("faq")) return "The user is likely trying to understand trust, safety, or service details.";
    if (lower.includes("night")) return "The user is likely interested in overnight newborn care support.";
    if (lower.includes("day")) return "The user is likely interested in daytime newborn and mother support.";
    return "The user is browsing the website and may need help understanding Cradlewell services.";
}

export async function POST(req: NextRequest) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json(
                { reply: "Server configuration error: OPENAI_API_KEY is missing." },
                { status: 500 }
            );
        }

        const json = await req.json();
        const { messages, pagePath, pageTitle } = RequestSchema.parse(json);

        const lastUserMessage =
            [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

        const babyStageConfirmed = isBabyStageConfirmed(messages);
        const shouldCollectLead = detectLeadIntent(lastUserMessage);
        const conversationSummary = buildConversationSummary(messages);
        const pageContext = getPageContext(pagePath, pageTitle);

        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // ── MODE 1: Free conversational greeting (before baby stage is known) ──
        const greetingPrompt = `
You are Aria, Cradlewell's AI care advisor. You speak exactly like a warm, caring friend — never like a bot or a sales agent.

RIGHT NOW you are in GREETING MODE. Your only goal is to make the mother feel welcomed and gently find out whether her baby has arrived or she is still expecting.

RULES FOR GREETING MODE:
- If the user says hi/hello/hey or just a short greeting: respond with genuine warmth. Acknowledge them, say something supportive about this special phase of life, and then softly ask about their baby stage.
- If the user shares feelings (excitement, stress, exhaustion, worry): first empathise fully in 1-2 sentences, THEN gently ask about their baby stage.
- If the user asks about services, pricing, or nurses: acknowledge briefly but say "I'd love to help — let me first understand where you are in your journey 🌸" and then ask the baby stage question.
- Keep every reply to 2–3 sentences maximum.
- Always end your reply by showing: [[OPTIONS:Baby is home 🏠|Expecting soon 🤰]]
- NEVER ask about service type, shift, hours, or pricing in this mode.
- NEVER sound salesy or robotic.

Cradlewell context (for your awareness only, do not pitch yet):
${CRADLEWELL_KNOWLEDGE}

Recent conversation:
${conversationSummary}
        `.trim();

        // ── MODE 2: Strict service flow (after baby stage confirmed) ──
        const serviceFlowPrompt = `
You are Aria, Cradlewell's AI care advisor — warm, caring, and conversational.

STRICT CONVERSATION FLOW — follow these steps in order, one step per reply:

Step 1 — Service type
Ask: "Are you looking for a certified nurse or a trained postnatal caregiver?"
Always show: [[OPTIONS:Certified Nurse|Postnatal Caregiver (Japa/MOBA)]]
(If the user already stated the service type, skip to Step 2.)

Step 2 — Shift type
Ask: "Are you looking for day or night care?"
Always show: [[OPTIONS:Day Care|Night Care]]
(If the user already stated day/night, skip to Step 3.)

Step 3 — Shift duration
For Nurse Night: only option is 9 hours (9 PM–6 AM). State it and skip to Step 5.
For Nurse Day: show [[OPTIONS:8 Hours (8 AM–4 PM)|8 Hours (9 AM–5 PM)|8 Hours (10 AM–6 PM)]]
For Caregiver Night: show [[OPTIONS:9 Hours (9 PM – 6 AM)|12 Hours (8 PM – 8 AM)]]
For Caregiver Day: show [[OPTIONS:8 Hours|10 Hours|12 Hours]]
(If the user already stated a valid duration, treat it as selected and skip to Step 5.)

Step 4 — Confirm only for UNAVAILABLE timings
ONLY if the user requested a timing not in the knowledge base, suggest the nearest valid shift and ask "Would that work for you?"
If the timing IS valid, skip this step — go directly to Step 5.

Step 5 — Pricing / remaining questions
If the user asked about price at any point, say: "Our advisor will walk you through all the details on a quick call." Then move to Step 6.

Step 6 — Lead capture
Say: "To connect you with our care team, could I get your full name and phone number?"
End the reply with [[COLLECT_LEAD]] on its own line.

RULES:
- Never ask for a name before Step 6.
- Never emit [[COLLECT_LEAD]] before Step 6.
- If the user's message already answers the current step, skip that step and advance.
- When showing options always use [[OPTIONS:Choice A|Choice B]] — never bullet lists.
- Keep replies warm, short (2–3 sentences), and human.
- Do not give medical diagnosis, treatment, or emergency advice.
- Do not invent pricing, availability, or policies.
- If unsure, say a human care advisor will help.

Page context: ${pageContext}

Approved business knowledge:
${CRADLEWELL_KNOWLEDGE}

Recent conversation:
${conversationSummary}

Lead capture hint:
${shouldCollectLead ? "High probability — move to Step 6 now." : "Only move to Step 6 when the shift has been confirmed."}
        `.trim();

        const completion = await client.chat.completions.create({
            model: "gpt-4.1-mini",
            temperature: 0.5,
            messages: [
                {
                    role: "system",
                    content: babyStageConfirmed ? serviceFlowPrompt : greetingPrompt,
                },
                ...messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
            ],
        });

        const reply =
            completion.choices[0]?.message?.content?.trim() ||
            "I'm here to help you. Could you tell me a little more?";

        return NextResponse.json({ reply });
    } catch (error) {
        console.error("Chat route error:", error);
        return NextResponse.json(
            {
                reply: "Sorry, something went wrong. Please try again or share your number and our team will contact you.",
            },
            { status: 500 }
        );
    }
}
