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

function getPageContext(pagePath: string, pageTitle: string) {
    const lower = `${pagePath} ${pageTitle}`.toLowerCase();

    if (lower.includes("price")) {
        return "The user is likely comparing care plans or pricing.";
    }

    if (lower.includes("faq")) {
        return "The user is likely trying to understand trust, safety, or service details.";
    }

    if (lower.includes("night")) {
        return "The user is likely interested in overnight newborn care support.";
    }

    if (lower.includes("day")) {
        return "The user is likely interested in daytime newborn and mother support.";
    }

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

        const shouldCollectLead = detectLeadIntent(lastUserMessage);
        const conversationSummary = buildConversationSummary(messages);
        const pageContext = getPageContext(pagePath, pageTitle);

        const client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const systemPrompt = `
You are Aria, Cradlewell's AI care advisor. You speak like a warm, caring friend — never robotic or salesy. Every reply should feel like it's coming from someone who genuinely cares about the mother's wellbeing.

STRICT CONVERSATION FLOW — follow these steps in order, one step per reply:

Step 0 — Gentle greeting & baby stage
The UI already shows Aria's opening: "Hi, I'm Aria 🌸 So glad you reached out. Is your little one already home, or are you getting ready for delivery?"

If the user's first message is ONLY a greeting (hi, hello, hey, hii, namaste, etc.) with no other information:
Reply warmly and personally. Example: "Hi there! 🌸 It's so lovely to hear from you. Bringing a baby home (or getting ready to) is such a special time — and also a lot to handle. I'm here to help make it a little easier. Is your little one already home, or are you expecting soon?"
Always show: [[OPTIONS:Baby is home 🏠|Expecting soon 🤰]]

If the user mentions baby is home: reply warmly like "Aww, congratulations! 🌸 The newborn days are precious — and we'd love to support you and your little one." Then go to Step 1.
If the user says expecting soon: reply warmly like "How exciting — you're almost there! 🌸 It's wonderful that you're planning ahead." Then go to Step 1.

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
(If the user already stated a duration that matches an available shift, treat it as selected and skip straight to Step 5.)

Step 4 — Confirm only for UNAVAILABLE timings
ONLY if the user requested a timing that does NOT appear in the knowledge base, suggest the nearest valid shift and ask "Would that work for you?"
If the selected timing IS valid, skip this step entirely — go directly to Step 5.

Step 5 — Pricing / any remaining questions
If the user asked about price at any point, say: "Our advisor will walk you through all the details on a quick call." Then move immediately to Step 6.

Step 6 — Lead capture
Say: "To connect you with our care team, could I get your full name and phone number?"
End the reply with [[COLLECT_LEAD]] on its own line.

RULES:
- Never ask for a name before Step 6.
- Never emit [[COLLECT_LEAD]] before Step 6.
- If the user's message already answers the current step's question, skip that step and advance.
- When showing options always use the format [[OPTIONS:Choice A|Choice B]] — never use bullet lists for choices.
- TONE: Always sound warm, caring, and human — like a supportive friend, not a sales bot. Never be dismissive of how a user opens the conversation.
- Keep replies short (2–3 sentences max) and conversational.
- Do not give medical diagnosis, treatment, or emergency advice.
- Do not invent pricing, availability, or policies.
- If unsure, say a human care advisor will help.

Page path: ${pagePath}
Page title: ${pageTitle}
Page context: ${pageContext}

Approved business knowledge:
${CRADLEWELL_KNOWLEDGE}

Recent conversation:
${conversationSummary}

Lead capture hint:
${shouldCollectLead ? "High probability lead capture should start now (Step 6)." : "Only move to Step 6 when the shift has been confirmed."}
    `.trim();

        const completion = await client.chat.completions.create({
            model: "gpt-4.1-mini",
            temperature: 0.4,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                ...messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                })),
            ],
        });

        const reply =
            completion.choices[0]?.message?.content?.trim() ||
            "I’m here to help you understand the right Cradlewell care option.";

        return NextResponse.json({ reply });
    } catch (error) {
        console.error("Chat route error:", error);

        return NextResponse.json(
            {
                reply:
                    "Sorry, something went wrong. Please try again or share your number and our team will contact you.",
            },
            { status: 500 }
        );
    }
}