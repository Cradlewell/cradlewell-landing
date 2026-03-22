"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

type LeadForm = {
    name: string;
    phone: string;
    email: string;
    city: string;
    service: string;
    babyStage: string;
    preferredStartDate: string;
};

const INITIAL_MESSAGE =
    "Hi, I'm Aria 🌸 So glad you reached out. Is your little one already home, or are you getting ready for delivery?";

function cleanReply(text: string) {
    return text
        .replace("\n[[COLLECT_LEAD]]", "")
        .replace("[[COLLECT_LEAD]]", "")
        .replace(/\[\[OPTIONS:[^\]]*\]\]/g, "")
        .trim();
}

function parseOptions(text: string): string[] {
    const match = text.match(/\[\[OPTIONS:([\s\S]*?)\]\]/);
    if (!match) return [];
    return match[1].split("|").map((o) => o.trim()).filter(Boolean);
}

const dotStyle = (delay: string): React.CSSProperties => ({
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#a0aec0",
    display: "inline-block",
    animation: "ariaTypingBounce 1.2s infinite ease-in-out",
    animationDelay: delay,
});

export default function AIChatWidget() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [hasAutoOpened, setHasAutoOpened] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: "assistant", content: INITIAL_MESSAGE },
    ]);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadSubmitting, setLeadSubmitting] = useState(false);
    const [leadSubmitted, setLeadSubmitted] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [leadForm, setLeadForm] = useState<LeadForm>({
        name: "",
        phone: "",
        email: "",
        city: "",
        service: "",
        babyStage: "",
        preferredStartDate: "",
    });

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!hasAutoOpened) {
                setIsOpen(true);
                setHasAutoOpened(true);
            }
        }, 20000);
        return () => clearTimeout(timer);
    }, [hasAutoOpened, pathname]);

    useEffect(() => {
        const handleExitIntent = (e: MouseEvent) => {
            if (e.clientY <= 0 && !hasAutoOpened) {
                setIsOpen(true);
                setHasAutoOpened(true);
            }
        };
        document.addEventListener("mouseleave", handleExitIntent);
        return () => document.removeEventListener("mouseleave", handleExitIntent);
    }, [hasAutoOpened]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading, showLeadForm, leadSubmitted]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    async function sendMessage(text: string) {
        const trimmed = text.trim();
        if (!trimmed || loading) return;

        const nextMessages: ChatMessage[] = [
            ...messages,
            { role: "user", content: trimmed },
        ];

        setMessages(nextMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: nextMessages,
                    pagePath: pathname,
                    pageTitle: document.title,
                }),
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error("API did not return valid JSON");
            }

            const rawReply = data.reply || "I'm here to help.";
            const shouldCollectLead = rawReply.includes("[[COLLECT_LEAD]]");

            setMessages([...nextMessages, { role: "assistant", content: cleanReply(rawReply) }]);
            if (shouldCollectLead) setShowLeadForm(true);
        } catch {
            setMessages([
                ...nextMessages,
                {
                    role: "assistant",
                    content: "Sorry, I had a small hiccup. Could you try again in a moment?",
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    async function submitLead() {
        if (!leadForm.name.trim() || !leadForm.phone.trim()) {
            alert("Please enter your name and phone number.");
            return;
        }

        try {
            setLeadSubmitting(true);
            // Build a short one-line summary
            // Service type — user messages only (avoid assistant explanations skewing it)
            const userText = messages
                .filter((m) => m.role === "user")
                .map((m) => m.content.toLowerCase())
                .join(" ");

            // All messages — used for slot/hours fallback (user sometimes says "yes" instead of the time)
            const allText = messages
                .map((m) => m.content.toLowerCase())
                .join(" ");

            // Service type
            let serviceType = "Not specified";
            if (/caregiver|japa|moba|postnatal caregiver/.test(userText)) {
                serviceType = "Postnatal Caregiver (Japa/MOBA)";
            } else if (/\bnurse\b|certified nurse/.test(userText)) {
                serviceType = "Nurse";
            }

            // Shift type
            const shiftType = /night/.test(userText) ? "Night" : /day/.test(userText) ? "Day" : "Not specified";

            // Duration — check user text first, then all text
            const hoursMatch = userText.match(/\b(8|9|10|12)\s*(?:hour|hrs?)/) ||
                               allText.match(/\b(8|9|10|12)\s*(?:hour|hrs?)/);
            const hours = hoursMatch?.[1] || "";

            // Time slot — scan ALL messages, take the LAST match (most likely the confirmed slot)
            // Handles cases where user clicks "Yes, that works" and slot only appears in assistant message
            const slotPattern = /(\d{1,2}\s*(?:am|pm)\s*(?:to|–|-)\s*\d{1,2}\s*(?:am|pm))/gi;
            let lastSlotMatch: RegExpExecArray | null = null;
            let slotExec: RegExpExecArray | null;
            while ((slotExec = slotPattern.exec(allText)) !== null) {
                lastSlotMatch = slotExec;
            }
            const slot = lastSlotMatch
                ? lastSlotMatch[1].replace(/\b(am|pm)\b/gi, (m: string) => m.toUpperCase())
                : "";

            const summary = `Looking for ${serviceType} – ${shiftType} support${hours ? `, ${hours} hrs` : ""}${slot ? `, ${slot}` : ""}.`;

            const res = await fetch("/api/lead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...leadForm, pagePath: pathname, summary }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error("Lead submission failed");

            setLeadSubmitted(true);
            setShowLeadForm(false);
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "Perfect, got it! 🌸 One of our care advisors will call you very soon. You're in good hands.",
                },
            ]);
        } catch {
            alert("Could not submit. Please try again.");
        } finally {
            setLeadSubmitting(false);
        }
    }

    return (
        <>
            <style>{`
                @keyframes ariaTypingBounce {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                    30% { transform: translateY(-5px); opacity: 1; }
                }
                @keyframes ariaSlideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes ariaPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(99,136,255,0.4); }
                    50%       { box-shadow: 0 0 0 8px rgba(99,136,255,0); }
                }
                .aria-widget-open {
                    animation: ariaSlideUp 0.3s ease forwards;
                }
                .aria-send-btn:hover { opacity: 0.85; }
                .aria-close-btn:hover { opacity: 0.7; }
                .aria-msg-input:focus { outline: none; border-color: #6388FF !important; }
                .aria-lead-input:focus { outline: none; border-color: #6388FF !important; box-shadow: 0 0 0 3px rgba(99,136,255,0.12); }
            `}</style>

            <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 9999 }}>

                {/* Floating button */}
                {!isOpen && (
                    <button
                        onClick={() => setIsOpen(true)}
                        aria-label="Chat with Aria"
                        style={{
                            width: 60,
                            height: 60,
                            borderRadius: "50%",
                            border: "none",
                            background: "linear-gradient(135deg, #7B61FF, #4F46E5)",
                            color: "#fff",
                            cursor: "pointer",
                            boxShadow: "0 8px 32px rgba(99,136,255,0.45)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            animation: "ariaPulse 2.5s infinite",
                        }}
                    >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
                        </svg>
                    </button>
                )}

                {/* Chat window */}
                {isOpen && (
                    <div
                        className="aria-widget-open"
                        style={{
                            width: 370,
                            maxWidth: "calc(100vw - 24px)",
                            height: 580,
                            background: "#fff",
                            borderRadius: 24,
                            boxShadow: "0 24px 64px rgba(79,70,229,0.18), 0 4px 16px rgba(0,0,0,0.08)",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            border: "1px solid rgba(99,136,255,0.12)",
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: "16px 18px",
                                background: "linear-gradient(135deg, #7B61FF 0%, #4F46E5 100%)",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                            }}
                        >
                            {/* Avatar */}
                            <div style={{ position: "relative", flexShrink: 0 }}>
                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: "50%",
                                        background: "rgba(255,255,255,0.2)",
                                        border: "2px solid rgba(255,255,255,0.5)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 17,
                                        fontWeight: 700,
                                        color: "#fff",
                                        backdropFilter: "blur(4px)",
                                    }}
                                >
                                    A
                                </div>
                                {/* Online dot */}
                                <div
                                    style={{
                                        position: "absolute",
                                        bottom: 1,
                                        right: 1,
                                        width: 11,
                                        height: 11,
                                        borderRadius: "50%",
                                        background: "#4ade80",
                                        border: "2px solid #4F46E5",
                                    }}
                                />
                            </div>

                            {/* Name + status */}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", lineHeight: 1.2 }}>
                                    Aria
                                </div>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                                    Cradlewell Care Advisor · Online
                                </div>
                            </div>

                            {/* Close */}
                            <button
                                className="aria-close-btn"
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: "rgba(255,255,255,0.15)",
                                    border: "none",
                                    color: "#fff",
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    fontSize: 18,
                                    lineHeight: 1,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                                aria-label="Close chat"
                            >
                                ×
                            </button>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "16px 14px",
                                background: "#F5F6FA",
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                            }}
                        >
                            {messages.map((msg, index) => {
                                const options = msg.role === "assistant" ? parseOptions(msg.content) : [];
                                const isLast = index === messages.length - 1;
                                return (
                                    <div key={index}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-end",
                                                gap: 8,
                                                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                                            }}
                                        >
                                            {msg.role === "assistant" && (
                                                <div
                                                    style={{
                                                        width: 28, height: 28, borderRadius: "50%",
                                                        background: "linear-gradient(135deg, #7B61FF, #4F46E5)",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
                                                    }}
                                                >
                                                    A
                                                </div>
                                            )}
                                            <div
                                                style={{
                                                    maxWidth: "78%",
                                                    padding: "11px 14px",
                                                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                                    background: msg.role === "user" ? "linear-gradient(135deg, #7B61FF, #4F46E5)" : "#fff",
                                                    color: msg.role === "user" ? "#fff" : "#1a1a2e",
                                                    boxShadow: msg.role === "assistant" ? "0 2px 12px rgba(0,0,0,0.07)" : "0 2px 12px rgba(79,70,229,0.25)",
                                                    fontSize: 14,
                                                    lineHeight: 1.55,
                                                    whiteSpace: "pre-wrap",
                                                    letterSpacing: "0.01em",
                                                }}
                                            >
                                                {cleanReply(msg.content)}
                                            </div>
                                        </div>

                                        {options.length > 0 && isLast && !loading && (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, paddingLeft: 36 }}>
                                                {options.map((opt) => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => sendMessage(opt)}
                                                        style={{
                                                            padding: "8px 16px",
                                                            borderRadius: 20,
                                                            border: "1.5px solid #7B61FF",
                                                            background: "#fff",
                                                            color: "#4F46E5",
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                            letterSpacing: "0.01em",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            (e.currentTarget).style.background = "linear-gradient(135deg, #7B61FF, #4F46E5)";
                                                            (e.currentTarget).style.color = "#fff";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            (e.currentTarget).style.background = "#fff";
                                                            (e.currentTarget).style.color = "#4F46E5";
                                                        }}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Typing indicator */}
                            {loading && (
                                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                                    <div
                                        style={{
                                            width: 28, height: 28, borderRadius: "50%",
                                            background: "linear-gradient(135deg, #7B61FF, #4F46E5)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
                                        }}
                                    >
                                        A
                                    </div>
                                    <div
                                        style={{
                                            background: "#fff",
                                            borderRadius: "18px 18px 18px 4px",
                                            padding: "12px 16px",
                                            boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                                            display: "flex",
                                            gap: 5,
                                            alignItems: "center",
                                        }}
                                    >
                                        <span style={dotStyle("0s")} />
                                        <span style={dotStyle("0.2s")} />
                                        <span style={dotStyle("0.4s")} />
                                    </div>
                                </div>
                            )}

                            {/* Lead form */}
                            {showLeadForm && !leadSubmitted && (
                                <div
                                    style={{
                                        background: "#fff",
                                        borderRadius: 18,
                                        padding: "16px",
                                        boxShadow: "0 4px 24px rgba(79,70,229,0.1)",
                                        border: "1px solid rgba(99,136,255,0.18)",
                                        marginTop: 4,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                        <div
                                            style={{
                                                width: 36, height: 36, borderRadius: "50%",
                                                background: "linear-gradient(135deg, #7B61FF, #4F46E5)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 16,
                                            }}
                                        >
                                            🌸
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>
                                                Let's get you connected
                                            </div>
                                            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                                                A care advisor will call you personally
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {[
                                            { label: "Your name *", key: "name", placeholder: "e.g. Priya Sharma", type: "text" },
                                            { label: "Phone number *", key: "phone", placeholder: "e.g. 9876543210", type: "tel" },
                                            { label: "Email", key: "email", placeholder: "Optional", type: "email" },
                                            { label: "City", key: "city", placeholder: "e.g. Bangalore", type: "text" },
                                        ].map(({ label, key, placeholder, type }) => (
                                            <div key={key}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                                                    {label}
                                                </div>
                                                <input
                                                    className="aria-lead-input"
                                                    type={type}
                                                    placeholder={placeholder}
                                                    value={leadForm[key as keyof LeadForm]}
                                                    onFocus={() => setFocusedField(key)}
                                                    onBlur={() => setFocusedField(null)}
                                                    onChange={(e) =>
                                                        setLeadForm((prev) => ({ ...prev, [key]: e.target.value }))
                                                    }
                                                    style={{
                                                        width: "100%",
                                                        padding: "9px 12px",
                                                        fontSize: 13,
                                                        border: focusedField === key
                                                            ? "1.5px solid #7B61FF"
                                                            : "1.5px solid #e5e7eb",
                                                        borderRadius: 10,
                                                        boxSizing: "border-box",
                                                        color: "#1a1a2e",
                                                        background: "#fafafa",
                                                        transition: "border-color 0.2s",
                                                    }}
                                                />
                                            </div>
                                        ))}

                                        <button
                                            onClick={submitLead}
                                            disabled={leadSubmitting}
                                            style={{
                                                marginTop: 4,
                                                padding: "11px",
                                                background: leadSubmitting
                                                    ? "#c4b5fd"
                                                    : "linear-gradient(135deg, #7B61FF, #4F46E5)",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 12,
                                                fontWeight: 700,
                                                fontSize: 14,
                                                cursor: leadSubmitting ? "not-allowed" : "pointer",
                                                width: "100%",
                                                boxShadow: "0 4px 14px rgba(79,70,229,0.3)",
                                                letterSpacing: "0.02em",
                                            }}
                                        >
                                            {leadSubmitting ? "Connecting you..." : "Request free callback →"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input bar */}
                        <div
                            style={{
                                padding: "12px 14px",
                                background: "#fff",
                                borderTop: "1px solid #f0f0f5",
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                            }}
                        >
                            <input
                                ref={inputRef}
                                className="aria-msg-input"
                                value={input}
                                placeholder="Type a message..."
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
                                style={{
                                    flex: 1,
                                    padding: "10px 14px",
                                    fontSize: 14,
                                    border: "1.5px solid #e8e8f0",
                                    borderRadius: 50,
                                    background: "#f9f9fc",
                                    color: "#1a1a2e",
                                    transition: "border-color 0.2s",
                                }}
                            />
                            <button
                                className="aria-send-btn"
                                onClick={() => sendMessage(input)}
                                disabled={loading || !input.trim()}
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: "50%",
                                    border: "none",
                                    background: input.trim()
                                        ? "linear-gradient(135deg, #7B61FF, #4F46E5)"
                                        : "#e8e8f0",
                                    color: "#fff",
                                    cursor: input.trim() ? "pointer" : "default",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    transition: "background 0.2s",
                                    boxShadow: input.trim() ? "0 4px 14px rgba(79,70,229,0.3)" : "none",
                                }}
                                aria-label="Send message"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
