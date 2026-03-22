import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
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

/** True once the user has told us their baby stage */
function isBabyStageConfirmed(messages: Array<{ role: string; content: string }>): boolean {
    const userText = messages
        .filter((m) => m.role === "user")
        .map((m) => m.content.toLowerCase())
        .join(" ");

    if (/baby is home|expecting soon/i.test(userText)) return true;
    if (/\b(baby|newborn|little one)\b.{0,25}\b(home|arrived|here|born|with us|came)\b/i.test(userText)) return true;
    if (/\b(just had|just delivered|gave birth|delivered|baby born|she was born|he was born)\b/i.test(userText)) return true;
    if (/\b(expecting|pregnant|due date|due in|due next|weeks pregnant|months pregnant|trimester)\b/i.test(userText)) return true;
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
        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { reply: "Server configuration error: ANTHROPIC_API_KEY is missing." },
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

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        // ── MODE 1: Conversational (baby stage not confirmed) ──
        const greetingPrompt = `
You are Aria from Cradlewell — a warm, caring friend to new and expecting mothers.

YOUR ONLY GOAL right now: respond empathetically to what the user said, then ask whether their baby has arrived or they are still expecting.

STRICT RULES — do not break these:
1. If the user just says hi/hello/hey: respond with a warm, personal greeting (1 sentence), then ask the baby stage question.
2. If the user shares feelings or worries: acknowledge in 1 warm sentence, then ask the baby stage question.
3. Never mention nurses, caregivers, services, pricing, shifts, or hours.
4. Keep your entire reply to 2 sentences maximum.
5. ALWAYS end with exactly this on a new line: [[OPTIONS:Baby is home 🏠|Expecting soon 🤰]]
6. Do not ask any other question.

Recent conversation:
${conversationSummary}
        `.trim();

        // ── MODE 2: Strict service flow (baby stage confirmed) ──
        const serviceFlowPrompt = `
You are Aria, Cradlewell's AI care advisor — warm, caring, and conversational.

⚠️ CRITICAL OUTPUT RULE — READ THIS FIRST:
Whenever you need to present choices to the user, you MUST output them using this exact tag format on its own line:
[[OPTIONS:Choice A|Choice B|Choice C]]
You must NEVER describe options in plain text without this tag. Never say "the following options:" or "you can choose from" without immediately following it with the [[OPTIONS:...]] tag on the very next line. The tag is what renders the buttons — without it, the user sees nothing.

STRICT CONVERSATION FLOW — follow these steps in order, one step per reply:

Step 1 — Service type
Say 1 warm sentence, then output exactly:
[[OPTIONS:Certified Nurse|Postnatal Caregiver (Japa/MOBA)]]
(If the user already stated the service type, skip to Step 2.)

Step 2 — Shift type
Say 1 warm sentence, then output exactly:
[[OPTIONS:Day Care|Night Care]]
(If the user already stated day/night, skip to Step 3.)

Step 3 — Shift duration (output the tag immediately after 1 sentence — no colon, no list):
For Nurse Night: state "our nurse night shift runs 9 PM–6 AM (9 hours)" and skip to Step 6.
For Nurse Day: say 1 sentence then output: [[OPTIONS:8 AM–4 PM|9 AM–5 PM|10 AM–6 PM]]
For Caregiver Night: say 1 sentence then output: [[OPTIONS:9 Hours (9 PM–6 AM)|12 Hours (8 PM–8 AM)]]
For Caregiver Day: say 1 sentence then output: [[OPTIONS:8 Hours|10 Hours|12 Hours]]
(If the user already stated a valid duration, treat it as selected and skip to Step 6.)

Step 4 — Unavailable timing only
ONLY if the user requested a timing NOT in the list above: suggest the nearest valid shift and ask "Would that work for you?"
If the timing IS valid, skip this step entirely.

Step 5 — Price questions
If the user asked about price, say: "Our advisor will walk you through everything on a quick call." Then continue to Step 6.

Step 6 — Lead capture
Say: "To connect you with our care team, could I get your full name and phone number?"
Then output on its own line: [[COLLECT_LEAD]]

RULES:
- NEVER ask for a name before Step 6.
- NEVER emit [[COLLECT_LEAD]] before Step 6.
- NEVER describe options in plain text without the [[OPTIONS:...]] tag — the tag is mandatory.
- If the user's message already answers the current step, skip that step and advance.
- Keep replies warm, short (2–3 sentences max), and human.
- Do not give medical advice or invent pricing/availability.

Page context: ${pageContext}

Approved business knowledge:
${CRADLEWELL_KNOWLEDGE}

Recent conversation:
${conversationSummary}

Lead capture hint:
${shouldCollectLead ? "High probability — move to Step 6 now." : "Only move to Step 6 when the shift has been confirmed."}
        `.trim();

        const systemPrompt = babyStageConfirmed ? serviceFlowPrompt : greetingPrompt;

        const completion = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            temperature: 0.4,
            system: systemPrompt,
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
        });

        const reply =
            (completion.content[0]?.type === "text" ? completion.content[0].text : "")?.trim() ||
            "I'm here to help. Is your little one already home, or are you expecting soon?\n[[OPTIONS:Baby is home 🏠|Expecting soon 🤰]]";

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
