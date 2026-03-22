export type ChatRole = "user" | "assistant";

export type ChatMessage = {
    role: ChatRole;
    content: string;
};

export function detectLeadIntent(text: string): boolean {
    const input = text.toLowerCase();

    // Only trigger when there is clear intent to book or get a callback
    // Do NOT include price/cost — price questions should qualify the service first, not jump to lead capture
    const patterns = [
        "book",
        "call me",
        "contact me",
        "callback",
        "call back",
        "availability",
        "when can",
        "want to start",
        "ready to start",
        "need a nurse",
        "hire",
        "urgent",
        "as soon as",
        "talk to someone",
        "speak to someone",
        "reach out",
    ];

    return patterns.some((pattern) => input.includes(pattern));
}

export function buildConversationSummary(messages: ChatMessage[]): string {
    return messages
        .slice(-8)
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n");
}