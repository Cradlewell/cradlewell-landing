"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Search, RefreshCw } from "lucide-react";

interface Contact {
    wa_phone: string;
    name?: string;
    step: string;
    baby_status?: string;
    service?: string;
    updated_at: string;
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

function stepLabel(step: string) {
    return step.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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

export default function WhatsAppPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [search, setSearch] = useState("");
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [live, setLive] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const msgCountRef = useRef(0);
    const selectedRef = useRef<string | null>(null);

    selectedRef.current = selected;

    // ── Contacts: initial load + poll every 10s ───────────────────────────────
    const fetchContacts = useCallback(async (silent = false) => {
        if (!silent) setLoadingContacts(true);
        try {
            const res = await fetch("/api/crm/whatsapp-chat?type=contacts");
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

    // ── Messages: load on select + poll every 3s ──────────────────────────────
    const fetchMessages = useCallback(async (phone: string, initial = false) => {
        if (initial) setLoadingMessages(true);
        try {
            const res = await fetch(`/api/crm/whatsapp-chat?type=messages&phone=${encodeURIComponent(phone)}`);
            const data = await res.json();
            const incoming: Message[] = data.messages ?? [];
            setMessages(prev => {
                // Only update if count changed (avoids unnecessary re-renders)
                if (!initial && prev.length === incoming.length) return prev;
                return incoming;
            });
        } finally {
            if (initial) setLoadingMessages(false);
        }
    }, []);

    // Reset + start polling when contact changes
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

    // Scroll to bottom only when new messages arrive
    useEffect(() => {
        if (messages.length > msgCountRef.current) {
            msgCountRef.current = messages.length;
            bottomRef.current?.scrollIntoView({ behavior: messages.length <= 1 ? "instant" : "smooth" });
        }
    }, [messages]);

    const filtered = contacts.filter(c => {
        const q = search.toLowerCase();
        return !q || (c.name ?? "").toLowerCase().includes(q) || c.wa_phone.includes(q);
    });

    const selectedContact = contacts.find(c => c.wa_phone === selected);

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
                            onClick={() => setSelected(c.wa_phone)}
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
                                                <span style={{ color: "#128C7E", fontWeight: 600 }}>Bot: </span>
                                            )}
                                            {c.lastMessage.message.replace(/\n/g, " ").slice(0, 55)}
                                            {c.lastMessage.message.length > 55 ? "…" : ""}
                                        </>
                                    ) : (
                                        <span style={{ fontStyle: "italic" }}>No messages</span>
                                    )}
                                </div>
                                <span style={{
                                    fontSize: "0.65rem",
                                    background: "#EEF9F2",
                                    color: "#128C7E",
                                    borderRadius: 4,
                                    padding: "1px 6px",
                                    fontWeight: 600,
                                    display: "inline-block",
                                }}>
                                    {stepLabel(c.step)}
                                </span>
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
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--crm-text)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {selectedContact?.name || selected.slice(-10)}
                                {live && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.68rem", color: "#25D366", fontWeight: 500 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#25D366", display: "inline-block", animation: "crm-pulse 1.5s infinite" }} />
                                        Live
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "var(--crm-text-muted)" }}>
                                {selected}
                                {selectedContact?.service && <span style={{ marginLeft: 8 }}>· {selectedContact.service}</span>}
                                {selectedContact?.baby_status && <span style={{ marginLeft: 8 }}>· {selectedContact.baby_status}</span>}
                                <span style={{ marginLeft: 8 }}>· Step: {stepLabel(selectedContact?.step ?? "")}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => fetchMessages(selected, true)}
                            title="Refresh messages"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--crm-text-muted)", padding: 6, borderRadius: 6, display: "flex" }}
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
                            const isOut = msg.direction === "outbound";
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
                                                {msg.message}
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
                    <div style={{
                        padding: "0.75rem 1.25rem",
                        background: "#f0f2f5",
                        borderTop: "1px solid var(--crm-border)",
                    }}>
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
                            Bot is handling this conversation automatically
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
