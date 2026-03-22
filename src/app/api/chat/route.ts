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

    // Already home
    if (/baby is home|expecting soon/i.test(userText)) return true;
    if (/\balready (home|arrived|here|born)\b/i.test(userText)) return true;
    if (/\b(baby|newborn|little one|she|he)\b.{0,30}\b(home|arrived|here|born|with us|came)\b/i.test(userText)) return true;
    if (/\b(just had|just delivered|gave birth|delivered|baby born|she was born|he was born)\b/i.test(userText)) return true;
    if (/\b(baby came|baby arrived|arrived home|home with baby|brought baby home)\b/i.test(userText)) return true;
    if (/\b(arrived|delivered|born|came home)\b/i.test(userText)) return true;
    // Expecting
    if (/\b(expecting|pregnant|due date|due in|due next|weeks pregnant|months pregnant|trimester)\b/i.test(userText)) return true;

    // Single-word / short replies that clearly indicate baby stage
    // e.g. user says "home", "already home", "expecting", "pregnant" at any point
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content.trim().toLowerCase() ?? "";
    if (/^(home|already home|yes home|baby home|baby is home|she'?s? home|he'?s? home)$/.test(lastUserMsg)) return true;
    if (/^(expecting|still expecting|yes expecting|pregnant|yes pregnant|due soon)$/.test(lastUserMsg)) return true;

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
You are Aria from Cradlewell — warm and caring.

RULES:
- Reply in 1 sentence only. Maximum 15 words.
- Never mention services, nurses, caregivers, pricing, or shifts.
- Ask ONCE: "Is your little one already home, or are you still expecting?"
- If the user already answered this question, DO NOT ask it again. Move on warmly.
- Never repeat a question that was already asked and answered.

Recent conversation:
${conversationSummary}
        `.trim();

        // ── MODE 2: Strict service flow (baby stage confirmed) ──
        const serviceFlowPrompt = `
You are Aria from Cradlewell. Be warm and brief — max 1–2 short sentences per reply.
NEVER use markdown formatting like **bold**, *italic*, or bullet points. Plain text only.

CRITICAL: NEVER ask about baby stage again. That is already known. Move straight to service questions.

FLOW — one step per reply, skip steps already answered:

Step 1: Ask "Certified Nurse or Postnatal Caregiver (Japa/MOBA)?"
Step 2: Ask "Day care or night care?"
Step 3: Ask duration:
  - Nurse Night → "Our nurse night shift is 9 PM–6 AM (9 hrs). Good?" → go to Step 5.
  - Nurse Day → "We have 8-hr slots: 8–4, 9–5, or 10–6. Which works?" → go to Step 5.
  - Caregiver Night → "We offer 9 hrs (9 PM–6 AM) or 12 hrs (8 PM–8 AM). Which?" → go to Step 5.
  - Caregiver Day → "We have 8, 10, or 12-hour day shifts. Which suits you?"

Step 4 (Caregiver Day only — ask time slot after duration selected):
  - If user picked 8 hrs → "Which start time works? 8 AM–4 PM, 9 AM–5 PM, or 10 AM–6 PM?"
  - If user picked 10 hrs → shift is 9 AM–7 PM. Confirm and go to Step 5.
  - If user picked 12 hrs → shift is 8 AM–8 PM. Confirm and go to Step 5.
  (Skip this step for Nurse or Caregiver Night — they have no sub-slots to ask.)

Step 4b (price only): "Our advisor will share pricing on a quick call." → go to Step 5.
Step 5: Say "Great! Let me connect you with our care team." then output on a new line: [[COLLECT_LEAD]]
Do NOT ask for name or number in chat — the form handles that.

RULES:
- Never ask baby stage again — it is confirmed.
- NEVER ask for name or phone number in chat — the form collects that.
- Never emit [[COLLECT_LEAD]] before Step 5.
- Skip any step the user already answered.
- No medical advice. No invented pricing or availability.

Knowledge: ${CRADLEWELL_KNOWLEDGE}
Page: ${pageContext}
Conversation: ${conversationSummary}
${shouldCollectLead ? "→ Move to Step 5 now." : ""}
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
            "I'm here to help. Is your little one already home, or are you still expecting?";

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
