"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Search, RefreshCw, Send, UserCheck, Bot } from "lucide-react";

interface Contact {
    wa_phone: string;
    name?: string;
    step: string;
    baby_status?: string;
    service?: string;
    updated_at: string;
    agent_active?: boolean;
    lastMessage?: { message: string; direction: string; created_at: string } | null;
}

interface Message {
    id: string;
    wa_phone: string;
    direction: "inbound" | "outbound";
    message: string;
    created_at: string;
}

function fmtTime(iso: string) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).format(new Date(iso));
}

function fmtDateLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function fmtContactTime(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
        return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(d);
    }
    return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short" }).format(d);
}

function fmtWindowLeft(ms: number): string {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function stepLabel(step: string) {
    return step.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const PAYLOAD_LABELS: Record<string, string> = {
    home: "Baby is home",
    expecting: "Still expecting",
    main_menu: "Main Menu",
    nurse: "Certified Nurse",
    japa: "Japa/Moba",
    normal: "Normal",
    preterm: "Preterm/Early birth",
    trial: "3 Day Trial",
    days30: "30 Days",
    days60: "60 Days",
    day: "Day care",
    night: "Night care",
    age_7d: "0–7 days",
    age_4w: "1–4 weeks",
    age_3m: "1–3 months",
    age_3mp: "3+ months",
    wt_lt2: "Less than 2 kg",
    wt_2to25: "2 – 2.5 kg",
    wt_25to3: "2.5 – 3 kg",
    wt_3to35: "3 – 3.5 kg",
    wt_gt35: "More than 3.5 kg",
    hosp_cloudnine: "Cloudnine",
    hosp_motherhood: "Motherhood",
    hosp_apollo: "Apollo Cradle",
    hosp_rainbow: "Rainbow",
    hosp_aster: "Aster CMI",
    hosp_manipal: "Manipal",
    hosp_fortis: "Fortis",
    hosp_others: "Others",
    hours_8: "8 hours",
    hours_10: "10 hours",
    hours_12: "12 hours",
    slot_8: "8 AM – 4 PM",
    slot_9: "9 AM – 5 PM",
    slot_10: "10 AM – 6 PM",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function decodePayload(msg: string): string {
    if (PAYLOAD_LABELS[msg]) return PAYLOAD_LABELS[msg];
    const due = msg.match(/^due_(\d{4})_(\d{1,2})$/);
    if (due) return `${MONTHS[parseInt(due[2]) - 1] ?? ""} ${due[1]}`.trim();
    return msg;
}

function Avatar({ name, phone, size = 40 }: { name?: string; phone: string; size?: number }) {
    const letter = (name ?? phone).slice(0, 1).toUpperCase();
    return (
        <div style={{
            width: size, height: size, borderRadius: "50%",
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.38, fontWeight: 700, color: "#fff",
            flexShrink: 0,
        }}>
            {letter}
        </div>
    );
}

const MESSAGES_POLL_MS = 3000;
const CONTACTS_POLL_MS = 10000;
const WINDOW_MS        = 24 * 60 * 60 * 1000;

export default function WhatsAppPage() {
    const [contacts, setContacts]           = useState<Contact[]>([]);
    const [selected, setSelected]           = useState<string | null>(null);
    const [messages, setMessages]           = useState<Message[]>([]);
    const [search, setSearch]               = useState("");
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [live, setLive]                   = useState(false);
    const [replyText, setReplyText]         = useState("");
    const [sending, setSending]             = useState(false);
    const [now, setNow]                     = useState(() => Date.now());

    const bottomRef    = useRef<HTMLDivElement>(null);
    const msgCountRef  = useRef(0);
    const selectedRef  = useRef<string | null>(null);
    const inputRef     = useRef<HTMLTextAreaElement>(null);

    selectedRef.current = selected;

    // Tick every 10s to keep window countdown fresh
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 10_000);
        return () => clearInterval(id);
    }, []);

    // ── Contacts ──────────────────────────────────────────────────────────────
    const fetchContacts = useCallback(async (silent = false) => {
        if (!silent) setLoadingContacts(true);
        try {
            const res  = await fetch("/api/crm/whatsapp-chat?type=contacts");
            const data = await res.json();
            setContacts(data.contacts ?? []);
        } finally {
            if (!silent) setLoadingContacts(false);
        }
    }, []);

    useEffect(() => {
        fetchContacts();
        const id = setInterval(() => fetchContacts(true), CONTACTS_POLL_MS);
        return () => clearInterval(id);
    }, [fetchContacts]);

    // ── Messages ──────────────────────────────────────────────────────────────
    const fetchMessages = useCallback(async (phone: string, initial = false) => {
        if (initial) setLoadingMessages(true);
        try {
            const res      = await fetch(`/api/crm/whatsapp-chat?type=messages&phone=${encodeURIComponent(phone)}`);
            const data     = await res.json();
            const incoming: Message[] = data.messages ?? [];
            setMessages(prev => {
                if (!initial && prev.length === incoming.length) return prev;
                return incoming;
            });
        } finally {
            if (initial) setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        if (!selected) { setMessages([]); msgCountRef.current = 0; setLive(false); return; }
        msgCountRef.current = 0;
        fetchMessages(selected, true);
        setLive(true);
        const id = setInterval(() => {
            if (selectedRef.current) fetchMessages(selectedRef.current);
        }, MESSAGES_POLL_MS);
        return () => { clearInterval(id); setLive(false); };
    }, [selected, fetchMessages]);

    // Scroll to bottom only on new messages
    useEffect(() => {
        if (messages.length > msgCountRef.current) {
            msgCountRef.current = messages.length;
            bottomRef.current?.scrollIntoView({ behavior: messages.length <= 1 ? "instant" : "smooth" });
        }
    }, [messages]);

    // ── Window calculation ────────────────────────────────────────────────────
    const lastInbound   = [...messages].reverse().find(m => m.direction === "inbound");
    const windowMsLeft  = lastInbound ? Math.max(0, WINDOW_MS - (now - new Date(lastInbound.created_at).getTime())) : 0;
    const windowOpen    = windowMsLeft > 0;

    // ── Selected contact ──────────────────────────────────────────────────────
    const selectedContact = contacts.find(c => c.wa_phone === selected);
    const agentActive     = selectedContact?.agent_active ?? false;
    const isCompleted     = selectedContact?.step === "completed";

    // ── Takeover / handback ───────────────────────────────────────────────────
    async function handleTakeover() {
        if (!selected) return;
        await fetch("/api/crm/whatsapp-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "takeover", phone: selected }),
        });
        setContacts(prev => prev.map(c => c.wa_phone === selected ? { ...c, agent_active: true } : c));
        setTimeout(() => inputRef.current?.focus(), 50);
    }

    async function handleHandback() {
        if (!selected) return;
        await fetch("/api/crm/whatsapp-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "handback", phone: selected }),
        });
        setContacts(prev => prev.map(c => c.wa_phone === selected ? { ...c, agent_active: false } : c));
        setReplyText("");
    }

    // ── Send reply ────────────────────────────────────────────────────────────
    async function handleSend() {
        const text = replyText.trim();
        if (!text || !selected || !windowOpen || sending) return;
        setSending(true);
        try {
            const res = await fetch("/api/crm/whatsapp-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "send", phone: selected, message: text }),
            });
            if (res.ok) {
                setReplyText("");
                fetchMessages(selected, false);
            }
        } finally {
            setSending(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    const filtered = contacts.filter(c => {
        const q = search.toLowerCase();
        return !q || (c.name ?? "").toLowerCase().includes(q) || c.wa_phone.includes(q);
    });

    return (
        <div style={{
            display: "flex",
            height: "calc(100dvh - var(--crm-header-height))",
            margin: "-1.5rem",
            overflow: "hidden",
            background: "#f0f2f5",
        }}>
            {/* ── Left: Contact list ─────────────────────────────────────────── */}
            <div style={{
                width: 340,
                flexShrink: 0,
                background: "#fff",
                borderRight: "1px solid var(--crm-border)",
                display: "flex",
                flexDirection: "column",
            }}>
                <div style={{ padding: "1rem", borderBottom: "1px solid var(--crm-border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <MessageCircle size={20} color="#25D366" />
                            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--crm-text)" }}>
                                WhatsApp Chats
                            </h2>
                        </div>
                        <button
                            onClick={() => fetchContacts()}
                            title="Refresh"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--crm-text-muted)", padding: 4, borderRadius: 6, display: "flex" }}
                        >
                            <RefreshCw size={15} />
                        </button>
                    </div>
                    <div style={{ position: "relative" }}>
                        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--crm-text-muted)" }} />
                        <input
                            className="crm-input"
                            style={{ paddingLeft: 32, fontSize: "0.82rem" }}
                            placeholder="Search by name or phone…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--crm-text-muted)" }}>
                        {filtered.length} conversation{filtered.length !== 1 ? "s" : ""}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                    {loadingContacts ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "var(--crm-text-muted)", fontSize: "0.85rem" }}>
                            Loading conversations…
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "var(--crm-text-muted)", fontSize: "0.85rem" }}>
                            {search ? "No matches found" : "No WhatsApp conversations yet"}
                        </div>
                    ) : filtered.map(c => (
                        <button
                            key={c.wa_phone}
                            onClick={() => { setSelected(c.wa_phone); setReplyText(""); }}
                            style={{
                                width: "100%",
                                background: selected === c.wa_phone ? "#f0f9f4" : "transparent",
                                borderLeft: selected === c.wa_phone ? "3px solid #25D366" : "3px solid transparent",
                                border: "none",
                                borderBottom: "1px solid #f0f2f5",
                                padding: "0.75rem 1rem",
                                cursor: "pointer",
                                textAlign: "left",
                                display: "flex",
                                gap: "0.75rem",
                                alignItems: "flex-start",
                                transition: "background 0.1s",
                            }}
                        >
                            <Avatar name={c.name} phone={c.wa_phone} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
                                    <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--crm-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                                        {c.name || c.wa_phone.slice(-10)}
                                    </span>
                                    <span style={{ fontSize: "0.7rem", color: "var(--crm-text-muted)", whiteSpace: "nowrap", marginLeft: 4 }}>
                                        {c.lastMessage ? fmtContactTime(c.lastMessage.created_at) : ""}
                                    </span>
                                </div>
                                <div style={{ fontSize: "0.78rem", color: "var(--crm-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
                                    {c.lastMessage ? (
                                        <>
                                            {c.lastMessage.direction === "outbound" && (
                                                <span style={{ color: "#128C7E", fontWeight: 600 }}>
                                                    {c.agent_active ? "Agent: " : "Bot: "}
                                                </span>
                                            )}
                                            {(() => {
                                                const txt = c.lastMessage.direction === "inbound"
                                                    ? decodePayload(c.lastMessage.message)
                                                    : c.lastMessage.message;
                                                const flat = txt.replace(/\n/g, " ");
                                                return flat.slice(0, 55) + (flat.length > 55 ? "…" : "");
                                            })()}
                                        </>
                                    ) : (
                                        <span style={{ fontStyle: "italic" }}>No messages</span>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                    <span style={{
                                        fontSize: "0.65rem",
                                        background: "#EEF9F2",
                                        color: "#128C7E",
                                        borderRadius: 4,
                                        padding: "1px 6px",
                                        fontWeight: 600,
                                    }}>
                                        {stepLabel(c.step)}
                                    </span>
                                    {c.agent_active && (
                                        <span style={{
                                            fontSize: "0.65rem",
                                            background: "#FFF3CD",
                                            color: "#856404",
                                            borderRadius: 4,
                                            padding: "1px 6px",
                                            fontWeight: 600,
                                        }}>
                                            Agent
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Right: Chat window ─────────────────────────────────────────── */}
            {!selected ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#E9FBF0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <MessageCircle size={36} color="#25D366" strokeWidth={1.5} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--crm-text)" }}>WhatsApp Chat Viewer</p>
                        <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0", color: "var(--crm-text-muted)" }}>Select a conversation to view messages</p>
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                    {/* Chat header */}
                    <div style={{
                        padding: "0.75rem 1.25rem",
                        background: "#fff",
                        borderBottom: "1px solid var(--crm-border)",
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}>
                        <Avatar name={selectedContact?.name} phone={selected} size={38} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--crm-text)", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                {selectedContact?.name || selected.slice(-10)}
                                {live && !isCompleted && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.68rem", color: "#25D366", fontWeight: 500 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#25D366", display: "inline-block", animation: "crm-pulse 1.5s infinite" }} />
                                        Live
                                    </span>
                                )}
                                {/* 24hr window badge */}
                                {lastInbound && (
                                    windowOpen ? (
                                        <span style={{ fontSize: "0.68rem", background: "#E8F5E9", color: "#2E7D32", borderRadius: 99, padding: "1px 8px", fontWeight: 500 }}>
                                            Window open · {fmtWindowLeft(windowMsLeft)} left
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: "0.68rem", background: "#FEECEC", color: "#C62828", borderRadius: 99, padding: "1px 8px", fontWeight: 500 }}>
                                            Window closed
                                        </span>
                                    )
                                )}
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "var(--crm-text-muted)", marginTop: 1 }}>
                                {selected}
                                {selectedContact?.service && <span style={{ marginLeft: 8 }}>· {selectedContact.service}</span>}
                                <span style={{ marginLeft: 8 }}>· Step: {stepLabel(selectedContact?.step ?? "")}</span>
                            </div>
                        </div>

                        {/* Takeover / Hand back button */}
                        {agentActive ? (
                            <button
                                onClick={handleHandback}
                                title="Hand back to bot"
                                style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    background: "#FFF3CD", color: "#856404",
                                    border: "1px solid #FFDBA0",
                                    borderRadius: 8, padding: "5px 12px",
                                    fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                <Bot size={13} />
                                Hand Back to Bot
                            </button>
                        ) : (
                            <button
                                onClick={handleTakeover}
                                title="Take over conversation"
                                style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    background: "#E8F5E9", color: "#2E7D32",
                                    border: "1px solid #A5D6A7",
                                    borderRadius: 8, padding: "5px 12px",
                                    fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                <UserCheck size={13} />
                                Take Over
                            </button>
                        )}

                        <button
                            onClick={() => fetchMessages(selected, true)}
                            title="Refresh messages"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--crm-text-muted)", padding: 6, borderRadius: 6, display: "flex", flexShrink: 0 }}
                        >
                            <RefreshCw size={15} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "1rem 10%",
                        background: "#e5ddd5",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                    }}>
                        {loadingMessages ? (
                            <div style={{ textAlign: "center", color: "#555", fontSize: "0.85rem", padding: "2rem" }}>
                                Loading messages…
                            </div>
                        ) : messages.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#666", fontSize: "0.85rem", padding: "2rem" }}>
                                No messages found
                            </div>
                        ) : messages.map((msg, i) => {
                            const isOut   = msg.direction === "outbound";
                            const prevMsg = i > 0 ? messages[i - 1] : null;
                            const showDate = !prevMsg || fmtDateLabel(prevMsg.created_at) !== fmtDateLabel(msg.created_at);
                            return (
                                <div key={msg.id}>
                                    {showDate && (
                                        <div style={{ textAlign: "center", margin: "0.75rem 0 0.5rem" }}>
                                            <span style={{
                                                fontSize: "0.72rem",
                                                background: "rgba(255,255,255,0.85)",
                                                borderRadius: 99,
                                                padding: "3px 12px",
                                                color: "#555",
                                                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                            }}>
                                                {fmtDateLabel(msg.created_at)}
                                            </span>
                                        </div>
                                    )}
                                    <div style={{ display: "flex", justifyContent: isOut ? "flex-end" : "flex-start", marginBottom: 2 }}>
                                        <div style={{
                                            maxWidth: "68%",
                                            background: isOut ? "#dcf8c6" : "#fff",
                                            borderRadius: isOut ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                                            padding: "0.45rem 0.7rem 0.35rem",
                                            boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                                        }}>
                                            <div style={{ fontSize: "0.855rem", whiteSpace: "pre-wrap", lineHeight: 1.45, color: "#1a1a1a", wordBreak: "break-word" }}>
                                                {!isOut ? decodePayload(msg.message) : msg.message}
                                            </div>
                                            <div style={{ fontSize: "0.68rem", color: "#8a8a8a", textAlign: "right", marginTop: 2, lineHeight: 1 }}>
                                                {fmtTime(msg.created_at)}
                                                {isOut && <span style={{ marginLeft: 3, color: "#53bdeb" }}>✓✓</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    {/* Footer */}
                    {agentActive ? (
                        windowOpen ? (
                            /* Agent reply box */
                            <div style={{
                                padding: "0.75rem 1.25rem",
                                background: "#f0f2f5",
                                borderTop: "1px solid var(--crm-border)",
                                display: "flex",
                                gap: "0.75rem",
                                alignItems: "flex-end",
                            }}>
                                <textarea
                                    ref={inputRef}
                                    rows={1}
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                                    style={{
                                        flex: 1,
                                        resize: "none",
                                        border: "1px solid var(--crm-border)",
                                        borderRadius: 20,
                                        padding: "0.6rem 1rem",
                                        fontSize: "0.875rem",
                                        outline: "none",
                                        background: "#fff",
                                        maxHeight: 120,
                                        overflowY: "auto",
                                        lineHeight: 1.4,
                                        fontFamily: "inherit",
                                    }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!replyText.trim() || sending}
                                    style={{
                                        width: 42, height: 42,
                                        borderRadius: "50%",
                                        background: replyText.trim() && !sending ? "#25D366" : "#ccc",
                                        border: "none",
                                        cursor: replyText.trim() && !sending ? "pointer" : "not-allowed",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        flexShrink: 0,
                                        transition: "background 0.15s",
                                    }}
                                >
                                    <Send size={17} color="#fff" />
                                </button>
                            </div>
                        ) : (
                            /* Window closed — agent active but can't reply */
                            <div style={{ padding: "0.75rem 1.25rem", background: "#f0f2f5", borderTop: "1px solid var(--crm-border)" }}>
                                <div style={{
                                    background: "#FEECEC",
                                    borderRadius: 12,
                                    padding: "0.6rem 1rem",
                                    fontSize: "0.82rem",
                                    color: "#C62828",
                                    border: "1px solid #FFCDD2",
                                    display: "flex", alignItems: "center", gap: "0.5rem",
                                }}>
                                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C62828", flexShrink: 0, display: "inline-block" }} />
                                    24-hour window closed — cannot send messages until customer replies
                                </div>
                            </div>
                        )
                    ) : (
                        /* Bot is handling */
                        <div style={{ padding: "0.75rem 1.25rem", background: "#f0f2f5", borderTop: "1px solid var(--crm-border)" }}>
                            <div style={{
                                background: "#fff",
                                borderRadius: 24,
                                padding: "0.6rem 1rem",
                                fontSize: "0.85rem",
                                color: "var(--crm-text-muted)",
                                border: "1px solid var(--crm-border)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                            }}>
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#25D366", flexShrink: 0, display: "inline-block" }} />
                                Bot is handling this conversation — click <strong style={{ color: "var(--crm-text)", margin: "0 3px" }}>Take Over</strong> to reply manually
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
