"use client";
/* Cradlewell CRM — UI from the CradlewellCRM prototype, wired to Supabase via ./data.js */
import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import {
  Home, MessageSquare, ListChecks, CalendarDays, Kanban, BarChart3, Users, Flame, Clock,
  Calendar, IndianRupee, PauseCircle, Plus, MessageCircle, Phone, Settings, Search,
  ChevronDown, ChevronRight, Menu, X, Check, AlarmClock, CornerDownLeft, ArrowRight, UserPlus, AlertCircle, Table2, ListFilter, ArrowUpDown, Layers, Upload,
  SquareKanban, ArrowUp, ArrowDown, ExternalLink, AlertTriangle, CircleDot, Baby, Package, Megaphone, Building2, MapPin, Hash,
  EyeOff, Globe, Infinity as InfinityIcon, CalendarClock, UserRound, Zap, Weight, SunMoon, Timer, CircleX, CalendarCheck, CalendarPlus,
  HandHeart, Wallet, IdCard, CalendarRange, StickyNote, FileText, MoreHorizontal, Copy, ChevronLeft, Send, Paperclip, PhoneCall, Slash, ArrowRightLeft, Pencil, CheckCheck, PhoneMissed, Image as ImageIcon,
  ArrowLeft, CircleCheck, Info, Rows3, Video, PhoneOff, UserX, Sprout, List,
  LogOut, Bell, Flag, ChevronUp, CreditCard, Webhook, Workflow, Trash2, GripVertical, HeartHandshake, ArrowUpRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { loadCRM, enqueue, flush, hasPending, setSaveErrorHandler, diffById, diffTimelines, uiLeadToDb, uiFollowupToDb, pack } from "./data";

/* ==========================================================================
   LIVE DATA — leads, follow-ups, consultations and timelines are loaded from
   Supabase on start (see ./data.js). The queue on My day, today's schedule and
   this month's revenue are derived from that data in the root component.
   ========================================================================== */


const QUEUE_SECTIONS = [
  { id: "respond", title: "Respond now", icon: MessageCircle, tone: "amber" },
  { id: "new", title: "New leads, not yet contacted", icon: UserPlus, tone: "sky" },
  { id: "overdue", title: "Overdue follow-ups", icon: AlertCircle, tone: "red" },
  { id: "due", title: "Due today", icon: ListChecks, tone: "neutral", defaultCollapsed: true },
  { id: "payment", title: "Payment pending", icon: IndianRupee, tone: "green" },
];

// section: which queue section · stage: care-stage context · note: extra context line
// reason: plain "why it is here" line shown on My day · waitingMins: unanswered WhatsApp wait at page load · createdMins: lead age at page load
const QUEUE_ITEMS = []; // filled from live data (see buildQueueItems)

// Today's consultations, placed relative to page load so the demo always looks live
// Today's consultations — refilled from live consultations on every render of the app root
const SCHEDULE = [];

// Revenue this month (mock): care plans + expert services vs monthly target
// Revenue this month — recomputed from paid leads; target comes from Settings (revenueTarget)
const REVENUE_MONTH = { care: 0, experts: 0, target: 500000 };


// Placeholder activity history for the lead drawer, by section
const ACTIVITY_TEMPLATES = {
  respond: ["Lead messaged on WhatsApp", "Package overview sent", "Brochure sent on WhatsApp"],
  new: ["Lead created", "Auto-welcome sent on WhatsApp", "Brochure sent on WhatsApp"],
  overdue: ["Follow-up missed", "WhatsApp sent · no reply", "Discovery call · 6 min"],
  due: ["Follow-up scheduled for today", "Call · 9 min", "Brochure sent on WhatsApp"],
  payment: ["Payment link sent", "Consult completed", "Consult booked"],
  schedule: ["Slot booked for today", "Call · 4 min", "Lead created"],
};


// Stat deltas and the "My leads" filter options (mock)


/* ==========================================================================
   Design tokens
   ========================================================================== */

const ACCENT = "#B4436C";
const INK = "#1F1F1F";
const MUTED = "#6B6B6B";
const FAINT = "#707070";
const DIVIDER = "#EEEDEA";
const HOVER = "#F7F6F3";

// Status tags get a 6px coloured dot; package names are plain grey text.
const PACKAGES = new Set(["Essential", "Together", "Complete"]);
const TAG_DOTS = {
  New: "bg-brand",
  Interested: "bg-blue-500",
  "Not responding": "bg-red-500",
  Deferred: "bg-stone-400",
  "Price concern": "bg-amber-500",
  Converted: "bg-emerald-500",
  Lost: "bg-stone-300",
};

const OUTCOMES = ["Interested", "Not responding", "Deferred", "Price concern", "Converted", "Lost"];

/* ==========================================================================
   Utilities
   ========================================================================== */

const initials = (name) =>
  name.split(" ").map((p) => p[0]).join("").replace(".", "").slice(0, 2).toUpperCase();

const fmtTime = (d) => {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
};

const fmtDay = (d) =>
  `${d.toLocaleDateString("en-GB", { weekday: "short" })}, ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;

const fmtLongDate = (d) =>
  `${d.toLocaleDateString("en-GB", { weekday: "long" })}, ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;

const fmtAgo = (ms) => {
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs >= 48) return `${Math.floor(hrs / 24)} days ago`;
  return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
};

const greetingFor = (d) => {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const todayAt = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

// A slot counts as "past" 30 min after it starts; the first non-past slot is "next".
const isPastSlot = (e, now) => now - e.at > 30 * 60000;
const needsOutcome = (e, now, outcomes) => e.type === "Consult" && isPastSlot(e, now) && !outcomes[e.id];

const isTypingTarget = (el) =>
  el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

function useOutsideClick(ref, onOutside, active) {
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside, active]);
}

// Number keys 1–9 pick an option while a menu is open
function useDigitPicker(count, onPick, active = true) {
  useEffect(() => {
    if (!active) return;
    const h = (e) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= count) {
        e.preventDefault();
        onPick(n - 1);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [count, onPick, active]);
}

/* ==========================================================================
   Small building blocks
   ========================================================================== */

function Avatar({ name, size = "sm" }) {
  const dims = size === "lg" ? "h-10 w-10 text-sm" : "h-6 w-6 text-micro";
  return (
    <div className={`${dims} shrink-0 rounded-full bg-surface-active text-ink-3 flex items-center justify-center font-medium tracking-wide`}>
      {initials(name)}
    </div>
  );
}

function Tag({ label, className = "" }) {
  if (!label) return null;
  if (PACKAGES.has(label) || !TAG_DOTS[label]) {
    return <span className={`text-ink-3 whitespace-nowrap ${className}`}>{label}</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-ink-3 whitespace-nowrap ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TAG_DOTS[label]}`} />
      {label}
    </span>
  );
}

function Kbd({ children }) {
  return (
    <kbd className="inline-flex min-w-[16px] h-4 items-center justify-center rounded border border-line-control bg-white px-1 font-sans text-micro text-ink-4 tabular-nums">
      {children}
    </kbd>
  );
}

// Simple WhatsApp-style glyph: speech bubble with a handset inside
function WhatsAppIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 20.5l1.3-4.1A8.5 8.5 0 1 1 8 19.6z" />
      <path d="M9.2 8.6c-.3.9 0 2.3 1.1 3.6 1.2 1.4 2.8 2.2 3.9 2l.9-1-1.6-1.1-.8.6c-.6-.3-1.4-1-1.8-1.7l.6-.8-1-1.7z" fill="currentColor" strokeWidth="0.6" />
    </svg>
  );
}

function GhostIcon({ title, onClick, active, children }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors duration-150 ${
        active ? "bg-surface-active text-ink" : "text-ink-4 hover:bg-surface-active hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/* Buttons: one recipe for every rectangular button.
   btn(variant, size) → class string. variant: primary | secondary | ghost | danger; size: sm (28px) | md (32px) | lg (36px) */
const BTN_BASE = "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
const BTN_SIZE = { sm: "h-7 px-2.5 text-small", md: "h-8 px-3 text-body", lg: "h-9 px-3.5 text-body" };
const BTN_VARIANT = {
  primary: "bg-ink text-white hover:bg-black",
  secondary: "border border-line-control bg-white text-ink hover:border-line-strong hover:bg-surface-subtle",
  ghost: "text-ink-3 hover:bg-surface-hover hover:text-ink",
  danger: "bg-red-700 text-white hover:bg-red-800",
};
const btn = (variant = "secondary", size = "md") => `${BTN_BASE} ${BTN_SIZE[size]} ${BTN_VARIANT[variant]}`;

function SmallButton({ onClick, children, className = "" }) {
  return (
    <button onClick={onClick} className={`${btn("secondary", "sm")} ${className}`}>
      {children}
    </button>
  );
}

function MenuShell({ children, className = "" }) {
  return (
    <div className={`absolute right-0 top-full mt-1 z-30 rounded-lg border border-line-control bg-white p-1 shadow-pop ${className}`}>
      {children}
    </div>
  );
}

function MenuItem({ onClick, hint, children }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 rounded-md px-2 h-8 text-body text-left text-ink transition-colors duration-150 hover:bg-surface-hover">
      <span className="flex-1 flex items-center gap-2">{children}</span>
      {hint && <Kbd>{hint}</Kbd>}
    </button>
  );
}

function SectionLabel({ children, count, countClass = "", onClick, collapsed, collapsible }) {
  const Comp = collapsible ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className="group/label flex items-center gap-1.5 h-7 text-xs font-medium text-ink-4 select-none"
    >
      <span className="transition-colors duration-150 group-hover/label:text-ink">{children}</span>
      {count != null && <span className={`tabular-nums ${countClass}`}>{count}</span>}
      {collapsible && (
        <ChevronDown
          className={`h-3 w-3 text-ink-4 transition-transform duration-150 ${collapsed ? "-rotate-90" : ""}`}
        />
      )}
    </Comp>
  );
}

/* ==========================================================================
   Sidebar
   ========================================================================== */

/* ==========================================================================
   Sidebar
   ========================================================================== */

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-body-lg leading-5 border transition-colors ${
        active
          ? "bg-white border-line-control text-ink font-medium"
          : "border-transparent text-ink-2 hover:bg-black/[0.04]"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-ink" : "text-ink-3"}`} strokeWidth={1.75} />
      <span className="flex-1 text-left truncate">{item.label}</span>
      {item.badge && item.badge.text && (
        <span
          className={`text-caption leading-none rounded-md px-1.5 py-1 font-medium ${
            {
              blue: "bg-blue-50 text-blue-700",
              red: "bg-red-50 text-red-700",
              amber: "bg-amber-50 text-amber-700",
              muted: "text-ink-4 font-normal px-0",
            }[item.badge.tone]
          }`}
        >
          {item.badge.text}
        </span>
      )}
    </button>
  );
}

function SavedViewItem({ view, active, onOpen, onDelete }) {
  const Icon = view.icon;
  return (
    <div className="group relative">
      <button
        onClick={onOpen}
        title={view.title}
        className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-body-lg leading-5 border transition-colors ${
          active ? "bg-white border-line-control text-ink font-medium" : "border-transparent text-ink-2 hover:bg-black/[0.04]"
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-ink" : "text-ink-3"}`} strokeWidth={1.75} />
        <span className="flex-1 text-left truncate">{view.label}</span>
        <span className={`text-caption tabular-nums font-normal text-ink-4 ${view.custom ? "group-hover:opacity-0" : ""}`}>{view.count}</span>
      </button>
      {view.custom && (
        <button
          onClick={onDelete}
          aria-label={`Delete view ${view.label}`}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md flex items-center justify-center text-ink-4 opacity-0 [@media(hover:none)]:opacity-100 group-hover:opacity-100 hover:bg-black/[0.06] hover:text-ink transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function Sidebar({ sections, activeNav, setActiveNav, onSearch, open, onClose, savedViews = [], onOpenView, onNewView, onDeleteView }) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/20 md:hidden transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-body-lg leading-5 focus:shadow-md">Skip to content</a>
      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-surface-sidebar border-r border-line-control flex flex-col transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-x-0 ${
          open ? "translate-x-0 duration-[400ms]" : "-translate-x-full duration-[350ms]"
        }`}
      >
        {/* Product name */}
        <div className="px-3 pt-3 pb-2 flex items-center gap-1">
          <div className="flex-1 flex items-center gap-2 px-2 py-1.5">
            <span className="h-6 w-6 rounded-md text-white text-small leading-4 font-semibold flex items-center justify-center" style={{ backgroundColor: ACCENT }} aria-hidden="true">
              C
            </span>
            <span className="text-body-lg leading-5 font-medium text-ink">Cradlewell sales</span>
          </div>
          <button onClick={onClose} className="md:hidden h-8 w-8 rounded-md flex items-center justify-center text-ink-3 hover:bg-black/[0.04]" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-3">
          {sections.map((section) => (
            <div key={section.title} className="mt-4 first:mt-2">
              <div className="px-2.5 mb-1 text-small leading-4 text-ink-4">{section.title}</div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={activeNav === item.id}
                    onClick={() => {
                      setActiveNav(item.id);
                      onClose();
                    }}
                  />
                ))}
                {section.footer && (
                  <button className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-body-lg leading-5 text-ink-4 hover:bg-black/[0.04]">
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                    {section.footer}
                  </button>
                )}
              </div>
            </div>
          ))}

        </nav>

        <div className="border-t border-line-control p-3 space-y-0.5">
          <NavItem
            item={{ id: "settings", label: "Settings", icon: Settings }}
            active={activeNav === "settings"}
            onClick={() => {
              setActiveNav("settings");
              onClose();
            }}
          />
          <NavItem
            item={{ id: "logout", label: "Log out", icon: LogOut }}
            active={false}
            onClick={async () => {
              await flush();
              await fetch("/api/crm/auth", { method: "DELETE" }).catch(() => {});
              window.location.href = "/crm/login";
            }}
          />
        </div>
      </aside>
    </>
  );
}

/* ==========================================================================
   Overlays: toast, lead drawer, command palette
   ========================================================================== */

function Toast({ toast, onClose, raised }) {
  if (!toast) return <div role="status" aria-live="polite" className="sr-only" />;
  return (
    <div role="status" aria-live="polite" className={`fixed ${raised ? "bottom-20" : "bottom-5 md:bottom-14"} left-1/2 -translate-x-1/2 md:left-[calc(50%+130px)] z-[80]`}>
      <div key={toast.id} className="cw-toast flex items-center gap-3 rounded-lg bg-ink text-white text-body-lg leading-5 pl-3.5 pr-2 py-2 shadow-lg">
        <span>{toast.message}</span>
        {toast.undo && (
          <button onClick={toast.undo} className="rounded-md px-2 py-0.5 text-body-lg leading-5 font-medium text-[#F3B6CC] hover:bg-white/10">
            Undo
          </button>
        )}
        <button onClick={onClose} className="h-6 w-6 rounded-md flex items-center justify-center text-white/60 hover:bg-white/10" aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function LeadDrawer({ lead, onClose, onToast }) {
  const open = !!lead;
  const [shown, setShown] = useState(lead);
  useEffect(() => {
    if (lead) setShown(lead);
  }, [lead]);
  const l = lead || shown;
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  usePanelFocus(open, panelRef, onClose);
  const grab = useSheetDrag(panelRef, backdropRef, onClose);
  const tone = { respond: "amber", new: "sky", overdue: "red", due: "neutral", payment: "green", schedule: "neutral" }[l?.section] || "neutral";
  const activities = l ? ACTIVITY_TEMPLATES[l.section] || ACTIVITY_TEMPLATES.schedule : [];

  return (
    <>
      <div ref={backdropRef} onClick={onClose} className={`fixed inset-0 z-40 bg-black/10 max-md:bg-black/25 transition-opacity max-md:duration-500 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        inert={!open}
        aria-label="Follow-up"
        onPointerDown={(e) => e.target.closest("[data-sheet-grab]") && grab(e)}
        className={sheetCls(open)}
      >
        <SheetHandle />
        {l && (
          <>
            <div data-sheet-grab className="flex items-center justify-between px-5 py-3 border-b border-line max-md:touch-none">
              <span className="text-small leading-4 text-ink-4">Lead</span>
              <button onClick={onClose} className="h-8 w-8 rounded-md flex items-center justify-center text-ink-3 hover:bg-surface-hover" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-6 overflow-y-auto">
              <div className="flex items-center gap-3">
                <Avatar name={l.name} tone={tone} size="lg" />
                <div>
                  <div className="text-title font-semibold leading-tight">{l.name}</div>
                  <div className="mt-1"><Tag label={l.tag} /></div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openCall(l.phone)} className="flex-1 h-9 rounded-lg text-body-lg leading-5 font-medium text-white flex items-center justify-center gap-1.5" style={{ backgroundColor: ACCENT }}>
                  <Phone className="h-4 w-4" /> Call
                </button>
                <button onClick={() => openWhatsApp(l.phone)} className="flex-1 h-9 rounded-lg text-body-lg leading-5 font-medium border border-line-control hover:bg-stone-50 flex items-center justify-center gap-1.5">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
              </div>

              <dl className="space-y-3 text-body-lg leading-5">
                {[
                  ["Phone", l.phone],
                  ["Stage", l.stage],
                  ["Source", l.source],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <dt className="w-20 shrink-0 text-small leading-4 text-ink-4 pt-0.5">{k}</dt>
                    <dd className="text-ink">{v || "—"}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <div className="text-small leading-4 text-ink-4 mb-2">Last 3 activities</div>
                <ol className="relative border-l border-line-control ml-1.5 space-y-4">
                  {activities.map((a, i) => (
                    <li key={a} className="pl-4 relative">
                      <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-line-strong" />
                      <div className="text-body-lg leading-5">{a}</div>
                      <div className="text-small leading-4 text-ink-4">{["Today", "Yesterday", "2 days ago"][i]}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function CommandPalette({ open, onClose, leads, onSelect }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digitsQ = s.replace(/\D/g, "");
    return (s ? leads.filter((l) => l.name.toLowerCase().includes(s) || (digitsQ.length >= 3 && String(l.phone || "").replace(/\D/g, "").includes(digitsQ))) : leads).slice(0, 8);
  }, [q, leads]);

  if (!open) return null;

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[idx]) {
      onSelect(results[idx]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-[560px] rounded-xl border border-line-control bg-white shadow-modal overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b border-line">
          <Search className="h-4 w-4 text-ink-4" />
          <input
            ref={inputRef}
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={onKey}
            placeholder="Search leads by name or number"
            className="flex-1 py-3.5 text-body-lg leading-5 outline-none placeholder:text-ink-placeholder"
          />
          <kbd className="text-caption rounded border border-line-control px-1.5 py-0.5 text-ink-4">Esc</kbd>
        </div>
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-body-lg leading-5 text-ink-4">No leads match "{q}"</div>
          ) : (
            <>
              <div className="px-2.5 pt-1 pb-1.5 text-small leading-4 text-ink-4">Leads</div>
              {results.map((l, i) => (
                <button
                  key={l.id}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => onSelect(l)}
                  className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left ${i === idx ? "bg-stone-100" : ""}`}
                >
                  <Avatar name={l.name} tone="neutral" />
                  <div className="flex-1 min-w-0">
                    <div className="text-body-lg leading-5 font-medium">{l.name}</div>
                    <div className="text-small leading-4 text-ink-3 truncate">{[l.stage, l.source].filter(Boolean).join(" · ")}</div>
                  </div>
                  {i === idx && <CornerDownLeft className="h-3.5 w-3.5 text-ink-4" />}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


/* ==========================================================================
   Queue: menus, rows, sections
   ========================================================================== */

function SnoozeMenu({ onPick }) {
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState("");
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const choose = useCallback(
    (i) => {
      const d = new Date();
      if (i === 0) {
        d.setHours(d.getHours() + 3, 0, 0, 0);
        onPick(`later today, ${fmtTime(d)}`);
      } else if (i === 1) {
        onPick("tomorrow, 10:00 am");
      } else if (i === 2) {
        d.setDate(d.getDate() + 3);
        onPick(fmtDay(d));
      } else {
        setPicking(true);
      }
    },
    [onPick]
  );
  useDigitPicker(4, choose, !picking);

  return (
    <MenuShell className="w-52">
      {!picking ? (
        <>
          <div className="px-2 pt-1 pb-1.5 text-caption text-ink-4">Snooze until</div>
          {["Later today", "Tomorrow", "In 3 days"].map((label, i) => (
            <MenuItem key={label} hint={i + 1} onClick={() => choose(i)}>
              {label}
            </MenuItem>
          ))}
          <MenuItem hint={4} onClick={() => choose(3)}>
            Pick a date
          </MenuItem>
        </>
      ) : (
        <div className="p-2 space-y-2">
          <div className="text-caption text-ink-4">Pick a date</div>
          <input
            type="date"
            autoFocus
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && date && onPick(fmtDay(new Date(`${date}T10:00:00`)))}
            className="w-full rounded-md border border-line-control px-2 h-8 text-body outline-none focus:border-line-heavy"
          />
          <div className="flex gap-1.5">
            <SmallButton onClick={() => setPicking(false)} className="flex-1 justify-center">Back</SmallButton>
            <button
              disabled={!date}
              onClick={() => onPick(fmtDay(new Date(`${date}T10:00:00`)))}
              className={`flex-1 ${btn("primary", "sm")}`}
            >
              Snooze
            </button>
          </div>
        </div>
      )}
    </MenuShell>
  );
}

function OutcomeMenu({ onPick }) {
  const pick = useCallback((i) => onPick(OUTCOMES[i]), [onPick]);
  useDigitPicker(OUTCOMES.length, pick);
  return (
    <MenuShell className="w-52">
      <div className="px-2 pt-1 pb-1.5 text-caption text-ink-4">Log outcome</div>
      {OUTCOMES.map((o, i) => (
        <MenuItem key={o} hint={i + 1} onClick={() => onPick(o)}>
          <span className={`h-1.5 w-1.5 rounded-full ${TAG_DOTS[o]}`} />
          {o}
        </MenuItem>
      ))}
    </MenuShell>
  );
}

const Dot = () => <span className="text-ink-faint">·</span>;

function ShortcutBar() {
  const items = [
    [["J", "K"], "navigate"],
    [["C"], "call"],
    [["W"], "WhatsApp"],
    [["S"], "snooze"],
    [["E"], "done"],
    [["↵"], "open"],
  ];
  return (
    <div className="hidden md:flex sticky bottom-0 z-10 mt-10 -mx-3 px-3 h-9 items-center gap-4 border-t border-line bg-white text-caption text-ink-4">
      {items.map(([keys, label]) => (
        <span key={label} className="flex items-center gap-1">
          {keys.map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
          <span className="ml-0.5">{label}</span>
        </span>
      ))}
    </div>
  );
}

/* ==========================================================================
   Right column: timeline
   ========================================================================== */

function TimelineItem({ e, now, next, last, outcome, onOpen, onLog, onCall }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setMenu(false), []);
  useOutsideClick(ref, close, menu);

  const past = isPastSlot(e, now);
  const pending = e.type === "Consult" && past && !outcome;
  const done = past && !pending;

  // hollow = upcoming, filled grey = done, amber = needs outcome, accent = next
  const dot = pending ? (
    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-white" />
  ) : next ? (
    <span className="h-2.5 w-2.5 rounded-full ring-4 ring-white" style={{ backgroundColor: ACCENT, boxShadow: `0 0 0 6px rgba(180,67,108,0.12)` }} />
  ) : done ? (
    <span className="h-2.5 w-2.5 rounded-full bg-line-heavy ring-4 ring-white" />
  ) : (
    <span className="h-2.5 w-2.5 rounded-full border border-line-heavy bg-white ring-4 ring-white" />
  );

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && <span className="absolute left-[4.5px] top-3 bottom-0 w-px bg-line-control" />}
      <div className="relative z-[1] pt-1 flex h-fit">{dot}</div>
      <div className="min-w-0 flex-1">
        <div className={`flex items-center gap-2 text-small leading-4 tabular-nums ${next ? "text-brand font-medium" : "text-ink-4"}`}>
          {fmtTime(e.at)}
          {next && <span>· Next</span>}
        </div>
        <div className="mt-0.5 flex items-start gap-2">
          <div className={`min-w-0 flex-1 text-body transition-opacity duration-150 ${done ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-ink-3">{e.type}</span>
              <Dot />
              <button
                onClick={() => onOpen({ ...e, section: "schedule", tag: outcome || e.type })}
                className="font-medium text-ink hover:underline underline-offset-2 decoration-line-heavy"
              >
                {e.name}
              </button>
            </div>
            <div className="text-ink-4 text-small leading-4 mt-0.5 truncate">
              {[e.stage, e.note].filter(Boolean).join(" · ")}
            </div>
            {outcome && <Tag label={outcome} className="text-small leading-4 mt-1" />}
          </div>

          <div ref={ref} className="relative shrink-0">
            {pending && (
              <button
                onClick={() => setMenu((m) => !m)}
                className="h-7 rounded-md border border-amber-200 bg-amber-50 px-2 text-small font-medium text-amber-700 transition-colors duration-150 hover:bg-amber-100"
              >
                Log outcome
              </button>
            )}
            {next && !pending && (
              <SmallButton onClick={() => onCall(e)}>
                <Phone className="h-3 w-3" /> Call
              </SmallButton>
            )}
            {menu && (
              <OutcomeMenu
                onPick={(o) => {
                  close();
                  onLog(e, o);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function Timeline({ now, onOpen, outcomes, onLog, onCall }) {
  const entries = SCHEDULE.map((s) => ({ ...s, at: todayAt(s.time) }));
  const nextId = entries.find((e) => !isPastSlot(e, now))?.id;
  const pendingCount = entries.filter((e) => needsOutcome(e, now, outcomes)).length;

  return (
    <section id="today-schedule" className="scroll-mt-16">
      <div className="flex items-center justify-between">
        <SectionLabel count={entries.length}>Today's schedule</SectionLabel>
        {pendingCount > 0 && (
          <span className="text-caption text-amber-600 tabular-nums">
            {pendingCount} to log
          </span>
        )}
      </div>
      <ol className="mt-3">
        {entries.map((e, i) => (
          <TimelineItem
            key={e.id}
            e={e}
            now={now}
            next={e.id === nextId}
            last={i === entries.length - 1}
            outcome={outcomes[e.id]}
            onOpen={onOpen}
            onLog={onLog}
            onCall={onCall}
          />
        ))}
      </ol>
    </section>
  );
}

/* ==========================================================================
   Pages
   ========================================================================== */

function PlaceholderPage({ item }) {
  const Icon = item?.icon || Home;
  return (
    <div className="px-5 md:px-12 py-10 max-w-[1160px]">
      <h1 className="text-h1 font-medium tracking-[-0.01em]">{item?.label}</h1>
      <div className="mt-10 border-t border-line pt-20 flex flex-col items-center text-center">
        <Icon className="h-5 w-5 text-ink-4 mb-3" strokeWidth={1.75} />
        <div className="text-body font-medium">{item?.label} is coming next</div>
        <div className="text-small leading-4 text-ink-4 mt-1">This screen is a placeholder in the prototype.</div>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, delta, extra, onClick, className }) {
  return (
    <button onClick={onClick} className={`group text-left border-line ${className}`}>
      <div className="text-small leading-4 text-ink-4 transition-colors duration-150 group-hover:text-ink">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-stat leading-none font-medium tracking-[-0.02em] tabular-nums text-ink">{value}</span>
        {suffix && <span className="text-body text-ink-4 tabular-nums">{suffix}</span>}
      </div>
      <div className="mt-2 text-small leading-4 text-ink-4 tabular-nums">
        {delta}
        {extra}
      </div>
    </button>
  );
}

/* ---------- My day: stat cards + three single-column sections ---------- */

/* ---------- My day: count-up numbers and stat cards ---------- */

// Smoothly counts a number up to its target (and between targets)
function useCountUp(target, ms = 800) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setV(target); from.current = target; return; }
    let raf;
    const start = performance.now();
    const a = from.current;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      const val = a + (target - a) * e;
      setV(val);
      from.current = val;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}
const CountUp = ({ value, format = (n) => Math.round(n), ms }) => <>{format(useCountUp(value, ms))}</>;

const ATTN_ORDER = ["respond", "overdue", "new", "payment", "due"];
const ATTN_ICON = { respond: MessageCircle, new: UserPlus, overdue: AlertCircle, due: ListChecks, payment: IndianRupee };
const ACTION_SHORT = { "Open chat": "Reply", Call: "Call", "Resend link": "Resend" };
const ATTN_FILTERS = { new: { label: "New leads", sections: ["new"] }, followups: { label: "Follow-ups", sections: ["overdue", "due"] }, payment: { label: "Pending payments", sections: ["payment"] } };
// One short money format across the app: lakh with one decimal, crore with two (₹4.8L, ₹68.0L, ₹1.67Cr)
const fmtShortINR = (n) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : fmtINR(n));
const fmtL = (n) => fmtShortINR(n);

function StatCard({ label, icon: Icon, value, sub, onClick, title, children, index = 0 }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="cw-card-in group/stat text-left rounded-xl border border-line bg-white px-[14px] py-3 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-[2px] hover:border-line-strong hover:shadow-lift active:translate-y-0 active:duration-75 min-w-0"
      style={{ animationDelay: `${40 + Math.min(index, 6) * 40}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-small text-ink-4 truncate">{label}</span>
        <Icon className="h-[14px] w-[14px] text-ink-4 shrink-0 transition-[color,transform] duration-200 group-hover/stat:text-ink-3 group-hover/stat:scale-110" strokeWidth={1.75} />
      </div>
      <div className="mt-1.5 text-title leading-none font-medium tracking-[-0.01em] tabular-nums text-ink">{typeof value === "number" ? <CountUp value={value} /> : value}</div>
      {children}
      <div className="mt-1.5 text-caption text-ink-4 truncate tabular-nums">{sub}</div>
    </button>
  );
}

function DaySection({ id, title, count, right, flash, collapsed, onToggle, children, delay = 0 }) {
  // Clip only while collapsed or animating open; once open, row menus (Snooze, Done) can drop below the last row
  const [clip, setClip] = useState(collapsed);
  useEffect(() => {
    if (collapsed) { setClip(true); return; }
    const t = setTimeout(() => setClip(false), 300);
    return () => clearTimeout(t);
  }, [collapsed]);
  return (
    <section id={id} className={`cw-fade-in scroll-mt-6 rounded-lg transition-colors duration-500 ${flash ? "bg-brand-tint" : ""}`} style={{ animationDelay: `${delay}ms` }}>
      <div className={`flex items-center gap-2 pb-2 ${collapsed ? "" : "border-b border-line"}`}>
        <button onClick={onToggle} aria-expanded={!collapsed} className="group/h -ml-1 pl-1 pr-1.5 h-6 rounded-md flex items-center gap-1.5 hover:bg-surface-hover transition-colors duration-150">
          <h2 className="text-body font-medium text-ink">{title}</h2>
          <span className="text-small text-ink-4 tabular-nums"><CountUp value={count} ms={500} /></span>
          <ChevronDown className={`h-3.5 w-3.5 text-ink-4 group-hover/h:text-ink transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        <div className="ml-auto text-small text-ink-4">{right}</div>
      </div>
      <div className={`grid transition-[grid-template-rows,opacity] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`} aria-hidden={collapsed} inert={collapsed}>
        <div className={`min-h-0 ${clip ? "overflow-hidden" : ""}`}>
          <div className="divide-y divide-line-subtle border-b border-line-subtle">{children}</div>
        </div>
      </div>
    </section>
  );
}

// One-line row shell: lead | middle (name · short · context) | status | action | hover icons
function DayRow({ rowId, selected, onSelect, highlight, lead, name, short, context, contextTone, status, action, hoverIcons, onName, leaving, menu, index = 0, onSwipeRight, onSwipeLeft }) {
  const ref = useRef(null);
  const layerRef = useRef(null);
  const swipe = useRowSwipe(ref, layerRef, { onRight: onSwipeRight, onLeft: onSwipeLeft });
  const swipeable = !!(onSwipeRight || onSwipeLeft);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);
  return (
    <div className={`grid transition-[grid-template-rows,opacity] duration-150 ease-out ${leaving ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}>
      <div className={`min-w-0 cw-row-in transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${leaving ? "overflow-hidden translate-x-2" : ""}`} style={{ animationDelay: `${Math.min(index, 7) * 40}ms` }}>
        {/* Clip sideways only: the swipe needs it, but the Snooze / Done menus drop down below the row */}
        <div className="relative overflow-x-clip">
        {swipeable && (
          <div ref={layerRef} aria-hidden="true" data-past="" className="md:hidden absolute inset-0 flex opacity-0 text-small font-medium text-white [&[data-past='1']_svg]:scale-125">
            <div className="flex-1 bg-emerald-700 flex items-center gap-1.5 pl-4">{onSwipeRight && <><Check className="h-4 w-4 transition-transform duration-150" /> Done</>}</div>
            <div className="flex-1 bg-amber-700 flex items-center justify-end gap-1.5 pr-4">{onSwipeLeft && <>Tomorrow <AlarmClock className="h-4 w-4 transition-transform duration-150" /></>}</div>
          </div>
        )}
        <div
          ref={ref}
          data-row={rowId}
          onClick={() => onSelect(rowId)}
          {...(swipeable ? swipe : {})}
          className={`group relative flex items-center gap-3 h-11 px-2 text-body transition-colors duration-150 ${swipeable ? "touch-pan-y" : ""} ${swipeable && !selected && !highlight ? "bg-white" : ""} ${selected ? "bg-surface-hover" : highlight ? "bg-blue-50 hover:bg-blue-50" : "hover:bg-surface-subtle"}`}
        >
          {selected && <span className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-full" style={{ backgroundColor: ACCENT }} />}
          {lead}
          <div className="min-w-0 flex-1 flex items-center gap-1.5 whitespace-nowrap">
            <button onClick={(e) => { e.stopPropagation(); onSelect(rowId); onName?.(); }} className="font-medium text-ink hover:underline underline-offset-2 decoration-line-heavy shrink-0">
              {name}
            </button>
            {short && <span className="text-ink-4 shrink-0">· {short}</span>}
            {context && <span className={`min-w-0 truncate ${contextTone || "text-ink-4"}`}>· {context}</span>}
          </div>
          <div className="shrink-0 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {status}
            <div className="relative flex items-center gap-0.5">
              {action}
              <div className={`flex items-center transition-opacity duration-150 ${selected || menu ? "opacity-100" : "opacity-0 [@media(hover:none)]:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"}`}>{hoverIcons}</div>
              {menu && <div data-row-menu>{menu}</div>}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

const StatusText = ({ dot, tone, children, pulse }) => (
  <span className={`hidden sm:inline-flex items-center gap-1.5 text-small whitespace-nowrap tabular-nums ${tone}`}>
    <span className="relative flex h-1.5 w-1.5">
      {pulse === "live" && <span className={`cw-ping absolute inset-0 rounded-full ${dot}`} />}
      <span className={`relative h-1.5 w-1.5 rounded-full ${dot}`} />
    </span>
    {children}
  </span>
);

function MyDay({ now, items, leads = [], onOpen, showToast, md }) {
  const { daySections, toggleDaySection, selectedId, setSelectedId, rowMenu, setRowMenu, actions, scheduleOutcomes, logScheduleOutcome, opps, oppTotal, onSellOpp, onCallOpp, dismissOpp, attnFilter, setAttnFilter, jumpTo, flash, onViewAllOpps, onCalendar } = md;
  const open = items.filter((i) => i.status === "open" || i.status === "leaving");
  const count = (sections) => items.filter((i) => i.status === "open" && sections.includes(i.section));
  const newItems = count(["new"]);
  // Leads created today (any stage)
  const newToday = leads.filter((l) => l.createdAt && dayDiff(l.createdAt, now) === 0);
  const overdue = count(["overdue"]);
  const followups = count(["overdue", "due"]);
  const payments = count(["payment"]);
  const consults = SCHEDULE.map((s) => ({ ...s, outcome: scheduleOutcomes[s.id] }));
  const nextConsult = consults.filter((c) => c.at > now).sort((a, b) => a.at - b.at)[0];
  const pendingOutcomes = consults.filter((c) => needsOutcome(c, now, scheduleOutcomes)).length;
  const openCount = items.filter((i) => i.status === "open").length + pendingOutcomes;
  const rev = REVENUE_MONTH.care + REVENUE_MONTH.experts;
  const revPct = Math.min(1, rev / REVENUE_MONTH.target);
  const monthName = now.toLocaleDateString("en-GB", { month: "short" });
  // How much of the month has gone, so the revenue bar can show whether we're on pace
  const monthPace = now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const paceWord = revPct >= monthPace + 0.03 ? "ahead" : revPct <= monthPace - 0.03 ? "behind" : "on pace";

  const attnRows = open
    .filter((i) => !attnFilter || ATTN_FILTERS[attnFilter].sections.includes(i.section))
    .sort((a, b) => ATTN_ORDER.indexOf(a.section) - ATTN_ORDER.indexOf(b.section) || (a.waitingSince || 0) - (b.waitingSince || 0));

  const menuFor = (id) => (rowMenu?.id === id ? rowMenu.kind : null);
  const toggleMenu = (id, kind) => setRowMenu((m) => (m?.id === id && m.kind === kind ? null : { id, kind }));

  const attnStatus = (item) => {
    if (item.section === "respond") {
      const mins = Math.floor((now - item.waitingSince) / 60000);
      const t = mins < 3 ? ["bg-emerald-500", "text-emerald-700"] : mins <= 5 ? ["bg-amber-500", "text-amber-700"] : ["bg-red-500", "text-red-700"];
      return <StatusText dot={t[0]} tone={t[1]}>Waiting {mins}m</StatusText>;
    }
    if (item.section === "overdue") return <StatusText dot="bg-red-500" tone="text-red-700">{item.late}</StatusText>;
    if (item.section === "new") return <StatusText dot="bg-blue-500" tone="text-blue-700">New · {fmtAgo(now - item.createdAt)}</StatusText>;
    if (item.section === "payment") return <StatusText dot="bg-amber-500" tone="text-amber-700">{fmtINR(item.amount)} · {item.late}</StatusText>;
    return <StatusText dot="bg-line-heavy" tone="text-ink-4">Due today</StatusText>;
  };

  const hoverPair = (id, onSnooze, onDone) => (
    <>
      <GhostIcon title="Snooze (S)" active={menuFor(id) === "snooze"} onClick={onSnooze || (() => toggleMenu(id, "snooze"))}>
        <AlarmClock className="h-[15px] w-[15px]" strokeWidth={1.75} />
      </GhostIcon>
      <GhostIcon title="Done (E)" active={menuFor(id) === "done"} onClick={onDone || (() => toggleMenu(id, "done"))}>
        <Check className="h-[15px] w-[15px]" strokeWidth={2} />
      </GhostIcon>
    </>
  );

  const scheduleStatus = (c) => {
    const mins = Math.round((c.at - now) / 60000);
    if (c.outcome) return { node: <StatusText dot={TAG_DOTS[c.outcome] || "bg-line-heavy"} tone="text-ink-3">{c.outcome}</StatusText> };
    if (needsOutcome(c, now, scheduleOutcomes)) return { node: <StatusText dot="bg-amber-500" tone="text-amber-700">Outcome needed</StatusText>, outcome: true };
    if (mins <= 0) return { node: <StatusText dot="bg-blue-500" tone="text-blue-700" pulse="live">In progress</StatusText>, hot: true };
    if (mins <= 60) return { node: <StatusText dot="bg-blue-500" tone="text-blue-700">In {mins} min</StatusText>, hot: true };
    return c.confirm === "confirmed"
      ? { node: <StatusText dot="bg-emerald-500" tone="text-emerald-700">Confirmed</StatusText> }
      : { node: <StatusText dot="bg-line-heavy" tone="text-ink-4">Awaiting reply</StatusText> };
  };

  return (
    <div className="px-5 md:px-12 pt-6 sm:pt-10 pb-16 max-w-[1080px]">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-small leading-4 text-ink-4 tabular-nums">{fmtLongDate(now)}</div>
          <h1 className="cw-fade-in mt-1.5 text-h1 font-medium tracking-[-0.01em] text-ink">{greetingFor(now)}</h1>
          <p className="cw-fade-in mt-1 text-body-lg text-ink-4 tabular-nums" style={{ animationDelay: "60ms" }}>{openCount === 0 ? "Nothing needs you right now" : <><CountUp value={openCount} /> {openCount === 1 ? "thing needs" : "things need"} you today</>}</p>
        </div>
      </header>

      {/* Stat cards */}
      {/* Phones: one swipeable row so "Needs your attention" is on the first screen */}
      <div className="mt-5 sm:mt-8 -mx-5 px-5 sm:mx-0 sm:px-0 flex sm:grid overflow-x-auto sm:overflow-visible snap-x snap-mandatory scroll-px-5 [scrollbar-width:none] sm:grid-cols-3 lg:grid-cols-5 gap-2 [&>*]:shrink-0 [&>*]:w-[148px] sm:[&>*]:w-auto [&>*]:snap-start">
        <StatCard index={0} label="New leads today" icon={UserPlus} value={newToday.length} sub={[...new Set(newToday.map((l) => (l.source || "").replace(" ad", "").replace(" form", "")).filter(Boolean))].join(", ") || "None yet today"} onClick={() => { setAttnFilter("new"); jumpTo("sec-attention", []); }} />
        <StatCard index={1} label="Consultations" icon={CalendarDays} value={consults.length} sub={nextConsult ? `Next ${fmtTime(nextConsult.at)}` : pendingOutcomes ? `${pendingOutcomes} outcome${pendingOutcomes > 1 ? "s" : ""} to log` : "All done"} onClick={() => jumpTo("sec-consults", [])} />
        <StatCard
          index={2}
          label="Follow-ups"
          icon={ListChecks}
          value={followups.length}
          sub={overdue.length ? <span className="text-red-700">● {overdue.length} overdue</span> : "None overdue"}
          onClick={() => { setAttnFilter("followups"); jumpTo("sec-attention", []); }}
        />
        <StatCard index={3} label="Pending payments" icon={IndianRupee} value={payments.length} sub={`${fmtINR(payments.reduce((s, i) => s + (i.amount || 0), 0))} awaiting`} onClick={() => { setAttnFilter("payment"); jumpTo("sec-attention", []); }} />
        <StatCard
          index={4}
          label={`Revenue · ${monthName}`}
          icon={BarChart3}
          value={<CountUp value={rev} format={fmtL} ms={1000} />}
          sub={<>{Math.round(revPct * 100)}% of {fmtL(REVENUE_MONTH.target)} · <span className={paceWord === "behind" ? "text-red-700" : ""}>{paceWord}</span></>}
          title={`Care ${fmtL(REVENUE_MONTH.care)} · Experts ${fmtL(REVENUE_MONTH.experts)} · tick marks where we should be today (${Math.round(monthPace * 100)}% of the month gone)`}
          onClick={() => jumpTo("sec-opps", [])}
        >
          <div className="relative mt-2">
            <div className="h-[3px] rounded-full bg-surface-active overflow-hidden">
              <div className="cw-bar-grow relative h-full rounded-full origin-left overflow-hidden" style={{ width: `${revPct * 100}%`, backgroundColor: ACCENT, animationDelay: "320ms" }}>
              </div>
            </div>
            {/* Pace tick: where revenue should be by today if it came in evenly */}
            <span className="absolute -top-[3px] h-[9px] w-px bg-ink-3" style={{ left: `${monthPace * 100}%` }} aria-hidden="true" />
          </div>
        </StatCard>
      </div>

      <div className="mt-6 sm:mt-10 space-y-6">
        {/* a) Needs your attention */}
        <DaySection
          id="sec-attention"
          collapsed={daySections["sec-attention"]}
          onToggle={() => toggleDaySection("sec-attention")}
          title="Needs your attention"
          count={attnRows.filter((i) => i.status === "open").length}
          flash={flash === "sec-attention"}
          right={
            attnFilter ? (
              <span className="inline-flex items-center gap-1 h-6 rounded-md border border-brand-line bg-brand-tint pl-2 pr-1 text-brand-strong">
                {ATTN_FILTERS[attnFilter].label}
                <button onClick={() => setAttnFilter(null)} aria-label="Clear filter" className="h-4 w-4 flex items-center justify-center rounded hover:bg-brand-line"><X className="h-3 w-3" /></button>
              </span>
            ) : "by urgency"
          }
        >
          {attnRows.length === 0 && <div className="py-10 text-center text-body text-ink-4">You're all caught up here</div>}
          {attnRows.map((item, rowI) => {
            const Icon = ATTN_ICON[item.section];
            const m = menuFor(item.id);
            return (
              <DayRow
                key={item.id}
                index={rowI}
                rowId={item.id}
                selected={selectedId === item.id}
                onSelect={setSelectedId}
                leaving={item.status === "leaving"}
                lead={<span className={`w-5 flex justify-center shrink-0 ${item.section === "respond" ? "text-amber-600" : item.section === "overdue" ? "text-red-500" : "text-ink-4"}`}><Icon className="h-4 w-4" strokeWidth={1.75} /></span>}
                name={item.name}
                short={item.short}
                context={item.reason || item.note}
                onName={() => onOpen(item)}
                status={attnStatus(item)}
                action={<SmallButton onClick={() => actions.primary(item)}>{ACTION_SHORT[item.action] || item.action}</SmallButton>}
                hoverIcons={hoverPair(item.id)}
                onSwipeRight={() => actions.done(item, "Done")}
                onSwipeLeft={() => actions.snooze(item, "tomorrow, 10:00 am")}
                menu={
                  m === "snooze" ? <SnoozeMenu onPick={(label) => { setRowMenu(null); actions.snooze(item, label); }} /> : m === "done" ? <OutcomeMenu onPick={(o) => { setRowMenu(null); actions.done(item, o); }} /> : null
                }
              />
            );
          })}
        </DaySection>

        {/* b) Today's consultations */}
        <DaySection
          id="sec-consults"
          delay={160}
          collapsed={daySections["sec-consults"]}
          onToggle={() => toggleDaySection("sec-consults")}
          title="Today's consultations"
          count={consults.length}
          flash={flash === "sec-consults"}
          right={<button onClick={onCalendar} className="hover:text-ink transition-colors duration-150">Calendar</button>}
        >
          {consults.map((c, rowI) => {
            const rid = `s:${c.id}`;
            const st = scheduleStatus(c);
            const m = menuFor(rid);
            return (
              <DayRow
                key={c.id}
                index={rowI + 4}
                rowId={rid}
                selected={selectedId === rid}
                onSelect={setSelectedId}
                highlight={st.hot}
                lead={<span className="w-[62px] shrink-0 text-small text-ink-3 tabular-nums">{fmtTime(c.at)}</span>}
                name={c.name}
                short={c.short}
                context={c.note}
                onName={() => onOpen({ ...c, section: "schedule", tag: c.type })}
                status={st.node}
                action={
                  st.outcome ? (
                    <SmallButton onClick={() => toggleMenu(rid, "outcome")}><Pencil className="h-3.5 w-3.5" /> Log outcome</SmallButton>
                  ) : c.outcome ? null : c.mode === "video" ? (
                    <SmallButton onClick={() => openWhatsApp(c.phone)}><Video className="h-3.5 w-3.5" /> Join</SmallButton>
                  ) : (
                    <SmallButton onClick={() => openCall(c.phone)}><Phone className="h-3.5 w-3.5" /> Call</SmallButton>
                  )
                }
                menu={m === "outcome" ? <OutcomeMenu onPick={(o) => { setRowMenu(null); logScheduleOutcome(c, o); }} /> : null}
              />
            );
          })}
        </DaySection>

        {/* c) Customer opportunities */}
        <DaySection
          id="sec-opps"
          delay={260}
          collapsed={daySections["sec-opps"]}
          onToggle={() => toggleDaySection("sec-opps")}
          title="Customer opportunities"
          count={oppTotal}
          flash={flash === "sec-opps"}
          right={<button onClick={onViewAllOpps} className="hover:text-ink transition-colors duration-150">View all</button>}
        >
          {opps.length === 0 && <div className="py-10 text-center text-body text-ink-4">No suggestions right now</div>}
          {opps.map(({ lead, sugg, plan }, rowI) => {
            const rid = `o:${lead.id}`;
            const renew = sugg.kind === "renew";
            return (
              <DayRow
                key={lead.id}
                index={rowI + 7}
                rowId={rid}
                selected={selectedId === rid}
                onSelect={setSelectedId}
                lead={<span className="w-5 flex justify-center shrink-0 text-teal-600"><HeartHandshake className="h-4 w-4" strokeWidth={1.75} /></span>}
                name={lead.name}
                short={renew ? `care ends in ${plan.left} day${plan.left === 1 ? "" : "s"}` : `baby ${babyAge(lead, now) || "—"}`}
                context={<span className="text-teal-700">{sugg.label}</span>}
                contextTone="text-teal-700"
                status={null}
                action={renew ? <SmallButton onClick={() => onCallOpp(lead)}><Phone className="h-3.5 w-3.5" /> Call</SmallButton> : <SmallButton onClick={() => onSellOpp(lead, sugg)}>Sell</SmallButton>}
                hoverIcons={hoverPair(rid, () => dismissOpp(lead, "snooze"), () => dismissOpp(lead, "done"))}
              />
            );
          })}
        </DaySection>

      </div>
    </div>
  );
}


/* ==========================================================================
   LEADS PAGE — mock data
   ========================================================================== */

// Single-user CRM: every action is done by "you"
const ME = "You";
const LEADS_TOTAL = 248;
const HOSPITALS = ["Cloudnine", "Motherhood", "Rainbow", "Manipal", "Apollo Cradle", "Other"];
const ZONES = ["Whitefield", "Marathahalli", "HSR Layout", "Bellandur", "Sarjapur Road", "Koramangala", "Indiranagar", "Jayanagar", "JP Nagar", "Hebbal", "Yelahanka", "Electronic City"];
const SOURCES = ["WhatsApp", "Website", "Aria Chat", "Walk-in", "Meta ad", "Instagram", "Hospital referral", "Referral"];
const SERVICES = ["Nurse care", "Moba / Japa care", "Newborn care", "Mother care", "Night care", "Lactation support", "Massage"];
const SHIFT_TYPES = ["Day", "Night", "24 hrs"];
const SHIFT_HOURS = [8, 10, 12, 24];
const PAYMENT_STATUSES = ["Not sent", "Link sent", "Partial", "Paid", "Refunded"];
const BOOKING_STATUSES = ["Not booked", "Tentative", "Confirmed", "Cancelled"];
const PAYMENT_DOT = { "Not sent": "bg-stone-300", "Link sent": "bg-amber-500", Partial: "bg-blue-500", Paid: "bg-emerald-500", Refunded: "bg-red-400" };
const BOOKING_DOT = { "Not booked": "bg-stone-300", Tentative: "bg-amber-500", Confirmed: "bg-emerald-500", Cancelled: "bg-red-400" };

// Unread WhatsApp messages per lead (mock)
const UNREAD_WHATSAPP = {};

const PACKAGE_OPTIONS = ["Essential", "Together", "Complete"];
const LOST_REASONS = ["Price", "Not responding", "Chose competitor", "Family will manage", "Not needed", "Invalid lead", "Other"];
const OUTCOME_TAGS = ["Interested", "Price concern", "Not responding", "Deferred", "Converted", "Lost"];
const WA_TEMPLATES = ["Welcome & brochure", "Consult reminder", "Payment link reminder", "Gentle check-in"];

// Mock per-day rates used to make amounts realistic (not final package pricing)
const DAY_RATE = { "Day-8": 3000, "Day-10": 3500, "Day-12": 4000, "Night-10": 4000, "Night-12": 4500, "24 hrs-24": 7000 };
const TWIN_MULTIPLIER = 1.4;

const STAGES = [
  { id: "New", dot: "bg-stone-400" },
  { id: "Qualified", dot: "bg-teal-500" },
  { id: "Consult booked", dot: "bg-blue-500" },
  { id: "Consult done", dot: "bg-amber-500" },
  { id: "Payment pending", dot: "bg-emerald-500" },
  { id: "Won", dot: "bg-emerald-800" },
  { id: "Deferred", dot: "bg-line-heavy" },
  { id: "Lost", dot: "bg-red-500" },
];
const STAGE_DOT = Object.fromEntries(STAGES.map((s) => [s.id, s.dot]));

// [name, number, stage, [P = due in N days | B = born N days ago], hospital, zone, source, package,
//  (unused), score, outcome tag, [last interaction type, minutes ago], next follow-up in hours ("now" = unread WhatsApp, null = none), extra]

// Full detail for the 12 "Baby born" leads. Dates are offsets in days from today.
// w = [birth weight kg per baby], cw = [current weight kg per baby]

// Days each lead has been in its current stage (drives the Pipeline "Stuck" rule)

// Defaults for pregnancy leads, by package
const PACKAGE_DEFAULTS = {
  Essential: { services: ["Newborn care", "Mother care"], shift: ["Day", 8], days: 14 },
  Together: { services: ["Newborn care", "Night care", "Lactation support"], shift: ["Night", 12], days: 28 },
  Complete: { services: ["Newborn care", "Mother care", "Night care", "Lactation support"], shift: ["24 hrs", 24], days: 42 },
  none: { services: ["Newborn care"], shift: ["Day", 8], days: 14 },
};

// Earlier history shown in the lead panel, by stage (newest first, after the last activity)

/* ==========================================================================
   Leads helpers
   ========================================================================== */

const DAY = 86400000;
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / DAY);
const atTen = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(10, 0, 0, 0);
  return d;
};
const dayOffset = (offsetDays) => startOfDay(new Date(Date.now() + offsetDays * DAY));
const roundQuarter = (d) => {
  const x = new Date(d);
  x.setMinutes(Math.round(x.getMinutes() / 15) * 15, 0, 0);
  return x;
};
// Push mock follow-ups that land after 8 pm to 10 am the next day
const workHours = (d) => {
  if (d.getHours() >= 20 || d.getHours() < 9) {
    const x = new Date(d);
    if (x.getHours() >= 20) x.setDate(x.getDate() + 1);
    x.setHours(10, 0, 0, 0);
    return x;
  }
  return d;
};
const fmtShortDate = (d) => (d && !isNaN(d) ? `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}` : "—");
const fmtDate = (d) => (d ? `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })} ${d.getFullYear()}` : "—");
const digits = (s) => (s || "").replace(/\D/g, "").slice(-10);
// Raw mobile digits for validation: drops a leading 91 or 0, keeps typos visible (no truncation)
const mobileDigits = (s) => (s || "").replace(/\D/g, "").replace(/^(91(?=\d{10}$)|0(?=\d{10}$))/, "");
const fmtINR = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const fmtKg = (arr) => (arr && arr.length ? arr.map((w) => (w == null ? "—" : Number(w).toFixed(1))).join(" / ") : "—");
// Pregnancy leads are CW-P-0001, baby-born leads CW-B-0001 (number stays the same if the baby arrives)
const customerId = (n, kind = "B") => `CW-${kind === "P" ? "P" : "B"}-${String(n).padStart(4, "0")}`;

// Auto-calculated fields
const serviceDays = (l) => (l.careStart && l.careEnd ? dayDiff(l.careEnd, l.careStart) + 1 : null);
const packageValue = (l) => {
  // Real money first: the closed deal amount, or the budget the lead gave
  if (l.dealValue) return l.dealValue;
  const days = serviceDays(l);
  const rate = DAY_RATE[`${l.shiftType}-${l.shiftHours}`];
  if (!days || !rate) return 0;
  return Math.round((rate * days * (l.babies > 1 ? TWIN_MULTIPLIER : 1)) / 500) * 500;
};
const babyAge = (l, now) => {
  if (!l.babyDob) return null;
  const d = Math.max(0, Math.floor((now - l.babyDob) / DAY));
  if (d === 0) return "Today";
  if (d < 14) return `${d} day${d > 1 ? "s" : ""}`;
  if (d < 84) return `${Math.floor(d / 7)} wks`;
  return `${Math.floor(d / 30)} mo`;
};


const careStage = (l, now) => {
  // Many real leads have no due date / birth date yet: show the plain care stage then
  if (l.careKind === "P") {
    if (!l.dueDate) return "Pregnancy";
    const w = Math.min(42, Math.max(4, 40 - Math.ceil((l.dueDate - now) / (7 * DAY))));
    return `Pregnancy · ${w}w`;
  }
  const age = babyAge(l, now);
  return age ? `Born · ${age}` : "Born";
};

const fmtRel = (ms) => {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
};

const fmtFollowUp = (l, now) => {
  if (l.needsReply) return { text: "Now", late: true };
  if (!l.nextFollowUp) return { text: "—", late: false, empty: true };
  const d = l.nextFollowUp;
  const diff = dayDiff(d, now);
  if (diff < 0) return { text: `${-diff} day${diff < -1 ? "s" : ""} late`, late: true };
  if (diff === 0) return { text: `Today, ${fmtTime(d)}`, late: d < now };
  if (diff === 1) return { text: `Tomorrow, ${fmtTime(d)}`, late: false };
  return { text: `${fmtDay(d)}, ${fmtTime(d)}`, late: false };
};


// get() may return an array (e.g. services); a filter matches if any value is selected
const FILTER_FIELDS = [
  { id: "stage", label: "Sales stage", values: STAGES.map((s) => s.id), get: (l) => l.stage },
  { id: "care", label: "Care stage", values: ["Pregnancy", "Born"], get: (l) => (l.careKind === "P" ? "Pregnancy" : "Born") },
  { id: "services", label: "Required service", values: SERVICES, get: (l) => l.services },
  { id: "shiftType", label: "Shift type", values: SHIFT_TYPES, get: (l) => l.shiftType },
  { id: "babies", label: "No. of babies", values: ["1", "2", "3"], get: (l) => String(l.babies) },
  { id: "package", label: "Package", values: [...PACKAGE_OPTIONS, "None"], get: (l) => l.package || "None" },
  { id: "payment", label: "Payment status", values: PAYMENT_STATUSES, get: (l) => l.paymentStatus },
  { id: "booking", label: "Booking status", values: BOOKING_STATUSES, get: (l) => l.bookingStatus },
  { id: "hospital", label: "Hospital", values: HOSPITALS, get: (l) => l.hospital },
  { id: "zone", label: "Area / zone", values: ZONES, get: (l) => l.zone },
  { id: "source", label: "Lead source", values: SOURCES, get: (l) => l.source },
  { id: "tag", label: "Outcome tag", values: OUTCOME_TAGS, get: (l) => l.tag || "" },
  { id: "priority", label: "Priority", values: ["High", "Medium", "Low"], get: (l) => leadPriority(l) },
];
const FIELD = Object.fromEntries(FILTER_FIELDS.map((f) => [f.id, f]));
const fieldMatches = (l, f, value) => [].concat(FIELD[f].get(l)).includes(value);

// Won leads are customers: they leave the Leads tabs and live in Paid customers
const LEAD_TABS = [
  { id: "all", label: "All", fn: (l) => l.stage !== "Won" },
  { id: "pregnancy", label: "Pregnancy", fn: (l) => l.stage !== "Won" && l.careKind === "P" },
  { id: "born", label: "Baby born", fn: (l) => l.stage !== "Won" && l.careKind === "B" },
];
const openLeadsTotal = (leads) => leads.filter((l) => l.stage !== "Won").length;

const SORT_FIELDS = [
  { id: "next", label: "Next follow-up", dir: "asc", val: (l) => (l.needsReply ? 0 : l.nextFollowUp ? l.nextFollowUp.getTime() : Infinity) },
  { id: "last", label: "Last interaction", dir: "desc", val: (l) => (l.lastActivity.none ? Infinity : l.lastActivity.at.getTime()) },
  { id: "careStart", label: "Care start date", dir: "asc", val: (l) => (l.careStart ? l.careStart.getTime() : Infinity) },
  { id: "created", label: "Created date", dir: "desc", val: (l) => l.createdAt.getTime() },
  { id: "amount", label: "Amount paid", dir: "desc", val: (l) => l.amountPaid || 0 },
  { id: "name", label: "Name", dir: "asc", val: (l) => l.name.toLowerCase() },
  { id: "priority", label: "Priority", dir: "asc", val: (l) => ["High", "Medium", "Low"].indexOf(leadPriority(l)) },
  { id: "deferred", label: "Deferred until", dir: "asc", val: (l) => (l.deferredUntil ? l.deferredUntil.getTime() : Infinity) },
];
const DEFAULT_SORT = { field: "next", dir: "asc" };

const GROUP_OPTIONS = [
  { id: "none", label: "None" },
  { id: "stage", label: "Sales stage" },
  { id: "paymentStatus", label: "Payment status" },
  { id: "shiftType", label: "Shift type" },
  { id: "hospital", label: "Hospital" },
  { id: "source", label: "Lead source" },
  { id: "priority", label: "Priority" },
];

// icon = header type icon · ai: "auto" = calculated from dates · align = number alignment
// Customer ID and Name are frozen columns rendered separately, before these.
const LEAD_COLUMNS = [
  // Sales: what you sort and act on
  { id: "stage", label: "Sales stage", width: 165, icon: CircleDot },
  { id: "priority", label: "Priority", width: 110, icon: Flag },
  { id: "next", label: "Next follow-up", width: 170, icon: CalendarClock },
  { id: "interaction", label: "Last interaction", width: 170, icon: MessageCircle },
  { id: "care", label: "Care stage", width: 130, icon: Baby },
  { id: "package", label: "Package", width: 120, icon: Package },
  { id: "value", label: "Value", width: 120, icon: IndianRupee, align: "right" },
  { id: "phone", label: "Number", width: 150, icon: Phone },
  { id: "source", label: "Lead source", width: 165, icon: Megaphone },
  // Optional, hidden by default (turn on from the Hide columns menu)
  { id: "payment", label: "Payment status", width: 150, icon: Wallet },
  { id: "amount", label: "Amount paid (INR)", width: 160, icon: IndianRupee, align: "right" },
  { id: "booking", label: "Booking status", width: 145, icon: CalendarCheck },
  { id: "reason", label: "Lost / deferred reason", width: 260, icon: CircleX },
  { id: "services", label: "Required service", width: 250, icon: HandHeart },
  { id: "shiftType", label: "Shift type", width: 110, icon: SunMoon },
  { id: "shiftHours", label: "Shift hours", width: 120, icon: Timer, align: "right" },
  { id: "careStart", label: "Care start date", width: 140, icon: CalendarRange },
  { id: "careEnd", label: "Care end date", width: 135, icon: CalendarRange },
  { id: "serviceDays", label: "Service days", width: 165, icon: Hash, ai: "auto", align: "right" },
  { id: "due", label: "Due date", width: 120, icon: Calendar },
  { id: "dob", label: "Baby date of birth", width: 165, icon: Calendar },
  { id: "babyAge", label: "Baby age", width: 150, icon: Baby, ai: "auto", align: "right" },
  { id: "babies", label: "Number of babies", width: 160, icon: Users, align: "right" },
  { id: "birthWeight", label: "Birth weight (kg)", width: 150, icon: Weight, align: "right" },
  { id: "currentWeight", label: "Current weight (kg)", width: 165, icon: Weight, align: "right" },
  { id: "hospital", label: "Hospital", width: 140, icon: Building2 },
  { id: "zone", label: "Area / zone", width: 140, icon: MapPin },
  { id: "address", label: "Full address", width: 300, icon: MapPin },
  { id: "interactionAt", label: "Last interaction at", width: 175, icon: Clock },
  { id: "interactionType", label: "Last interaction type", width: 185, icon: MessageCircle },
  { id: "created", label: "Created", width: 120, icon: CalendarPlus },
];
const COLUMN = Object.fromEntries(LEAD_COLUMNS.map((c) => [c.id, c]));

// Default visible columns (same on every tab). Order here = order in the table.
const DEFAULT_COLS = {
  default: LEAD_COLUMNS.slice(0, LEAD_COLUMNS.findIndex((c) => c.id === "payment")).map((c) => c.id),
};
const TAB_EXCLUDED_COLS = {};
const colKeyFor = () => "default";

/* ==========================================================================
   Leads building blocks
   ========================================================================== */

// Menu anchored to an element with fixed positioning, so it is never clipped by scrolling containers.
function FixedMenu({ anchor, onClose, width = 220, align = "left", children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!ref.current || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const h = ref.current.offsetHeight;
    let top = r.bottom + 4;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 4);
    let left = align === "right" ? r.right - width : r.left;
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    if (!pos || pos.top !== top || pos.left !== left) setPos({ top, left });
  });

  useEffect(() => {
    const down = (e) => {
      if (ref.current?.contains(e.target) || anchor?.contains(e.target)) return;
      onClose();
    };
    const key = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const scroll = (e) => {
      if (ref.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", down);
    window.addEventListener("keydown", key, true);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
      className="z-[70] max-h-[min(420px,70vh)] overflow-y-auto rounded-lg border border-line-control bg-white p-1 text-ink shadow-pop"
    >
      {children}
    </div>
  );
}

const MenuHeading = ({ children }) => <div className="px-2 pt-1 pb-1.5 text-caption text-ink-4">{children}</div>;
const MenuSep = () => <div className="my-1 h-px bg-surface-active" />;

function StageLabel({ lead }) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STAGE_DOT[lead.stage]}`} />
      <span className="text-ink whitespace-nowrap">{lead.stage}</span>
      {lead.stage === "Lost" && lead.lostReason && <span className="text-ink-4 truncate">· {lead.lostReason}</span>}
      {lead.stage === "Deferred" && lead.deferredUntil && (
        <span className="text-ink-4 whitespace-nowrap tabular-nums">· till {fmtShortDate(lead.deferredUntil)}</span>
      )}
    </span>
  );
}

function FollowUp({ lead, now }) {
  const f = fmtFollowUp(lead, now);
  return (
    <span className={`tabular-nums whitespace-nowrap ${f.late ? "text-red-700" : f.empty ? "text-ink-4" : "text-ink-3"}`}>
      {f.text}
    </span>
  );
}

function Chip({ onClick, active, children, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`h-7 inline-flex items-center gap-1.5 rounded-md border px-2 text-small whitespace-nowrap transition-colors duration-150 ${
        active ? "border-line-strong bg-surface-hover text-ink" : "border-line-control bg-white text-ink-3 hover:text-ink hover:border-line-strong"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Checkbox({ checked, indeterminate, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="h-3.5 w-3.5 rounded accent-ink cursor-pointer"
    />
  );
}

function FollowUpPicker({ onPick }) {
  const [date, setDate] = useState("");
  return (
    <>
      <MenuHeading>Next follow-up</MenuHeading>
      {[
        ["Later today", () => roundQuarter(new Date(Date.now() + 3 * 3600000))],
        ["Tomorrow", () => atTen(1)],
        ["In 3 days", () => atTen(3)],
        ["Next week", () => atTen(7)],
      ].map(([label, fn]) => (
        <MenuItem key={label} onClick={() => onPick(fn())}>
          {label}
        </MenuItem>
      ))}
      <div className="px-2 py-1.5">
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (e.target.value) onPick(new Date(`${e.target.value}T10:00:00`));
          }}
          className="w-full h-8 rounded-md border border-line-control px-2 text-body outline-none focus:border-line-heavy"
        />
      </div>
      <MenuSep />
      <MenuItem onClick={() => onPick(null)}>
        <span className="text-ink-4">Clear follow-up</span>
      </MenuItem>
    </>
  );
}

/* ---------- Modals ---------- */

function Modal({ title, onClose, children, width = 440 }) {
  const boxRef = useRef(null);
  const [opener] = useState(() => document.activeElement);
  useEffect(() => () => { if (opener && opener.isConnected) setTimeout(() => opener.focus?.(), 0); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key === "Tab" && boxRef.current) {
        const f = [...boxRef.current.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (!boxRef.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[65] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/20" onClick={() => onClose?.()} />
      <div ref={boxRef} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} className="cw-modal relative w-full rounded-xl border border-line-control bg-white shadow-modal" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between px-5 h-12 border-b border-line">
          <div className="text-body-lg font-semibold">{title}</div>
          {onClose && (
            <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center text-ink-4 hover:bg-surface-hover hover:text-ink" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

const PrimaryButton = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`${btn("primary", "md")} ${className}`}
  >
    {children}
  </button>
);

const SecondaryButton = ({ children, className = "", ...props }) => (
  <button
    {...props}
    className={`${btn("secondary", "md")} ${className}`}
  >
    {children}
  </button>
);

function StageExtraModal({ pending, count, onCancel, onConfirm }) {
  const [reason, setReason] = useState("Price");
  const [date, setDate] = useState(() => atTen(14).toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const isLost = pending.stage === "Lost";
  const who = count === 1 ? "this lead" : `${count} leads`;
  return (
    <Modal title={isLost ? `Mark ${who} as lost` : `Defer ${who}`} onClose={onCancel} width={400}>
      <div className="p-5">
        {isLost ? (
          <>
            <div className="text-small leading-4 text-ink-4 mb-2">Reason</div>
            <div className="space-y-0.5">
              {LOST_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 h-8 px-2 -mx-2 rounded-md text-body cursor-pointer hover:bg-surface-sidebar">
                  <input type="radio" name="lost-reason" checked={reason === r} onChange={() => setReason(r)} className="accent-ink" />
                  {r}
                </label>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-small leading-4 text-ink-4 mb-2">Reconnect on</div>
            <input
              type="date"
              autoFocus
              value={date}
              min={new Date(Date.now() + DAY).toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-9 rounded-md border border-line-control px-3 text-body outline-none focus:border-line-heavy"
            />
            <div className="mt-2 text-small leading-4 text-ink-4">A follow-up will be set for this date.</div>
            <div className="text-small leading-4 text-ink-4 mt-4 mb-2">Note</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. In-laws visiting till 22 Nov"
              className="w-full rounded-md border border-line-control px-3 py-2 text-body outline-none resize-none placeholder:text-ink-placeholder focus:border-line-heavy"
            />
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 px-5 pb-5">
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
        <PrimaryButton
          disabled={!isLost && !date}
          onClick={() => onConfirm(isLost ? { lostReason: reason } : { deferredUntil: new Date(`${date}T10:00:00`), deferNote: note.trim() })}
        >
          {isLost ? "Mark as lost" : "Defer"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function Field({ label, required, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-small leading-4 text-ink-3 mb-1.5">
        {label}
        {required && <span className="text-brand"> *</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full h-9 rounded-md border border-line-control bg-white px-3 text-body text-ink outline-none transition-colors duration-150 placeholder:text-ink-placeholder focus:border-line-heavy";

// Searchable dropdown (used for Hospital)
function SearchSelect({ value, onChange, options, placeholder = "Search…" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(ref, close, open);
  const list = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));

  const pick = (o) => {
    onChange(o);
    setQ("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        value={open ? q : value}
        onFocus={() => {
          setOpen(true);
          setIdx(0);
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setIdx(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIdx((i) => Math.min(i + 1, list.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && open && list[idx]) {
            e.preventDefault();
            pick(list[idx]);
          } else if (e.key === "Escape" && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        placeholder={value || placeholder}
        className={`${inputCls} pr-8`}
      />
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-4" />
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto rounded-lg border border-line-control bg-white p-1 shadow-pop">
          {list.length === 0 ? (
            <div className="px-2 py-2 text-body text-ink-4">No matches</div>
          ) : (
            list.map((o, i) => (
              <button
                type="button"
                key={o}
                onMouseEnter={() => setIdx(i)}
                onClick={() => pick(o)}
                className={`w-full flex items-center h-8 px-2 rounded-md text-body text-left ${i === idx ? "bg-surface-hover" : ""}`}
              >
                <span className="flex-1">{o}</span>
                {o === value && <Check className="h-3.5 w-3.5 text-ink-3" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NewLeadModal({ leads, onClose, onCreate, onOpenExisting }) {
  const [f, setF] = useState({ phone: "", name: "", status: "P", date: "", hospital: "", zone: "", source: "", priority: "Medium" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target ? e.target.value : e }));
  const d = mobileDigits(f.phone);
  const valid = /^[6-9]\d{9}$/.test(d);
  const [touched, setTouched] = useState(false);
  const dateVal = f.date ? new Date(`${f.date}T00:00:00`) : null;
  const today0 = startOfDay(new Date());
  const dateError = !dateVal
    ? null
    : f.status === "P"
      ? dateVal < new Date(+today0 - 14 * DAY) || dateVal > new Date(+today0 + 42 * 7 * DAY) ? "Due date should be between 2 weeks ago and 42 weeks from today." : null
      : dateVal > today0 ? "Birth date can't be in the future." : null;
  const existing = d.length === 10 ? leads.find((l) => digits(l.phone) === d) : null;

  const sent = useRef(false); // ignore a second click while the first save is still going through
  const submit = () => {
    setTouched(true);
    if (!valid || existing || dateError || sent.current) return;
    sent.current = true;
    onCreate({ ...f, phone: `+91 ${d.slice(0, 5)} ${d.slice(5)}` });
  };

  return (
    <Modal title="New lead" onClose={onClose} width={520}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-4">
          <Field label="Number" required className="col-span-2">
            <div className="flex">
              <span className="h-9 px-3 flex items-center rounded-l-md border border-r-0 border-line-control bg-surface-subtle text-body text-ink-4">+91</span>
              <input autoFocus value={f.phone} onChange={set("phone")} onBlur={() => d.length && setTouched(true)} placeholder="98450 12345" inputMode="tel" aria-invalid={touched && !valid} className={`${inputCls} rounded-l-none tabular-nums ${touched && !valid ? "border-red-300" : ""}`} />
            </div>
            {existing ? (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-2 text-small text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">
                  Lead already exists: <span className="font-medium">{existing.name}</span> · {existing.customerId} · {existing.stage}
                </span>
                <button type="button" onClick={() => onOpenExisting(existing)} className="font-medium underline underline-offset-2">
                  Open
                </button>
              </div>
            ) : (
              d.length > 0 && !valid && (touched || d.length >= 10) ? (
                <div role="alert" className="mt-1.5 text-small text-red-700">Enter a 10-digit mobile number starting with 6–9 ({d.length} digits so far).</div>
              ) : (
                !d.length && <div className="mt-1.5 text-small text-ink-4">We'll check it against existing leads</div>
              )
            )}
          </Field>
          <Field label="Name" className="col-span-2">
            <input value={f.name} onChange={set("name")} placeholder="Full name" maxLength={80} className={inputCls} />
          </Field>
          <Field label="Care stage">
            <div className="flex h-9 rounded-md border border-line-control p-0.5">
              {[
                ["P", "Pregnancy"],
                ["B", "Born"],
              ].map(([k, label]) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setF((s) => ({ ...s, status: k }))}
                  className={`flex-1 rounded text-small transition-colors duration-150 ${f.status === k ? "bg-surface-active text-ink font-medium" : "text-ink-4 hover:text-ink"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <Field label={f.status === "P" ? "Due date" : "Baby date of birth"}>
            <input type="date" value={f.date} onChange={set("date")} aria-invalid={!!dateError} className={`${inputCls} ${dateError ? "border-red-300" : ""}`} />
            {dateError && <div role="alert" className="mt-1.5 text-small text-red-700">{dateError}</div>}
          </Field>
          <Field label="Hospital">
            <SearchSelect value={f.hospital} onChange={(v) => setF((s) => ({ ...s, hospital: v }))} options={HOSPITALS} placeholder="Search hospital" />
          </Field>
          {[
            ["zone", "Area / zone", ZONES],
            ["source", "Lead source", SOURCES],
            ["priority", "Priority", PRIORITIES],
          ].map(([k, label, opts]) => (
            <Field key={k} label={label}>
              <select value={f[k]} onChange={set(k)} className={`${inputCls} ${f[k] ? "" : "text-ink-4"}`}>
                <option value="">Select</option>
                {opts.map((o) => (
                  <option key={o} value={o} className="text-ink">
                    {o}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-line">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={!valid || !!existing || !!dateError}>
            Create lead
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Side panel ---------- */

function PanelSection({ title, children }) {
  return (
    <section className="mt-7">
      <div className="text-small leading-4 font-medium text-ink-4 pb-2 border-b border-line">{title}</div>
      <dl className="mt-1">{children}</dl>
    </section>
  );
}

function PanelRow({ label, auto, children }) {
  return (
    <div className="flex gap-4 py-2 text-body">
      <dt className="w-[132px] shrink-0 text-ink-4 flex items-center gap-1">
        {label}
        {auto && <span className="text-ink-4">· auto</span>}
      </dt>
      <dd className="min-w-0 flex-1 text-ink">{children}</dd>
    </div>
  );
}

const Muted = ({ children = "—" }) => <span className="text-ink-4">{children}</span>;

function DotLabel({ dot, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

function ServiceTags({ services, max }) {
  if (!services?.length) return <Muted />;
  const shown = max ? services.slice(0, max) : services;
  const rest = services.length - shown.length;
  return (
    <span className={`flex items-center gap-1 ${max ? "overflow-hidden" : "flex-wrap"}`}>
      {shown.map((s) => (
        <span key={s} className="shrink-0 rounded-md border border-line-control bg-white px-1.5 py-px text-small text-ink-2 whitespace-nowrap">
          {s}
        </span>
      ))}
      {rest > 0 && <span className="shrink-0 text-small text-ink-4 tabular-nums">+{rest}</span>}
    </span>
  );
}

function WeightsList({ weights }) {
  if (!weights?.length) return <Muted />;
  if (weights.length === 1) return <span className="tabular-nums">{weights[0].toFixed(1)} kg</span>;
  return (
    <span className="flex flex-col gap-0.5">
      {weights.map((w, i) => (
        <span key={i} className="flex justify-between gap-4 tabular-nums">
          <span className="text-ink-4">Baby {i + 1}</span>
          <span>{w.toFixed(1)} kg</span>
        </span>
      ))}
    </span>
  );
}

// ── Gestures ─────────────────────────────────────────────────────────────────
// Phone bottom sheets: drag the handle or header down to close.
// While the finger is down the sheet follows it 1:1 (direct transform writes, no re-renders);
// on release, distance (30% of the sheet) or a quick flick closes it, otherwise it settles back.
// The backdrop fades in step with the drag so both always agree.
const SHEET_EASE = "cubic-bezier(0.32, 0.72, 0, 1)"; // the iOS-style sheet curve (as in Vaul)
function useSheetDrag(panelRef, backdropRef, onClose) {
  return (e) => {
    const el = panelRef.current;
    if (!el || !window.matchMedia("(max-width: 767px)").matches) return;
    if (e.button !== 0 || e.target.closest("button, a, input, textarea, select")) return;
    const h = el.getBoundingClientRect().height;
    const y0 = e.clientY;
    let dy = 0, lastY = y0, lastT = performance.now(), v = 0;
    el.style.transition = "none";
    if (backdropRef?.current) backdropRef.current.style.transition = "none";
    const move = (ev) => {
      const raw = ev.clientY - y0;
      dy = raw < 0 ? raw * 0.2 : raw; // pulling up meets resistance instead of a wall
      const t = performance.now();
      v = (ev.clientY - lastY) / Math.max(1, t - lastT);
      lastY = ev.clientY; lastT = t;
      el.style.transform = `translateY(${dy}px)`;
      if (backdropRef?.current) backdropRef.current.style.opacity = String(Math.max(0, 1 - dy / h));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const close = dy > h * 0.3 || (v > 0.5 && dy > 24);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.style.transition = reduce ? "transform 150ms ease-out" : `transform 500ms ${SHEET_EASE}`;
      el.style.transform = "";
      if (backdropRef?.current) {
        backdropRef.current.style.transition = `opacity 500ms ${SHEET_EASE}`;
        backdropRef.current.style.opacity = "";
      }
      if (close) onClose?.();
      setTimeout(() => {
        el.style.transition = "";
        if (backdropRef?.current) backdropRef.current.style.transition = "";
      }, 520);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
}
// Shared classes: a right-hand panel on desktop, a bottom sheet on phones
const sheetCls = (open, width = "max-w-[400px]") =>
  `fixed inset-y-0 right-0 z-50 w-full ${width} bg-white border-l border-line flex flex-col transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] ` +
  `max-md:top-auto max-md:h-[92dvh] max-md:max-w-none max-md:rounded-t-2xl max-md:border-l-0 max-md:shadow-modal max-md:ease-[cubic-bezier(0.32,0.72,0,1)] ` +
  (open ? "translate-x-0 translate-y-0 duration-[400ms] max-md:duration-500" : "md:translate-x-full max-md:translate-y-full duration-[350ms] max-md:duration-500");
const SheetHandle = () => (
  <div className="md:hidden shrink-0 flex justify-center pt-2 pb-1 cursor-grab touch-none" data-sheet-grab aria-hidden="true">
    <span className="h-1 w-10 rounded-full bg-line-strong" />
  </div>
);

// Swipe a row on touch screens: right = done, left = snooze.
// Vertical movement is left to the page so the list still scrolls; a horizontal drag follows the finger 1:1.
// Release past 35% of the row or with a quick flick commits; otherwise it springs back.
function useRowSwipe(rowRef, layerRef, { onRight, onLeft }) {
  const st = useRef(null);
  const swiped = useRef(false);
  const onPointerDown = (e) => {
    if (e.pointerType !== "touch" || (!onRight && !onLeft)) return;
    st.current = { x0: e.clientX, y0: e.clientY, dx: 0, axis: null, lastX: e.clientX, lastT: performance.now(), v: 0, past: false, id: e.pointerId };
    swiped.current = false;
  };
  const onPointerMove = (e) => {
    const s = st.current, el = rowRef.current;
    if (!s || !el) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (!s.axis) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { st.current = null; return; }
      if (Math.abs(dx) < 8) return;
      s.axis = "x";
      el.setPointerCapture?.(s.id);
      el.style.transition = "none";
      if (layerRef.current) layerRef.current.style.opacity = "1";
    }
    const w = el.offsetWidth;
    const allowed = (dx > 0 && onRight) || (dx < 0 && onLeft);
    const limit = w * 0.6;
    let x = allowed ? dx : dx * 0.15;
    if (Math.abs(x) > limit) x = Math.sign(x) * (limit + (Math.abs(x) - limit) * 0.2);
    s.dx = x;
    const t = performance.now();
    s.v = (e.clientX - s.lastX) / Math.max(1, t - s.lastT);
    s.lastX = e.clientX; s.lastT = t;
    el.style.transform = `translateX(${x}px)`;
    const past = allowed && Math.abs(x) > w * 0.35;
    if (past !== s.past) { s.past = past; if (past) navigator.vibrate?.(6); layerRef.current?.setAttribute("data-past", past ? "1" : ""); }
  };
  const end = (cancel) => {
    const s = st.current, el = rowRef.current;
    st.current = null;
    if (!s || !s.axis || !el) return;
    swiped.current = true;
    const w = el.offsetWidth;
    const dir = Math.sign(s.dx);
    const commit = !cancel && ((dir > 0 && onRight) || (dir < 0 && onLeft)) && (Math.abs(s.dx) > w * 0.35 || (Math.abs(s.v) > 0.6 && Math.sign(s.v) === dir && Math.abs(s.dx) > 30));
    const reset = () => { el.style.transition = ""; el.style.transform = ""; if (layerRef.current) { layerRef.current.style.opacity = ""; layerRef.current.setAttribute("data-past", ""); } };
    if (commit) {
      el.style.transition = "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.transform = `translateX(${dir * w}px)`;
      setTimeout(() => { (dir > 0 ? onRight : onLeft)(); }, 170);
      setTimeout(reset, 600); // ready again if the action is undone
    } else {
      el.style.transition = "transform 260ms cubic-bezier(0.34, 1.36, 0.64, 1)";
      el.style.transform = "";
      setTimeout(reset, 280);
    }
  };
  return {
    onPointerDown, onPointerMove,
    onPointerUp: () => end(false),
    onPointerCancel: () => end(true),
    onClickCapture: (e) => { if (swiped.current) { e.stopPropagation(); e.preventDefault(); swiped.current = false; } },
  };
}

// Side panels: move focus in on open, Esc closes, focus goes back to whatever opened it
function usePanelFocus(open, ref, onClose) {
  const opener = useRef(null);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 30);
    const k = (e) => {
      if (e.key !== "Escape" || document.querySelector('[role="dialog"]')) return;
      e.stopPropagation();
      onClose?.();
    };
    window.addEventListener("keydown", k);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", k);
      const o = opener.current;
      if (o && o.isConnected && ref.current?.contains(document.activeElement) !== false) setTimeout(() => o.focus?.({ preventScroll: true }), 0);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
}

function LeadPanel({ lead, now, onClose, onSnooze, onToast, onOpenRecord }) {
  const [snoozeAnchor, setSnoozeAnchor] = useState(null);
  const open = !!lead;
  const [shown, setShown] = useState(lead);
  useEffect(() => {
    if (lead) setShown(lead);
  }, [lead]);
  const l = lead || shown;
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  usePanelFocus(open, panelRef, onClose);
  const grab = useSheetDrag(panelRef, backdropRef, onClose);
  // On touch, a card opens the sheet as the finger lifts; the browser's follow-up click must not land on the backdrop and close it
  const openedAt = useRef(0);
  useEffect(() => { if (open) openedAt.current = Date.now(); }, [open]);

  const activities = l
    ? (LIVE.timelines[l.id] || buildTimeline(l))
        .map((ev) => [ev, describeEvent(ev)])
        .filter(([, d]) => d)
        .slice(0, 5)
        .map(([ev, d]) => ({ label: [d[1], d[2]].filter(Boolean).join(" · "), at: fmtRel(now - ev.at) }))
    : [];

  const born = l?.careKind === "B";
  const days = l ? serviceDays(l) : null;

  return (
    <>
    <div ref={backdropRef} onClick={() => Date.now() - openedAt.current > 450 && onClose()} aria-hidden="true" className={`md:hidden fixed inset-0 z-40 bg-black/25 transition-opacity duration-500 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
    <aside
      ref={panelRef}
      tabIndex={-1}
      inert={!open}
      aria-label="Lead preview"
      onPointerDown={(e) => e.target.closest("[data-sheet-grab]") && grab(e)}
      className={`${sheetCls(open, "max-w-[420px]")} md:shadow-panel`}
    >
      <SheetHandle />
      {l && (
        <>
          <div data-sheet-grab className="flex items-center justify-between h-12 px-5 border-b border-line max-md:touch-none">
            <span className="text-small leading-4 text-ink-4 tabular-nums">{l.customerId}</span>
            <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center text-ink-4 hover:bg-surface-hover hover:text-ink" aria-label="Close panel">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10">
            <div className="flex items-center gap-3">
              <Avatar name={l.name} size="lg" />
              <div className="min-w-0">
                <div className="text-title font-semibold tracking-[-0.01em] truncate">{l.name}</div>
                <div className="text-body text-ink-4 tabular-nums">{l.phone}</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-1.5">
              <SecondaryButton onClick={() => openWhatsApp(l.phone)} className="px-0 flex items-center justify-center gap-1.5 text-small">
                <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
              </SecondaryButton>
              <SecondaryButton onClick={() => openCall(l.phone)} className="px-0 flex items-center justify-center gap-1.5 text-small">
                <Phone className="h-3.5 w-3.5 shrink-0" /> Call
              </SecondaryButton>
              <SecondaryButton onClick={(e) => setSnoozeAnchor(snoozeAnchor ? null : e.currentTarget)} className="px-0 flex items-center justify-center gap-1.5 text-small">
                <AlarmClock className="h-3.5 w-3.5 shrink-0" /> Snooze
              </SecondaryButton>
              <SecondaryButton onClick={() => onOpenRecord(l.id)} className="px-0 flex items-center justify-center gap-1.5 text-small">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" /> Open
              </SecondaryButton>
            </div>
            {snoozeAnchor && (
              <FixedMenu anchor={snoozeAnchor} onClose={() => setSnoozeAnchor(null)} width={220}>
                <FollowUpPicker
                  onPick={(d) => {
                    setSnoozeAnchor(null);
                    onSnooze(l, d);
                  }}
                />
              </FixedMenu>
            )}

            <PanelSection title="Baby">
              <PanelRow label="Care stage">{born ? "Born" : "Pregnancy"}</PanelRow>
              {born ? (
                <>
                  <PanelRow label="Date of birth"><span className="tabular-nums">{fmtDate(l.babyDob)}</span></PanelRow>
                  <PanelRow label="Baby age" auto><span className="tabular-nums">{babyAge(l, now)}</span></PanelRow>
                </>
              ) : (
                <PanelRow label="Due date">
                  <span className="tabular-nums">{fmtDate(l.dueDate)}</span> <span className="text-ink-4">· {(careStage(l, now).split(" · ")[1] || "—")}</span>
                </PanelRow>
              )}
              <PanelRow label="Number of babies">
                <span className="tabular-nums">{l.babies}</span>
                {l.babies === 2 && <span className="text-ink-4"> · twins</span>}
                {l.babies === 3 && <span className="text-ink-4"> · triplets</span>}
              </PanelRow>
              {born && (
                <>
                  <PanelRow label="Birth weight"><WeightsList weights={l.birthWeights} /></PanelRow>
                  <PanelRow label="Current weight"><WeightsList weights={l.currentWeights} /></PanelRow>
                </>
              )}
            </PanelSection>

            <PanelSection title="Service">
              <PanelRow label="Required service"><ServiceTags services={l.services} /></PanelRow>
              <PanelRow label="Shift"><span className="tabular-nums">{!l.shiftType ? "—" : l.shiftType === "24 hrs" ? "24 hrs (round the clock)" : `${l.shiftType} · ${l.shiftHours} hrs`}</span></PanelRow>
              <PanelRow label="Care start"><span className="tabular-nums">{fmtDate(l.careStart)}</span></PanelRow>
              <PanelRow label="Care end"><span className="tabular-nums">{fmtDate(l.careEnd)}</span></PanelRow>
              <PanelRow label="Service days" auto><span className="tabular-nums">{days ?? "—"}</span></PanelRow>
              <PanelRow label="Package">{l.package || <Muted />}</PanelRow>
            </PanelSection>

            <PanelSection title="Sales">
              <PanelRow label="Sales stage"><StageLabel lead={l} /></PanelRow>
              {l.stage === "Lost" && <PanelRow label="Lost reason">{l.lostReason || <Muted />}</PanelRow>}
              {l.stage === "Deferred" && (
                <PanelRow label="Deferred until">
                  <span className="tabular-nums">{fmtDate(l.deferredUntil)}</span>
                  {l.deferNote && <span className="block text-small text-ink-4 mt-0.5">{l.deferNote}</span>}
                </PanelRow>
              )}
              <PanelRow label="Priority"><span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[leadPriority(l)]}`} />{leadPriority(l)}</span></PanelRow>
              <PanelRow label="Lead source">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-ink-4"><SourceIcon source={l.source} /></span>
                  {l.source}
                </span>
              </PanelRow>
              <PanelRow label="Last interaction">
                {l.lastActivity.none ? <Muted>No interactions</Muted> : <span className="tabular-nums">{l.lastActivity.type} · {fmtRel(now - l.lastActivity.at)}</span>}
              </PanelRow>
              <PanelRow label="Next follow-up"><FollowUp lead={l} now={now} /></PanelRow>
              <PanelRow label="Created"><span className="tabular-nums">{fmtDate(l.createdAt)}</span></PanelRow>
            </PanelSection>

            <PanelSection title="Location">
              <PanelRow label="Hospital">{l.hospital || <Muted />}</PanelRow>
              <PanelRow label="Area / zone">{l.zone || <Muted />}</PanelRow>
              <PanelRow label="Full address"><span className="leading-snug">{l.address || <Muted />}</span></PanelRow>
            </PanelSection>

            <PanelSection title="Payment">
              <PanelRow label="Payment status"><DotLabel dot={PAYMENT_DOT[l.paymentStatus]}>{l.paymentStatus}</DotLabel></PanelRow>
              <PanelRow label="Amount paid"><span className="tabular-nums">{l.amountPaid ? fmtINR(l.amountPaid) : <Muted>₹0</Muted>}</span></PanelRow>
              <PanelRow label="Booking status"><DotLabel dot={BOOKING_DOT[l.bookingStatus]}>{l.bookingStatus}</DotLabel></PanelRow>
            </PanelSection>

            <section className="mt-8">
              <div className="text-small leading-4 font-medium text-ink-4 pb-2 border-b border-line">Recent activity</div>
              <ol className="mt-3">
                {activities.map((a, i) => (
                  <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < activities.length - 1 && <span className="absolute left-[3px] top-3 bottom-0 w-px bg-surface-active" />}
                    <span className={`relative mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${i === 0 ? "bg-ink" : "bg-line-strong"}`} />
                    <div className="flex-1 text-body">
                      <div>{a.label}</div>
                      <div className="text-small leading-4 text-ink-4 tabular-nums">{a.at}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </>
      )}
    </aside>
    </>
  );
}

/* ---------- Board ---------- */

function LeadBoard({ rows, now, onOpen, onMove, panelId }) {
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);

  return (
    <div className="h-full overflow-x-auto px-5 md:px-8 pb-6">
      <div className="flex gap-3 h-full min-w-max">
        {STAGES.map((s) => {
          const cards = rows.filter((l) => l.stage === s.id);
          const over = overStage === s.id;
          return (
            <div
              key={s.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (overStage !== s.id) setOverStage(s.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOverStage(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setOverStage(null);
                setDragId(null);
                const lead = rows.find((l) => l.id === id);
                if (lead && lead.stage !== s.id) onMove([id], s.id);
              }}
              className={`w-[264px] shrink-0 flex flex-col rounded-lg transition-colors duration-150 ${over ? "bg-surface-hover" : "bg-surface-subtle"}`}
            >
              <div className="flex items-center gap-2 h-10 px-3 text-small leading-4 font-medium text-ink-3">
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {s.id}
                <span className="text-ink-4 tabular-nums">{cards.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {cards.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", l.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(l.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                    onClick={() => onOpen(l.id)}
                    className={`rounded-lg border bg-white p-3 text-body cursor-grab active:cursor-grabbing transition-[border-color,opacity] duration-150 hover:border-line-strong ${
                      dragId === l.id ? "opacity-40" : ""
                    } ${panelId === l.id ? "border-line-heavy" : "border-line"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar name={l.name} />
                      <span className="font-medium truncate">{l.name}</span>
                    </div>
                    <div className="mt-2 text-small leading-4 text-ink-3">{careStage(l, now)}</div>
                    {(l.stage === "Lost" || l.stage === "Deferred") && (
                      <div className="mt-0.5 text-small leading-4 text-ink-4 tabular-nums">
                        {l.stage === "Lost" ? l.lostReason : l.deferredUntil && `Till ${fmtShortDate(l.deferredUntil)}`}
                      </div>
                    )}
                    <div className="mt-2.5 flex items-center justify-between text-small leading-4">
                      <span className="text-ink-4">{l.package || "No package"}</span>
                      <FollowUp lead={l} now={now} />
                    </div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <div className={`h-16 rounded-lg border border-dashed flex items-center justify-center text-small leading-4 text-ink-4 ${over ? "border-line-heavy" : "border-line-control"}`}>
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Table chrome: header icons, source icons, actor chips ---------- */

function InstagramIcon({ className = "h-3.5 w-3.5" }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </svg>
  );
}

function SourceIcon({ source }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  switch (source) {
    case "Meta ad":
      return <InfinityIcon className={cls} strokeWidth={2} />;
    case "Instagram":
      return <InstagramIcon className={cls} />;
    case "WhatsApp":
      return <WhatsAppIcon className={cls} />;
    case "Website":
      return <Globe className={cls} strokeWidth={1.75} />;
    case "Hospital referral":
      return <Building2 className={cls} strokeWidth={1.75} />;
    default:
      return <Users className={cls} strokeWidth={1.75} />;
  }
}

function ColumnHeading({ icon: Icon, label, ai, align }) {
  return (
    <span className={`flex items-center gap-1.5 ${align === "right" ? "" : ""}`}>
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-ink-faint" strokeWidth={1.75} />}
      <span className={`truncate ${align === "right" ? "flex-1 text-right" : ""}`}>{label}</span>
      {ai && <span className="shrink-0 text-caption font-normal text-ink-4" title={AUTO_HINT}>· auto</span>}
    </span>
  );
}

function HeaderIconButton({ title, active, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`h-8 min-w-8 px-2 rounded-md flex items-center justify-center gap-1 text-small tabular-nums transition-colors duration-150 ${
        active ? "bg-surface-active text-ink" : "text-ink-3 hover:bg-surface-hover hover:text-ink"
      }`}
    >
      <span className="sr-only">{title}</span>
      {children}
    </button>
  );
}

/* ---------- Page ---------- */

/* ==========================================================================
   LEAD RECORD PAGE
   ========================================================================== */

const PIPELINE = ["New", "Qualified", "Consult booked", "Consult done", "Payment pending", "Won"];

const NEXT_ACTION_BY_STAGE = {
  New: "First call to understand needs",
  Qualified: "Book a consult",
  "Consult booked": "Consult call",
  "Consult done": "Share plan and payment link",
  "Payment pending": "Check on the payment link",
  Won: "Onboarding call before care starts",
  Deferred: "Reconnect as promised",
  Lost: "",
};

const WA_TEMPLATE_TEXT = {
  Welcome: (l) =>
    `Hi ${firstName(l)}, this is the Cradlewell care team. Thank you for reaching out. I'd love to understand how you and your baby are doing and what support would help most at home. Is now a good time for a quick call?`,
  "Package details": (l) =>
    `Hi ${firstName(l)}, sharing the details of the ${l.package || "Together"} care plan: ${(l.services || []).join(", ").toLowerCase() || "newborn and mother care"}, ${l.shiftType ? `${l.shiftType.toLowerCase()} shifts of ${l.shiftHours} hrs` : "flexible shifts"}, with a care coordinator checking in every week. Happy to walk you through it.`,
  "Payment link": (l) =>
    `Hi ${firstName(l)}, here is the secure payment link for your ${l.package || ""} plan (${fmtINR(packageValue(l))}): https://pay.cradlewell.com/${l.customerId}. Your care starts ${l.careStart ? `on ${fmtShortDate(l.careStart)}` : "on the date we agreed"}.`,
  "Payment reminder": (l) =>
    `Hi ${firstName(l)}, a gentle reminder about the payment link for your care plan. Once it's done we'll confirm your caregiver and share their profile. Let me know if you have any questions.`,
  "Consult reminder": (l) =>
    `Hi ${firstName(l)}, a reminder about your consult with our care team. We'll talk through your baby's routine, your recovery and the right plan. Reply here if you need to reschedule.`,
};

const firstName = (l) => l.name.split(" ")[0];
// Latest unanswered WhatsApp per lead (mock), shown as the reason to reply
const UNREAD_TEXT = {};
const uid = () => `e${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
const ago = (mins) => new Date(Date.now() - mins * 60000);
const toLocalInput = (d) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 16);
};

/* ---------- Timelines ---------- */

// Starting history per lead (from the old activity log), filled in by the app root after loading.
// Once anything is logged against a lead, its full list lives in `timelines` state and is saved.
const SEED_TIMELINES = {};
// Latest saved timelines, for components that only receive a lead (set by the app root each render)
const LIVE = { timelines: {} };
function buildTimeline(l) {
  if (!SEED_TIMELINES[l.id]) SEED_TIMELINES[l.id] = [{ id: `created-${l.id}`, type: "created", by: ME, at: l.createdAt, source: l.source }];
  return SEED_TIMELINES[l.id];
}

/* ---------- Small pieces ---------- */

function AutoBadge() {
  return <span className="text-ink-4" title={AUTO_HINT}>· auto</span>;
}

/* ---------- Inline-editable properties (left panel) ---------- */

const valueBtn =
  "w-full min-h-[28px] -mx-1.5 px-1.5 rounded-md text-left flex items-center transition-colors duration-150 hover:bg-surface-active";
const Empty = ({ label }) => <span className="text-ink-4">{label || "Empty"}</span>;

function ReadOnly({ children }) {
  return <div className="min-h-[28px] flex items-center text-ink-3">{children}</div>;
}

function EditSelect({ value, options, onSave, render, searchable, width = 220, emptyLabel }) {
  const [anchor, setAnchor] = useState(null);
  const [q, setQ] = useState("");
  const close = useCallback(() => {
    setAnchor(null);
    setQ("");
  }, []);
  const list = options.filter((o) => String(o).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <button onClick={(e) => setAnchor(anchor ? null : e.currentTarget)} className={`${valueBtn} ${anchor ? "bg-surface-active" : ""}`}>
        {value == null || value === "" ? <Empty label={emptyLabel} /> : render ? render(value) : <span className="truncate">{value}</span>}
      </button>
      {anchor && (
        <FixedMenu anchor={anchor} onClose={close} width={width}>
          {searchable && (
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && list[0] != null) {
                  onSave(list[0]);
                  close();
                }
              }}
              placeholder="Search"
              className="w-full h-8 mb-1 rounded-md border border-line-control px-2 text-body outline-none focus:border-line-heavy"
            />
          )}
          {list.map((o) => (
            <MenuItem
              key={String(o)}
              onClick={() => {
                close();
                if (o !== value) onSave(o);
              }}
            >
              <span className="flex-1 flex items-center gap-2">{render ? render(o) : o}</span>
              {o === value && <Check className="h-3.5 w-3.5 text-ink-3" />}
            </MenuItem>
          ))}
          {list.length === 0 && <div className="px-2 py-2 text-body text-ink-4">No matches</div>}
        </FixedMenu>
      )}
    </>
  );
}

function EditDate({ value, onSave, withTime, display, emptyLabel }) {
  const [anchor, setAnchor] = useState(null);
  const close = useCallback(() => setAnchor(null), []);
  const toInput = (d) => (withTime ? toLocalInput(d) : toLocalInput(d).slice(0, 10));
  return (
    <>
      <button onClick={(e) => setAnchor(anchor ? null : e.currentTarget)} className={`${valueBtn} ${anchor ? "bg-surface-active" : ""}`}>
        {value ? <span className="tabular-nums truncate">{display ? display(value) : fmtDate(value)}</span> : <Empty label={emptyLabel} />}
      </button>
      {anchor && (
        <FixedMenu anchor={anchor} onClose={close} width={230}>
          <div className="p-1.5">
            <input
              autoFocus
              type={withTime ? "datetime-local" : "date"}
              defaultValue={value ? toInput(value) : ""}
              onChange={(e) => {
                if (!e.target.value) return;
                onSave(withTime ? new Date(e.target.value) : startOfDay(new Date(`${e.target.value}T00:00:00`)));
              }}
              className="w-full h-8 rounded-md border border-line-control px-2 text-body outline-none focus:border-line-heavy"
            />
          </div>
          <MenuSep />
          <MenuItem
            onClick={() => {
              close();
              onSave(null);
            }}
          >
            <span className="text-ink-4">Clear</span>
          </MenuItem>
        </FixedMenu>
      )}
    </>
  );
}

/* ---------- Timeline ---------- */

/* ---------- Composer ---------- */

function Composer({ lead, tab, setTab, focusKey, onWhatsApp, onNote, onCall, onFollowUp, only, prefill, placeholder: customPlaceholder, onAttach }) {
  const [text, setText] = useState("");
  const [tplIdx, setTplIdx] = useState(0);
  const [call, setCall] = useState({ duration: "", outcome: "Interested", notes: "" });
  const [fu, setFu] = useState(() => ({ when: toLocalInput(atTen(1)), action: lead.nextAction || NEXT_ACTION_BY_STAGE[lead.stage] || "" }));
  const ref = useRef(null);

  useEffect(() => {
    if (focusKey) ref.current?.focus();
  }, [focusKey]);
  useEffect(() => {
    if (prefill?.text) {
      setText(prefill.text);
      setTimeout(() => ref.current?.focus(), 0);
    }
  }, [prefill]);

  const slash = tab === "whatsapp" && /^\/[\w ]*$/.test(text);
  const q = slash ? text.slice(1).toLowerCase() : "";
  const templates = Object.keys(WA_TEMPLATE_TEXT).filter((t) => t.toLowerCase().includes(q));

  const pickTemplate = (t) => {
    setText(WA_TEMPLATE_TEXT[t](lead));
    setTplIdx(0);
    setTimeout(() => ref.current?.focus(), 0);
  };
  const send = () => {
    const v = text.trim();
    if (!v || slash) return;
    if (tab === "whatsapp") onWhatsApp(v);
    else onNote(v);
    setText("");
  };

  const tabs = [
    ["whatsapp", "WhatsApp"],
    ["note", "Note"],
    ["call", "Log call"],
    ["followup", "Follow-up"],
  ];

  return (
    <div className="border-t border-line bg-white px-4 md:px-8 py-3">
      <div className="relative rounded-xl border border-line-control focus-within:border-line-heavy transition-colors duration-150">
        {slash && templates.length > 0 && (
          <div className="absolute left-2 bottom-full mb-2 w-72 rounded-lg border border-line-control bg-white p-1 shadow-pop z-20">
            <MenuHeading>WhatsApp templates</MenuHeading>
            {templates.map((t, i) => (
              <button
                key={t}
                onMouseEnter={() => setTplIdx(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickTemplate(t)}
                className={`w-full flex items-center gap-2 h-8 px-2 rounded-md text-body text-left ${i === tplIdx ? "bg-surface-hover" : ""}`}
              >
                <Slash className="h-3 w-3 text-ink-4" />
                {t}
              </button>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-4 px-3 pt-2 ${only ? "hidden" : ""}`}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative h-7 text-small transition-colors duration-150 ${tab === id ? "text-ink font-medium" : "text-ink-4 hover:text-ink"}`}
            >
              {label}
              {tab === id && <span className="absolute -bottom-px left-0 right-0 h-[1.5px] rounded-full bg-ink" />}
            </button>
          ))}
        </div>

        {(tab === "whatsapp" || tab === "note") && (
          <div className="flex items-end gap-2 px-3 pb-2.5 pt-1.5">
            <textarea
              ref={ref}
              rows={2}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setTplIdx(0);
              }}
              onKeyDown={(e) => {
                if (slash && templates.length) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setTplIdx((i) => Math.min(i + 1, templates.length - 1));
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setTplIdx((i) => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    pickTemplate(templates[tplIdx]);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setText("");
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={customPlaceholder || (tab === "whatsapp" ? `Message ${firstName(lead)} on WhatsApp… type / for templates` : "Write a note…")}
              className="flex-1 resize-none bg-transparent text-body leading-relaxed outline-none placeholder:text-ink-placeholder"
            />
            {onAttach && tab === "whatsapp" && (
              <label className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-ink-4 cursor-pointer transition-colors duration-150 hover:bg-surface-hover hover:text-ink" title="Attach file">
                <Paperclip className="h-4 w-4" />
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAttach(f); e.target.value = ""; }} />
              </label>
            )}
            <button
              onClick={send}
              disabled={!text.trim() || slash}
              className={`h-8 shrink-0 rounded-md px-3 text-small font-medium flex items-center gap-1.5 transition-colors duration-150 disabled:opacity-35 ${
                tab === "whatsapp" ? "bg-ink text-white hover:bg-black" : "bg-ink text-white hover:bg-black"
              }`}
            >
              {tab === "whatsapp" ? <><Send className="h-3.5 w-3.5" /> Send</> : <><StickyNote className="h-3.5 w-3.5" /> Add note</>}
            </button>
          </div>
        )}

        {tab === "call" && (
          <div className="px-3 pb-3 pt-2 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 text-small text-ink-4">
                Duration
                <input
                  ref={ref}
                  type="number"
                  min="1"
                  value={call.duration}
                  onChange={(e) => setCall((c) => ({ ...c, duration: e.target.value }))}
                  className="w-16 h-7 rounded-md border border-line-control px-2 text-body text-ink outline-none tabular-nums focus:border-line-heavy"
                />
                min
              </label>
              <span className="h-4 w-px bg-surface-active mx-1" />
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  onClick={() => setCall((c) => ({ ...c, outcome: o }))}
                  className={`h-7 rounded-md border px-2 text-small inline-flex items-center gap-1.5 transition-colors duration-150 ${
                    call.outcome === o ? "border-ink bg-surface-hover text-ink" : "border-line-control text-ink-3 hover:border-line-strong"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${TAG_DOTS[o]}`} />
                  {o}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={call.notes}
                onChange={(e) => setCall((c) => ({ ...c, notes: e.target.value }))}
                placeholder="What was discussed?"
                className="flex-1 resize-none rounded-md border border-line px-2 py-1.5 text-body outline-none placeholder:text-ink-placeholder focus:border-line-heavy"
              />
              <PrimaryButton
                disabled={!Number(call.duration)}
                onClick={() => {
                  onCall({ duration: Number(call.duration), outcome: call.outcome, notes: call.notes.trim() });
                  setCall({ duration: "", outcome: "Interested", notes: "" });
                }}
              >
                Log call
              </PrimaryButton>
            </div>
          </div>
        )}

        {tab === "followup" && (
          <div className="px-3 pb-3 pt-2 flex items-center gap-2 flex-wrap">
            <input
              ref={ref}
              type="datetime-local"
              value={fu.when}
              onChange={(e) => setFu((f) => ({ ...f, when: e.target.value }))}
              className="h-8 rounded-md border border-line-control px-2 text-body outline-none tabular-nums focus:border-line-heavy"
            />
            <input
              value={fu.action}
              onChange={(e) => setFu((f) => ({ ...f, action: e.target.value }))}
              placeholder="Next action, e.g. Call about payment"
              className="flex-1 min-w-[200px] h-8 rounded-md border border-line-control px-2 text-body outline-none placeholder:text-ink-placeholder focus:border-line-heavy"
            />
            <PrimaryButton disabled={!fu.when || !fu.action.trim()} onClick={() => onFollowUp(new Date(fu.when), fu.action.trim())}>
              Set follow-up
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Next step card + modal ---------- */

function NextFollowUpModal({ lead, outcome, onSave }) {
  const [when, setWhen] = useState(() => toLocalInput(atTen(1)));
  const [action, setAction] = useState(NEXT_ACTION_BY_STAGE[lead.stage] || "");
  return (
    <Modal title="Set next follow-up" width={420}>
      <div className="p-5 space-y-4">
        <div className="text-body text-ink-3">
          Logged as <Tag label={outcome} />. Every open lead needs a next step.
        </div>
        <Field label="When" required>
          <input autoFocus type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={`${inputCls} tabular-nums`} />
        </Field>
        <Field label="Action" required>
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. Call Arjun about the payment link" className={inputCls} />
        </Field>
      </div>
      <div className="flex justify-end px-5 pb-5">
        <PrimaryButton disabled={!when || !action.trim()} onClick={() => onSave(new Date(when), action.trim())}>
          Set follow-up
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/* ---------- Stage stepper ---------- */

/* ---------- The page ---------- */

/* ==========================================================================
   LEAD RECORD — default (Attio-style) and Chat-first views
   ========================================================================== */

/* ---------- Shared actions for the new views ---------- */

function useRecordActions({ lead, timeline, onUpdate, onEvent, showToast, dismissToast, onRequestStage }) {
  const set = (patch, ev) => {
    onUpdate(lead.id, patch);
    if (ev) onEvent(lead.id, ev);
  };
  const touch = (type) => ({ lastActivity: { type, at: new Date(), by: ME, none: false } });
  return {
    set,
    changeStage: (to) => {
      if (to === lead.stage) return;
      if (to === "Lost" || to === "Deferred") return onRequestStage(lead.id, to);
      const snapshot = { ...lead };
      const evId = uid();
      set(
        { stage: to, lostReason: null, deferredUntil: null, deferNote: "", prevStage: null, nextAction: NEXT_ACTION_BY_STAGE[to], ...(to === "Won" ? { nextFollowUp: null, needsReply: false } : {}) },
        { id: evId, type: "stage", from: lead.stage, to, by: ME, at: new Date() }
      );
      showToast(`Moved to ${to}`, () => {
        onUpdate(lead.id, snapshot);
        onEvent(lead.id, null, (evs) => evs.filter((e) => e.id !== evId));
        dismissToast();
      });
    },
    setPayment: (status) => {
      const autoConfirm = status === "Paid" && lead.bookingStatus !== "Confirmed";
      const amount = status === "Paid" ? packageValue(lead) || lead.amountPaid : status === "Not sent" || status === "Link sent" ? 0 : lead.amountPaid;
      set(
        { paymentStatus: status, amountPaid: amount, paymentLinkOpened: status === "Link sent" ? false : lead.paymentLinkOpened, ...(autoConfirm ? { bookingStatus: "Confirmed" } : {}) },
        status === "Paid"
          ? { id: uid(), type: "payment", status: "paid", amount, by: ME, at: new Date() }
          : status === "Link sent"
          ? { id: uid(), type: "payment", status: "sent", amount: packageValue(lead), by: ME, at: new Date(), note: "Not opened yet" }
          : { id: uid(), type: "edit", by: ME, at: new Date(), text: `Payment status set to ${status}` }
      );
      if (autoConfirm) showToast("Marked as paid · booking confirmed");
    },
    sendWhatsApp: (text) => {
      const top = timeline[0];
      if (top && top.type === "whatsapp" && top.by === ME && Date.now() - top.at < 2 * 3600000)
        onEvent(lead.id, null, (evs) => evs.map((e, i) => (i === 0 ? { ...e, at: new Date(), messages: [...e.messages, { from: "agent", text, at: new Date() }] } : e)));
      else onEvent(lead.id, { id: uid(), type: "whatsapp", by: ME, at: new Date(), messages: [{ from: "agent", text, at: new Date() }] });
      onUpdate(lead.id, touch("WhatsApp"));
    },
    addNote: (text) => onEvent(lead.id, { id: uid(), type: "note", by: ME, at: new Date(), text }),
    logCall: (c) => {
      onEvent(lead.id, { id: uid(), type: "call", label: "Call", by: ME, at: new Date(), ...c });
      onUpdate(lead.id, { ...touch("Call"), tag: c.outcome });
      showToast(`Call logged · ${c.outcome}`);
    },
    setFollowUp: (when, action) => {
      set({ nextFollowUp: when, nextAction: action, needsReply: false }, { id: uid(), type: "followup", by: ME, at: new Date(), when, action });
      showToast(`Follow-up set for ${fmtDay(when)}, ${fmtTime(when)}`);
    },
    snooze: (d) => {
      set({ nextFollowUp: d, needsReply: false }, d ? { id: uid(), type: "followup", by: ME, at: new Date(), when: d, snoozed: true, action: lead.nextAction || NEXT_ACTION_BY_STAGE[lead.stage] } : null);
      showToast(d ? `Snoozed to ${fmtDay(d)}, ${fmtTime(d)}` : "Follow-up cleared");
    },
    // Returns true if a next follow-up must now be set
    done: (outcome) => {
      set(
        { tag: outcome, ...touch("Follow-up") },
        { id: uid(), type: "followup", done: true, by: ME, at: new Date(), outcome, action: lead.needsReply ? "Reply on WhatsApp" : lead.nextAction || NEXT_ACTION_BY_STAGE[lead.stage] }
      );
      if (lead.stage === "Won" || lead.stage === "Lost") {
        set({ nextFollowUp: null, needsReply: false });
        showToast(`Marked as ${outcome}`);
        return false;
      }
      return true;
    },
    copyPhone: () => {
      try {
        navigator.clipboard?.writeText(lead.phone);
      } catch (e) {}
      showToast(`Copied ${lead.phone}`);
    },
    addFile: (file) => {
      onEvent(lead.id, { id: uid(), type: "file", by: ME, at: new Date(), name: file.name, size: file.size });
      showToast(`Uploaded ${file.name}`);
    },
  };
}

const fmtBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/* ---------- ⋯ menu shared by all three views ---------- */

/* ---------- WhatsApp conversation (WhatsApp tab + Chat-first view) ---------- */

const dayLabel = (d, now) => {
  const diff = dayDiff(d, now);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return `${d.toLocaleDateString("en-GB", { weekday: "short" })}, ${fmtShortDate(d)}`;
};

function InlineEvent({ ev, lead }) {
  let content;
  if (ev.type === "call") content = <><PhoneCall className="h-3 w-3" /> {ev.label || "Call"} · {ev.duration} min · {ev.outcome}</>;
  else if (ev.type === "stage") content = <><ArrowRightLeft className="h-3 w-3" /> {ev.from} → {ev.to}</>;
  else if (ev.type === "payment") content = <><IndianRupee className="h-3 w-3" /> {ev.status === "paid" ? `Payment received · ${fmtINR(ev.amount)}` : `Payment link sent · ${fmtINR(ev.amount)}${lead.paymentLinkOpened ? "" : " · not opened"}`}</>;
  else return null;
  return (
    <div className="flex justify-center py-1.5">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-caption text-ink-3 tabular-nums">
        {content}
        <span className="text-ink-4">· {fmtTime(ev.at)}</span>
      </span>
    </div>
  );
}

function WhatsAppConversation({ lead, timeline, now, onSend, showToast, maxWidth = 760 }) {
  const scrollRef = useRef(null);
  const [prefill, setPrefill] = useState(null);

  const items = useMemo(() => {
    const out = [];
    timeline.forEach((ev) => {
      if (ev.type === "whatsapp") ev.messages.forEach((m, i) => out.push({ kind: "msg", key: `${ev.id}-${i}`, at: m.at, from: m.from, sender: m.from === "lead" ? firstName(lead) : ev.by, text: m.text }));
      else if (["call", "stage", "payment"].includes(ev.type)) out.push({ kind: "event", key: ev.id, at: ev.at, ev });
    });
    return out.sort((a, b) => a.at - b.at);
  }, [timeline, lead]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [items.length]);

  let lastDay = null;
  let lastSender = null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-surface-subtle">
        <div className="mx-auto px-5 md:px-8 py-6" style={{ maxWidth }}>
          {items.map((it) => {
            const day = dayLabel(it.at, now);
            const showDay = day !== lastDay;
            lastDay = day;
            if (it.kind === "event") {
              lastSender = null;
              return (
                <React.Fragment key={it.key}>
                  {showDay && <DaySep label={day} />}
                  <InlineEvent ev={it.ev} lead={lead} />
                </React.Fragment>
              );
            }
            const mine = it.from !== "lead";
            const showSender = it.from !== lastSender || showDay;
            lastSender = it.from;
            const tone = !mine ? "bg-surface-active text-ink rounded-bl-md" : "bg-[#DCF3E3] text-[#173A26] rounded-br-md";
            return (
              <React.Fragment key={it.key}>
                {showDay && <DaySep label={day} />}
                <div className={`flex ${mine ? "justify-end" : "justify-start"} ${showSender ? "mt-3" : "mt-1"}`}>
                  <div className="max-w-[78%]">
                    {showSender && (
                      <div className={`mb-1 text-caption text-ink-4 ${mine ? "text-right" : ""}`}>
                        {mine ? "You" : it.sender}
                      </div>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2 text-body leading-relaxed ${tone}`}>
                      {it.text}
                      <span className="ml-2 align-bottom text-micro text-ink-4 tabular-nums">{fmtTime(it.at)}</span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          {items.length === 0 && <div className="py-20 text-center text-body text-ink-4">No WhatsApp messages yet</div>}
        </div>
      </div>

      <div className="mx-auto w-full" style={{ maxWidth: maxWidth + 64 }}>
        <Composer key={lead.id} lead={lead} tab="whatsapp" setTab={() => {}} only="whatsapp" prefill={prefill} onWhatsApp={onSend} />
      </div>
    </div>
  );
}

function DaySep({ label }) {
  return (
    <div className="my-4 flex items-center gap-3 text-caption text-ink-4">
      <span className="h-px flex-1 bg-surface-active" />
      {label}
      <span className="h-px flex-1 bg-surface-active" />
    </div>
  );
}

/* ---------- Left panel pieces ---------- */

function DetailRow({ icon: Icon, label, auto, top, children }) {
  return (
    <div className={`flex gap-2 min-h-[32px] ${top ? "items-start py-1" : "items-center"}`}>
      <div className={`w-[128px] shrink-0 flex items-center gap-2 text-small text-ink-4 ${top ? "pt-1.5" : ""}`}>
        <Icon className="h-3.5 w-3.5 shrink-0 text-ink-4" strokeWidth={1.75} />
        <span className="leading-tight">{label}</span>
        {auto && <AutoBadge />}
      </div>
      <div className="min-w-0 flex-1 text-body">{children}</div>
    </div>
  );
}

const Placeholder = ({ field }) => <span className="text-ink-4">Set {field.toLowerCase()}</span>;

/* ---------- Overview pieces ---------- */

function DoneOutcomeMenu({ anchor, onClose, onPick }) {
  return (
    <FixedMenu anchor={anchor} onClose={onClose} width={220}>
      <MenuHeading>What was the outcome?</MenuHeading>
      {OUTCOMES.map((o) => (
        <MenuItem key={o} onClick={() => { onClose(); onPick(o); }}>
          <span className={`h-1.5 w-1.5 rounded-full ${TAG_DOTS[o]}`} />
          {o}
        </MenuItem>
      ))}
    </FixedMenu>
  );
}

/* ---------- Default record view ---------- */

/* ---------- Chat-first view ---------- */

/* ---------- Simple record view (default when a lead is opened) ---------- */

const STAGE_PILL = {
  New: "bg-surface-hover text-ink-2",
  Qualified: "bg-[#E5F5F3] text-[#0F6B63]",
  "Consult booked": "bg-[#E8F1FE] text-[#2F5BD3]",
  "Consult done": "bg-[#FEF3E2] text-[#A86A0E]",
  "Payment pending": "bg-[#FDEDE3] text-[#B4541A]",
  Won: "bg-[#E7F6EC] text-[#1F7A4A]",
  Deferred: "bg-surface-hover text-ink-3",
  Lost: "bg-[#FDECEC] text-[#C2383A]",
};
const PRIORITIES = ["High", "Medium", "Low"];
// Priority is about importance, not lateness, so it stays out of red/amber (those mean late or waiting).
const PRIORITY_DOT = { High: "bg-ink", Medium: "bg-ink-4", Low: "bg-line-heavy" };
const leadPriority = (l) => l.priority || (l.score >= 75 ? "High" : l.score >= 50 ? "Medium" : "Low");
const fmtConsult = (d) => `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(d)}`;

// Starting key notes for the demo leads, written as a person would jot them down
const fmtShortDateY = (d) => d && d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
function seedKeyNotes(l) {
  const out = [];
  if (l.tag === "Price concern") out.push("Price-sensitive — show the per-night cost and a shorter first block");
  if (l.babies > 1) out.push("Twins — night help is the priority");
  if (l.deferNote) out.push(l.deferNote);
  if (l.careKind === "B" && l.services?.includes("Lactation support")) out.push("Struggling with feeding — mention lactation visits early");
  if (l.careKind === "P" && l.hospital) out.push(`Delivering at ${l.hospital}`);
  return out.slice(0, 3).map((text, i) => ({ id: `k${i}`, text }));
}

// Activity rows without names: neutral type icon + bold event + grey preview + short time
const ACT_ICON = {
  whatsapp: WhatsAppIcon, call: PhoneCall, consult: CalendarCheck, payment: IndianRupee, package: FileText, stage: ArrowRightLeft,
  created: UserPlus, note: StickyNote, followup: CalendarClock, file: Paperclip, service: HeartHandshake,
};
const shortRel = (at, now) => {
  const m = Math.max(0, Math.floor((now - at) / 60000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const shortWhen = (d) => `${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}, ${fmtTime(d).replace(":00", "")}`;
function describeEvent(ev) {
  const q = (t) => (t ? `“${t}”` : "");
  switch (ev.type) {
    case "whatsapp": {
      const msgs = ev.messages || [];
      const pdf = msgs.find((m) => m.kind === "pdf");
      if (pdf) return ["package", "Package sent", pdf.text];
      const last = msgs[msgs.length - 1];
      return ["whatsapp", last?.from === "lead" ? "WhatsApp received" : "WhatsApp sent", q(last?.text)];
    }
    case "unread": return ["whatsapp", "WhatsApp received", ev.reason];
    case "call": return [ev.label === "Consult" ? "consult" : "call", ev.label === "Consult" ? "Consult done" : `Call${ev.duration ? ` · ${ev.duration} min` : ""}`, [ev.outcome, ev.notes].filter(Boolean).join(" · ")];
    case "payment": return ["payment", ev.status === "paid" ? "Payment received" : ev.status === "opened" ? "Payment link opened" : "Payment link sent", [ev.amount ? fmtINR(ev.amount) : null, ev.note].filter(Boolean).join(" · ")];
    case "stage": return [/Consult/.test(ev.to) ? "consult" : "stage", ev.to === "Consult booked" ? "Consult booked" : ev.to === "Consult done" ? "Consult done" : "Stage changed", ev.to === "Consult booked" && ev.when ? `for ${shortWhen(ev.when)}` : `${ev.from} → ${ev.to}${ev.extra ? ` · ${ev.extra}` : ""}`];
    case "created": return ["created", "Lead created", ev.source ? `from ${ev.source}` : ""];
    case "note": return ["note", "Note added", ev.text];
    case "followup": return ["followup", ev.done ? "Follow-up done" : ev.snoozed ? "Follow-up moved" : "Follow-up set", ev.done ? [ev.outcome, ev.action].filter(Boolean).join(" · ") : ev.when ? `${fmtDay(ev.when)}, ${fmtTime(ev.when)}${ev.action ? ` · ${ev.action}` : ""}` : ""];
    case "file": return ["file", "File added", ev.name];
    case "service": return ["service", "Service sold", `${EXPERT[ev.expert]?.name || ""}${ev.pack > 1 ? ` · pack of ${ev.pack}` : ""}`];
    case "edit": return ["stage", "Details updated", ev.text || ev.field || ""];
    default: return null;
  }
}
function ActivityList({ events, now, limit, wrap }) {
  const rows = events.map((ev) => [ev, describeEvent(ev)]).filter(([, d]) => d).slice(0, limit || 999);
  if (!rows.length) return <div className="py-6 text-body text-ink-4">No activity yet</div>;
  return (
    <ul className="divide-y divide-line-subtle">
      {rows.map(([ev, [kind, title, preview]], i) => {
        const Icon = ACT_ICON[kind] || ArrowRightLeft;
        return (
          <li key={ev.id} className="cw-row-in flex items-start gap-3 py-2.5 min-w-0" style={{ animationDelay: `${Math.min(i, 7) * 40}ms` }}>
            <span className="mt-px h-[22px] w-[22px] shrink-0 rounded-md bg-surface-hover text-ink-3 flex items-center justify-center"><Icon className="h-3 w-3" strokeWidth={2} /></span>
            <div className={`min-w-0 flex-1 text-body leading-[22px] ${wrap ? "line-clamp-2" : "truncate"}`}>
              <span className="font-medium text-ink">{title}</span>
              {preview && <span className="text-ink-4"> {preview}</span>}
            </div>
            <span className="shrink-0 text-small leading-[22px] text-ink-4 tabular-nums">{shortRel(ev.at, now)}</span>
          </li>
        );
      })}
    </ul>
  );
}

const AUTO_HINT = "Worked out automatically from the dates on this lead";
const Lbl = ({ children, auto }) => (
  <div className="text-small text-ink-4">
    {children}
    {auto && <span title={typeof auto === "string" ? auto : AUTO_HINT} className="text-ink-4 cursor-help"> · auto</span>}
  </div>
);
const OvCard = ({ title, right, children, className = "", style, delay = 0 }) => (
  <section className={`cw-rise rounded-xl border border-line-control bg-white p-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-raise ${className}`} style={{ animationDelay: `${delay}ms`, ...style }}>
    <div className="flex items-center mb-3 min-h-[24px]">
      <h2 className="text-body-lg font-semibold text-ink">{title}</h2>
      {right && <div className="ml-auto">{right}</div>}
    </div>
    {children}
  </section>
);
const Val = ({ children }) => <div className="mt-0.5 text-body-lg font-medium text-ink break-words">{children === null || children === undefined || children === "" ? <span className="font-normal text-ink-faint">—</span> : children}</div>;
const editInput = "w-full h-8 rounded-md border border-line-control bg-white px-2 text-body outline-none focus:border-line-heavy";

// A card of label/value pairs with a pencil that turns it into a small form
function EditCard({ title, fields, onSave, top, bottom, delay = 0, validate, className = "" }) {
  const [draft, setDraft] = useState(null);
  const editing = !!draft;
  const errors = editing && validate ? validate(draft) : {};
  const hasErrors = Object.values(errors).some(Boolean);
  const start = () => setDraft(Object.fromEntries(fields.filter((f) => f.edit).map((f) => [f.key, f.edit.value])));
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const renderEdit = (f) => {
    const e = f.edit;
    const v = draft[f.key];
    if (e.type === "select")
      return (
        <select value={v ?? ""} onChange={(x) => set(f.key, x.target.value)} className={editInput}>
          {e.allowEmpty && <option value="">—</option>}
          {e.options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
        </select>
      );
    if (e.type === "multi")
      return (
        <div className="flex flex-wrap gap-1.5">
          {e.options.map((o) => {
            const on = (v || []).includes(o);
            return (
              <button key={o} type="button" onClick={() => set(f.key, on ? v.filter((x) => x !== o) : [...(v || []), o])} className={`h-7 rounded-md border px-2 text-small inline-flex items-center gap-1 transition-colors duration-150 ${on ? "border-ink bg-surface-hover text-ink" : "border-line-control text-ink-3 hover:border-line-strong"}`}>
                {on && <Check className="h-3 w-3" />}{o}
              </button>
            );
          })}
        </div>
      );
    return <input type={e.type} value={v ?? ""} onChange={(x) => set(f.key, x.target.value)} aria-invalid={!!errors[f.key]} className={`${editInput} tabular-nums ${errors[f.key] ? "border-red-300 focus:border-red-400" : ""}`} />;
  };
  return (
    <OvCard
      title={title}
      delay={delay}
      className={className}
      right={
        editing ? (
          <div className="flex items-center gap-1.5">
            <button onClick={() => setDraft(null)} className="h-7 rounded-md px-2 text-small text-ink-3 hover:bg-surface-hover">Cancel</button>
            <button disabled={hasErrors} onClick={() => { onSave(draft); setDraft(null); }} className={btn("primary", "sm")}>Save</button>
          </div>
        ) : (
          <button onClick={start} aria-label={`Edit ${title.toLowerCase()}`} className="h-7 w-7 rounded-md flex items-center justify-center text-ink-4 hover:bg-surface-hover hover:text-ink"><Pencil className="h-3.5 w-3.5" /></button>
        )
      }
    >
      {top}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
        {fields.map((f, fi) => {
          const showEdit = editing && f.edit;
          return (
            <div key={f.key} className={`cw-field-in min-w-0 ${f.full ? `col-span-2 ${f.divider ? "pt-3.5 border-t border-line-subtle" : ""}` : ""}`} style={{ animationDelay: `${delay + 80}ms` }}>
              <Lbl auto={f.auto && !showEdit}>{showEdit && f.editLabel ? f.editLabel : f.label}</Lbl>
              {showEdit ? (
                <div className="mt-1">
                  {renderEdit(f)}
                  {errors[f.key] && <div role="alert" className="mt-1 text-small text-red-700">{errors[f.key]}</div>}
                </div>
              ) : (
                <Val>{f.view}</Val>
              )}
            </div>
          );
        })}
      </div>
      {bottom}
    </OvCard>
  );
}

function KeyNotes({ notes, onChange, compact, addSignal, hideAdd, divided }) {
  const [editing, setEditing] = useState(null); // id | "new"
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (addSignal) { setEditing("new"); setDraft(""); }
  }, [addSignal]);
  const save = () => {
    const t = draft.trim();
    if (editing === "new") { if (t) onChange([...notes, { id: uid(), text: t }]); }
    else if (t) onChange(notes.map((n) => (n.id === editing ? { ...n, text: t } : n)));
    setEditing(null);
    setDraft("");
  };
  const input = (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(null); setDraft(""); } }}
      placeholder="Type a note and press Enter"
      className="w-full h-8 rounded-md border border-line-strong px-2.5 text-body outline-none focus:border-line-heavy"
    />
  );
  return (
    <div>
      <ul className={divided ? "divide-y divide-line-subtle" : "space-y-0.5"}>
        {notes.map((n) => (
          <li key={n.id} className={`group flex items-start gap-2.5 rounded-md px-1.5 -mx-1.5 hover:bg-surface-subtle ${divided ? "py-2" : "py-1.5"}`}>
            {editing === n.id ? input : (
              <>
                <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-ink-4" />
                <span className="min-w-0 flex-1 text-body-lg leading-[20px] font-medium text-ink">{n.text}</span>
                <span className="shrink-0 flex items-center opacity-0 [@media(hover:none)]:opacity-100 group-hover:opacity-100 transition-opacity duration-150">
                  <button onClick={() => { setEditing(n.id); setDraft(n.text); }} aria-label="Edit note" className="h-6 w-6 rounded flex items-center justify-center text-ink-4 hover:bg-surface-active hover:text-ink"><Pencil className="h-3 w-3" /></button>
                  <button onClick={() => onChange(notes.filter((x) => x.id !== n.id))} aria-label="Delete note" className="h-6 w-6 rounded flex items-center justify-center text-ink-4 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? <div className="mt-1.5">{input}</div> : !notes.length && !compact && <div className="text-body text-ink-4">No key notes yet</div>}
      {editing !== "new" && !hideAdd && (
        <button onClick={() => { setEditing("new"); setDraft(""); }} className="mt-1.5 text-small font-medium hover:underline underline-offset-2" style={{ color: ACCENT }}>+ Add</button>
      )}
    </div>
  );
}

const SHIFT_OPTIONS = [["Day|8", "Day · 8 hrs"], ["Day|10", "Day · 10 hrs"], ["Day|12", "Day · 12 hrs"], ["Night|10", "Night · 10 hrs"], ["Night|12", "Night · 12 hrs"], ["24 hrs|24", "24 hrs"]];
const dateInput = (d) => (d ? toLocalInput(d).slice(0, 10) : "");
const fromDateInput = (s) => (s ? new Date(`${s}T00:00:00`) : null);

// The family's journey on one line: pregnancy or birth → care start → care end, with today marked.
function careTimeline(l, now) {
  const born = l.careKind === "B";
  const anchor = born ? l.babyDob : l.dueDate;
  if (!anchor) return null;
  const start = born ? anchor : new Date(anchor - 16 * 7 * DAY);
  const careS = l.careStart || null;
  const careE = l.careEnd || null;
  const end = new Date(Math.max(careE ? +careE + 5 * DAY : 0, +anchor + (born ? 10 : 6) * 7 * DAY, +now + 7 * DAY));
  const span = end - start;
  const pct = (d) => Math.min(100, Math.max(0, ((d - start) / span) * 100));
  return { born, anchor, start, end, careS, careE, pct, today: pct(now), anchorAt: pct(anchor), inCare: careS && careE && now >= careS && now <= careE };
}
function CareTimeline({ lead, now, compact }) {
  const t = careTimeline(lead, now);
  if (!t) return null;
  const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const weeks = (careStage(lead, now).split(" · ")[1] || "—");
  const title = `${t.born ? `Born ${fmt(t.anchor)}` : `Due ${fmt(t.anchor)}`}${t.careS && t.careE ? ` · care ${fmt(t.careS)} – ${fmt(t.careE)}` : " · care dates not set"}`;
  const bar = (
    <div className={`relative ${compact ? "h-1" : "h-1.5"} rounded-full bg-surface-active`} role="img" aria-label={`Care timeline: ${title}`}>
      {t.careS && t.careE && (
        <span className="absolute inset-y-0 rounded-full bg-line-heavy" style={{ left: `${t.pct(t.careS)}%`, width: `${Math.max(2, t.pct(t.careE) - t.pct(t.careS))}%` }} />
      )}
      <span className="absolute inset-y-0 rounded-l-full bg-line-control" style={{ left: 0, width: `${t.today}%` }} />
      {!compact && <span className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-line-heavy" style={{ left: `${t.anchorAt}%` }} />}
      <span className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-2 ring-white ${compact ? "h-2 w-2" : "h-2.5 w-2.5"}`} style={{ left: `${t.today}%` }} />
    </div>
  );
  if (compact) return <div className="mt-3" title={title}>{bar}</div>;
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="text-small text-ink-4">Care timeline</span>
        <span className="text-small text-ink-3 tabular-nums">{t.inCare ? "In care now" : t.born ? `Baby ${babyAge(lead, now) || "—"}` : `Week ${String(weeks || "—").replace("w", "")}`}</span>
      </div>
      {bar}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-3 tabular-nums">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink" />Today</span>
        <span className="inline-flex items-center gap-1.5">{!t.born && <span className="h-2.5 w-px bg-line-heavy" />}{t.born ? `Born ${fmt(t.anchor)}` : `Due ${fmt(t.anchor)}`}</span>
        {t.careS && t.careE ? (
          <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-line-heavy" />Care {fmt(t.careS)} – {fmt(t.careE)}</span>
        ) : (
          <span className="text-ink-4">Care dates not set</span>
        )}
      </div>
    </div>
  );
}

function CallsTab({ calls, now, onLog }) {
  const [form, setForm] = useState(null);
  return (
    <div className="cw-fade-in max-w-[820px]">
      <div className="flex items-center mb-3">
        <span className="text-body text-ink-4">{calls.length ? `${calls.length} call${calls.length > 1 ? "s" : ""}` : "No calls yet"}</span>
        {!form && <button onClick={() => setForm({ duration: "5", outcome: "Interested", notes: "" })} className="ml-auto h-8 rounded-md border border-line-control px-2.5 inline-flex items-center gap-1.5 text-small text-ink-2 hover:bg-surface-subtle"><Plus className="h-3.5 w-3.5" /> Log call</button>}
      </div>
      {form && (
        <div className="mb-4 rounded-xl border border-line-control p-3.5 space-y-3">
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <label className="text-small text-ink-4">Minutes<input type="number" min={0} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className={`${editInput} mt-1`} /></label>
            <label className="text-small text-ink-4">Outcome<select value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} className={`${editInput} mt-1`}>{OUTCOMES.map((o) => <option key={o}>{o}</option>)}</select></label>
          </div>
          <textarea rows={3} autoFocus value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What was discussed?" className="w-full resize-none rounded-md border border-line-control px-2.5 py-2 text-body outline-none focus:border-line-heavy" />
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => { onLog({ duration: +form.duration || 0, outcome: form.outcome, notes: form.notes.trim() }); setForm(null); }}>Log call</PrimaryButton>
          </div>
        </div>
      )}
      <ul className="divide-y divide-line-subtle border-t border-line-subtle">
        {calls.map((c) => (
          <li key={c.id} className="py-3 flex gap-3">
            <span className="mt-px h-[22px] w-[22px] shrink-0 rounded-md bg-surface-hover text-ink-3 flex items-center justify-center">{c.label === "Consult" ? <CalendarCheck className="h-3 w-3" /> : <PhoneCall className="h-3 w-3" />}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-body">
                <span className="font-medium text-ink">{c.label === "Consult" ? "Consultation" : "Call"}</span>
                <span className="text-ink-4 tabular-nums">{c.duration ? `${c.duration} min` : "No answer"}</span>
                {c.outcome && <Tag label={c.outcome} className="text-small" />}
                <span className="ml-auto text-small text-ink-4 tabular-nums">{fmtDay(c.at)}, {fmtTime(c.at)}</span>
              </div>
              {c.notes && <div className="mt-1 text-body leading-relaxed text-ink-2">{c.notes}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FollowUpsTab({ items, now, onAdd, onDone }) {
  const [form, setForm] = useState(null);
  const [doneMenu, setDoneMenu] = useState(null);
  const open = items.filter((f) => f.status === "open").sort((a, b) => a.due - b.due);
  const done = items.filter((f) => f.status === "done").sort((a, b) => b.completedAt - a.completedAt);
  const row = (f) => {
    const g = fuGroup(f, now);
    const d = fuDueLabel(f, now, g);
    const when = f.status === "done" ? `${fmtDay(f.completedAt)}, ${fmtTime(f.completedAt)}` : g === "today" || g === "overdue" ? d.text : `${fmtDay(f.due)}, ${fmtTime(f.due)}`;
    return (
      <li key={f.id} className="group h-11 flex items-center gap-3 text-body">
        <FuTypeIcon type={f.type} size="sm" />
        <span className={`min-w-0 flex-1 truncate ${f.status === "done" ? "text-ink-4" : "text-ink"}`}>{f.action}</span>
        {f.status === "done" && f.outcome && <Tag label={f.outcome} className="text-small" />}
        <span className={`shrink-0 text-small tabular-nums ${f.status === "open" && d.late ? "text-red-700" : "text-ink-4"}`}>{f.status === "open" && g === "today" ? `Today, ${when}` : when}</span>
        {f.status === "open" && (
          <button onClick={(e) => setDoneMenu({ id: f.id, anchor: e.currentTarget })} className="h-7 rounded-md border border-line-control px-2 inline-flex items-center gap-1 text-small text-ink-2 hover:bg-surface-subtle"><Check className="h-3 w-3" /> Done</button>
        )}
      </li>
    );
  };
  return (
    <div className="cw-fade-in max-w-[820px]">
      <div className="flex items-center mb-2">
        <span className="text-body text-ink-4">{open.length} open</span>
        {!form && <button onClick={() => setForm({ type: "Call", when: toLocalInput(atTen(1)), action: "" })} className="ml-auto h-8 rounded-md border border-line-control px-2.5 inline-flex items-center gap-1.5 text-small text-ink-2 hover:bg-surface-subtle"><Plus className="h-3.5 w-3.5" /> New follow-up</button>}
      </div>
      {form && (
        <div className="mb-4 rounded-xl border border-line-control p-3.5 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {FU_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} className={`h-7 rounded-md border px-2.5 text-small inline-flex items-center gap-1.5 ${form.type === t ? "border-ink bg-surface-hover" : "border-line-control text-ink-3"}`}><span className={`h-1.5 w-1.5 rounded-full ${FU_TYPE_COLOR[t].dot}`} />{t}</button>
            ))}
          </div>
          <div className="grid grid-cols-[200px_1fr] gap-3">
            <input type="datetime-local" value={form.when} onChange={(e) => setForm({ ...form, when: e.target.value })} className={`${editInput} tabular-nums`} />
            <input autoFocus value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} placeholder="What should happen?" className={editInput} />
          </div>
          <div className="flex justify-end gap-2">
            <SecondaryButton onClick={() => setForm(null)}>Cancel</SecondaryButton>
            <PrimaryButton disabled={!form.when} onClick={() => { onAdd({ type: form.type, due: new Date(form.when), action: form.action.trim() || `${form.type} follow-up` }); setForm(null); }}>Create follow-up</PrimaryButton>
          </div>
        </div>
      )}
      {open.length > 0 && <ul className="divide-y divide-line-subtle border-t border-line-subtle">{open.map(row)}</ul>}
      {!open.length && !form && <div className="py-6 text-body text-ink-4 border-t border-line-subtle">Nothing scheduled</div>}
      {done.length > 0 && (
        <>
          <div className="mt-7 mb-1 text-small font-medium text-ink-4">Completed</div>
          <ul className="divide-y divide-line-subtle border-t border-line-subtle">{done.map(row)}</ul>
        </>
      )}
      {doneMenu && (
        <FixedMenu anchor={doneMenu.anchor} onClose={() => setDoneMenu(null)} width={220} align="right">
          <MenuHeading>What happened?</MenuHeading>
          {OUTCOMES.map((o) => (
            <MenuItem key={o} onClick={() => { onDone(doneMenu.id, o); setDoneMenu(null); }}>
              <span className={`h-1.5 w-1.5 rounded-full ${TAG_DOTS[o] || "bg-line-heavy"}`} />
              <span className="flex-1">{o}</span>
            </MenuItem>
          ))}
        </FixedMenu>
      )}
    </div>
  );
}

function LeadRecordSimple({ lead, now, timeline, onBack, onUpdate, onEvent, showToast, dismissToast, onRequestStage, crumbRoot = "Leads", initialTab, onSell, consults = [], onDelete, followups = [], setFollowups, nav }) {
  const actions = useRecordActions({ lead, timeline, onUpdate, onEvent, showToast, dismissToast, onRequestStage });
  const isCustomer = lead.stage === "Won";
  const [tab, setTab] = useState(initialTab || "overview");
  const [menu, setMenu] = useState(null); // { type, anchor, outcome? }
  const [note, setNote] = useState("");
  const [addNote, setAddNote] = useState(0);
  const fileRef = useRef(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const born = lead.careKind === "B";
  const keyNotes = lead.keyNotes || seedKeyNotes(lead);
  const setKeyNotes = (list) => onUpdate(lead.id, { keyNotes: list });
  const sorted = [...timeline].sort((a, b) => b.at - a.at);
  const notes = sorted.filter((e) => e.type === "note");
  const files = sorted.filter((e) => e.type === "file");
  const calls = sorted.filter((e) => e.type === "call");
  const bookedFor = consults.filter((c) => c.leadId === lead.id && c.status === "scheduled").sort((a, b) => a.start - b.start)[0];
  const activity = sorted.map((e) => (e.type === "stage" && e.to === "Consult booked" && bookedFor && !e.when ? { ...e, when: bookedFor.start } : e));
  const myFus = followups.filter((f) => f.leadId === lead.id && f.status !== "leaving");
  const openFus = myFus.filter((f) => f.status === "open").length;
  const waCount = timeline.filter((e) => e.type === "whatsapp").reduce((s, e) => s + (e.messages?.length || 1), 0);
  const consult = consults.filter((c) => c.leadId === lead.id && c.status === "scheduled" && c.start > now - 30 * 60000).sort((a, b) => a.start - b.start)[0];
  const priority = leadPriority(lead);
  const edit = (patch, text) => actions.set(patch, { id: uid(), type: "edit", by: ME, at: new Date(), text });

  const tabs = [
    ["overview", "Overview"],
    ["whatsapp", "WhatsApp", waCount],
    ["calls", "Calls", calls.length],
    ["activity", "Activity", sorted.length],
    ["followups", "Follow-ups", openFus],
    ...(isCustomer ? [["services", "Services", liveSessions(lead).length]] : []),
    ["notes", "Notes", notes.length + keyNotes.length],
    ["files", "Files", files.length],
  ];
  const tabRefs = useRef({});
  const [ind, setInd] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const el = tabRefs.current[tab];
    if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
  }, [tab, tabs.length]);

  /* ----- Keyboard: same keys as My day (J/K move, C call, W WhatsApp, S snooze, E done, Esc back) ----- */
  const snoozeRef = useRef(null);
  const doneRef = useRef(null);
  useEffect(() => {
    const k = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || menu) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const key = e.key.toLowerCase();
      if (key === "j" && nav?.next) nav.next();
      else if (key === "k" && nav?.prev) nav.prev();
      else if (key === "w") setTab("whatsapp");
      else if (key === "c") openCall(lead.phone);
      else if (key === "s" && snoozeRef.current) setMenu({ type: "snooze", anchor: snoozeRef.current });
      else if (key === "e" && doneRef.current) setMenu({ type: "done", anchor: doneRef.current });
      else if (e.key === "Escape") onBack("all");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  /* ----- Next action ----- */
  const unread = lead.needsReply;
  const unreadEv = sorted.find((e) => e.type === "unread");
  const actionText = unread
    ? /price|cost|how much/i.test(unreadEv?.reason || "") || lead.tag === "Price concern" ? "Reply to price question on WhatsApp" : "Reply on WhatsApp"
    : lead.nextAction || NEXT_ACTION_BY_STAGE[lead.stage] || null;
  let due = null;
  if (unread) {
    const mins = Math.max(1, Math.round((now - lead.lastActivity.at) / 60000));
    due = { tone: "amber", text: `Waiting ${mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} hr`} · due now` };
  } else if (lead.nextFollowUp) {
    const d = dayDiff(lead.nextFollowUp, now);
    due =
      d < 0 ? { tone: "red", text: `Overdue · ${-d} day${d === -1 ? "" : "s"}` }
      : lead.nextFollowUp <= now ? { tone: "amber", text: `Due now · ${fmtTime(lead.nextFollowUp)}` }
      : d === 0 ? { tone: "amber", text: `Due today, ${fmtTime(lead.nextFollowUp)}` }
      : { tone: "grey", text: `${d === 1 ? "Tomorrow" : fmtDay(lead.nextFollowUp)}, ${fmtTime(lead.nextFollowUp)}` };
  }
  const tone = {
    red: ["border-red-200 bg-red-50", "text-red-700", "text-red-700/80"],
    amber: ["border-amber-200 bg-amber-50", "text-amber-800", "text-amber-800"],
    grey: ["border-line-control bg-surface-subtle", "text-ink", "text-ink-4"],
  }[due?.tone || "grey"];
  const primary = unread || /whatsapp|reply/i.test(actionText || "")
    ? { label: "Reply", Icon: MessageCircle, run: () => setTab("whatsapp") }
    : lead.stage === "Payment pending" || /link/i.test(actionText || "")
      ? { label: "Send link", Icon: Send, run: () => { actions.setPayment("Link sent"); showToast("Payment link sent on WhatsApp"); } }
      : { label: "Call", Icon: Phone, run: () => openCall(lead.phone) };
  const ActionIcon = primary.Icon;
  const snoozeTo = (k) => {
    const d = new Date();
    if (k === "later") d.setHours(d.getHours() + 3, 0, 0, 0);
    else { d.setDate(d.getDate() + (k === "tomorrow" ? 1 : k === "3days" ? 3 : 7)); d.setHours(10, 0, 0, 0); }
    actions.snooze(workHours(d));
    closeMenu();
  };
  const addFollowup = ({ type, due: when, action }) => {
    actions.setFollowUp(when, action);
    setFollowups?.((fs) => [...fs, { id: uid(), leadId: lead.id, type, action, due: when, owner: ME, status: "open", createdAt: new Date() }]);
  };
  const nextAfter = (days) => {
    if (days == null) { onUpdate(lead.id, { nextFollowUp: null, needsReply: false }); showToast(`Marked as ${menu.outcome} · no follow-up`); closeMenu(); return; }
    const d = new Date(); d.setDate(d.getDate() + days); d.setHours(10, 0, 0, 0);
    addFollowup({ type: "Call", due: d, action: NEXT_ACTION_BY_STAGE[lead.stage] || "Follow-up call" });
    closeMenu();
  };
  const fuDone = (id, outcome) => {
    const f = followups.find((x) => x.id === id);
    setFollowups?.((fs) => fs.map((x) => (x.id === id ? { ...x, status: "done", completedAt: new Date(), completedBy: ME, outcome } : x)));
    onEvent(lead.id, { id: uid(), type: "followup", done: true, by: ME, at: new Date(), outcome, action: f?.action });
    onUpdate(lead.id, { tag: outcome });
    showToast(`Follow-up marked as ${outcome}`);
  };

  const shift = lead.shiftType ? (lead.shiftType === "24 hrs" ? "24 hrs" : `${lead.shiftType} · ${lead.shiftHours} hrs`) : null;
  const value = packageValue(lead);
  const quoted = lead.quoted ?? value;
  const la = lead.lastActivity;
  const lastInteraction = la.none ? null : `${la.type} · ${shortRel(la.at, now)}`;
  const careWeeks = born ? `Born · ${babyAge(lead, now) || "—"}` : `Expecting · ${(careStage(lead, now).split(" · ")[1] || "—")}`;
  const consultLine = consult ? `Consult ${fmtConsult(consult.start)}` : null;
  const days = serviceDays(lead);

  /* ----- Overview cards ----- */
  const customerFields = [
    { key: "care", label: "Care stage", auto: true, view: careWeeks },
    born
      ? { key: "babyDob", label: "Baby born", view: fmtShortDateY(lead.babyDob), edit: { type: "date", value: dateInput(lead.babyDob) } }
      : { key: "dueDate", label: "Due date", view: fmtShortDateY(lead.dueDate), edit: { type: "date", value: dateInput(lead.dueDate) } },
    { key: "hospital", label: "Hospital", view: lead.hospital, edit: { type: "select", value: lead.hospital || "", options: HOSPITALS, allowEmpty: true } },
    { key: "babies", label: "Babies", view: lead.babies > 1 ? `${lead.babies} (twins)` : lead.babies, edit: { type: "select", value: String(lead.babies), options: ["1", "2", "3"] } },
    { key: "phone", label: "Phone", view: <span className="tabular-nums whitespace-nowrap">{lead.phone}</span>, edit: { type: "tel", value: lead.phone } },
    { key: "zone", label: "Zone", view: lead.zone, edit: { type: "select", value: lead.zone || "", options: ZONES, allowEmpty: true } },
    ...(born
      ? [
          { key: "birthW", label: "Birth weight", view: lead.birthWeights?.length ? `${fmtKg(lead.birthWeights)} kg` : null },
          { key: "currentW", label: "Current weight", view: lead.currentWeights?.length ? `${fmtKg(lead.currentWeights)} kg` : null },
        ]
      : []),
    { key: "address", label: "Address", full: true, divider: true, view: lead.address, edit: { type: "text", value: lead.address || "" } },
  ];
  const validateCustomer = (d) => {
    const ph = mobileDigits(d.phone);
    const date = fromDateInput(born ? d.babyDob : d.dueDate);
    const today = startOfDay(new Date());
    return {
      phone: /^[6-9]\d{9}$/.test(ph) ? null : "Enter a 10-digit mobile number starting with 6–9.",
      dueDate: !born && (!date || date < new Date(+today - 14 * DAY) || date > new Date(+today + 42 * 7 * DAY)) ? "Due date should be between 2 weeks ago and 42 weeks from today." : null,
      babyDob: born && (!date || date > today || date < new Date(+today - 365 * DAY)) ? "Birth date can't be in the future or over a year ago." : null,
    };
  };
  const saveCustomer = (d) => {
    const ph = mobileDigits(d.phone);
    const patch = { hospital: d.hospital || null, babies: +d.babies, phone: `+91 ${ph.slice(0, 5)} ${ph.slice(5)}`, zone: d.zone || null, address: d.address.trim() || null };
    if (born) patch.babyDob = fromDateInput(d.babyDob) || lead.babyDob;
    else patch.dueDate = fromDateInput(d.dueDate) || lead.dueDate;
    edit(patch, born ? "Customer and baby details" : "Customer and pregnancy details");
    showToast("Details saved");
  };
  const careFields = [
    { key: "package", label: "Package", view: lead.package || "Not decided", edit: { type: "select", value: lead.package || "", options: PACKAGE_OPTIONS, allowEmpty: true } },
    { key: "shift", label: "Shift", view: shift, edit: { type: "select", value: lead.shiftType ? `${lead.shiftType}|${lead.shiftHours}` : "", options: SHIFT_OPTIONS, allowEmpty: true } },
    { key: "careStart", label: "Care start", view: fmtShortDateY(lead.careStart), edit: { type: "date", value: dateInput(lead.careStart) } },
    { key: "careEnd", label: "Care end", view: fmtShortDateY(lead.careEnd), edit: { type: "date", value: dateInput(lead.careEnd) } },
    { key: "duration", label: "Duration", auto: true, view: days ? `${days} days` : null },
    { key: "value", label: "Package value", view: value ? fmtINR(value) : null },
    { key: "services", label: "Required services", full: true, divider: true, view: lead.services?.join(", "), edit: { type: "multi", value: lead.services || [], options: SERVICES } },
  ];
  const validateCare = (d) => ({
    careEnd: d.careStart && d.careEnd && fromDateInput(d.careEnd) <= fromDateInput(d.careStart) ? "Care end must be after care start." : d.careEnd && !d.careStart ? "Add a care start date first." : null,
  });
  const saveCare = (d) => {
    const [st, sh] = d.shift ? d.shift.split("|") : [null, null];
    edit({ package: d.package || null, shiftType: st, shiftHours: sh ? +sh : null, careStart: fromDateInput(d.careStart), careEnd: fromDateInput(d.careEnd), services: d.services }, "Care requirements");
    showToast("Care requirements saved");
  };
  const payFields = [
    { key: "quoted", label: "Quoted", view: quoted ? fmtINR(quoted) : null, edit: { type: "number", value: quoted || "" } },
    { key: "paymentStatus", label: "Payment", view: <span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${PAYMENT_DOT[lead.paymentStatus] || "bg-line-heavy"}`} />{lead.paymentStatus}</span>, edit: { type: "select", value: lead.paymentStatus, options: PAYMENT_STATUSES } },
    { key: "amountPaid", label: "Amount paid", view: fmtINR(lead.amountPaid || 0), edit: { type: "number", value: lead.amountPaid || 0 } },
    { key: "bookingStatus", label: "Care booking", view: lead.bookingStatus, edit: { type: "select", value: lead.bookingStatus, options: BOOKING_STATUSES } },
  ];
  const validatePay = (d) => ({
    quoted: d.quoted !== "" && (+d.quoted < 0 || isNaN(+d.quoted)) ? "Enter an amount in rupees." : null,
    amountPaid: +d.amountPaid < 0 || isNaN(+d.amountPaid) ? "Enter an amount in rupees." : d.quoted !== "" && +d.amountPaid > +d.quoted ? "Amount paid is more than the quote." : null,
  });
  const savePay = (d) => {
    edit({ quoted: d.quoted === "" ? null : +d.quoted, paymentStatus: d.paymentStatus, amountPaid: +d.amountPaid || 0, bookingStatus: d.bookingStatus }, "Consultation and payment");
    showToast("Payment details saved");
  };
  const consultBox = consult ? (
    <div className="mb-4 rounded-lg bg-surface-sidebar p-3 flex flex-wrap items-center gap-3">
      <CalendarDays className="h-4 w-4 shrink-0 text-ink-3" />
      <div className="min-w-[150px] flex-1">
        <div className="text-body-lg font-medium text-ink tabular-nums">{consult.start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(consult.start)}</div>
        <div className={`mt-0.5 inline-flex items-center gap-1.5 text-small ${consult.confirmed ? "text-emerald-700" : "text-amber-700"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${consult.confirmed ? "bg-emerald-500" : "bg-amber-500"}`} />{consult.confirmed ? "Confirmed" : "Not confirmed"} · {consult.mode === "Video" ? "Video" : "Phone"}
        </div>
      </div>
      <button
        onClick={() => { actions.sendWhatsApp(WA_TEMPLATE_TEXT["Consult reminder"](lead)); showToast("Reminder sent on WhatsApp"); }}
        className="h-8 rounded-md border border-line-control bg-white px-2.5 text-small text-ink-2 hover:bg-surface-subtle"
      >
        Send reminder
      </button>
      <button onClick={() => (consult.mode === "Video" ? openWhatsApp(lead.phone) : openCall(lead.phone))} className="h-8 rounded-md border border-line-control bg-white px-3 text-small font-medium text-ink hover:bg-surface-subtle">
        {consult.mode === "Video" ? "Join" : "Call"}
      </button>
    </div>
  ) : (
    <div className="mb-4 rounded-lg bg-surface-sidebar p-3 flex items-center gap-3 text-body text-ink-4">
      <CalendarDays className="h-4 w-4 shrink-0" /> No consultation booked
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-48px)] md:h-[100dvh] bg-white">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-5 md:px-8 pt-4 pb-16 max-w-[1180px]">
          <div className="flex items-center gap-3">
            <button onClick={() => onBack("all")} title="Back (Esc)" className="inline-flex items-center gap-1 text-small text-ink-4 hover:text-ink transition-colors duration-150">
              <ChevronLeft className="h-3.5 w-3.5" /> {crumbRoot}
            </button>
            {nav && (
              <div className="ml-auto flex items-center gap-1 text-small text-ink-4 tabular-nums">
                <span className="mr-1.5 hidden sm:inline">{nav.index + 1} of {nav.total}</span>
                <button onClick={nav.prev} disabled={!nav.prev} title="Previous lead (K)" aria-label="Previous lead" aria-keyshortcuts="K" className="h-7 rounded-md border border-line-control px-1.5 inline-flex items-center gap-1 hover:bg-surface-subtle disabled:opacity-35 disabled:cursor-not-allowed"><ChevronUp className="h-3.5 w-3.5" /><Kbd>K</Kbd></button>
                <button onClick={nav.next} disabled={!nav.next} title="Next lead (J)" aria-label="Next lead" aria-keyshortcuts="J" className="h-7 rounded-md border border-line-control px-1.5 inline-flex items-center gap-1 hover:bg-surface-subtle disabled:opacity-35 disabled:cursor-not-allowed"><ChevronDown className="h-3.5 w-3.5" /><Kbd>J</Kbd></button>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="mt-3 flex flex-wrap items-start gap-x-3.5 gap-y-3">
            <span className="cw-avatar-in h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full bg-surface-active text-ink-2 text-title-sm font-medium flex items-center justify-center">
              {lead.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <div className="cw-rise min-w-0 flex-1" style={{ animationDelay: "40ms" }}>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-title sm:text-title font-semibold tracking-[-0.01em] text-ink text-balance">{lead.name}</h1>
                <button onClick={(e) => setMenu(menu?.type === "stage" ? null : { type: "stage", anchor: e.currentTarget })} title="Change stage" className={`h-[22px] rounded-full px-2.5 text-small inline-flex items-center gap-1.5 hover:opacity-80 ${STAGE_PILL[lead.stage] || STAGE_PILL.New}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[lead.stage] || "bg-stone-400"}`} />{lead.stage}<ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-body text-ink-3 tabular-nums">
                {[lead.customerId, lead.phone, consultLine].filter(Boolean).map((t, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span aria-hidden="true" className="text-ink-faint">·</span>}
                    <span className="whitespace-nowrap">{t}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="cw-rise hidden sm:flex shrink-0 items-center gap-2" style={{ animationDelay: "90ms" }}>
              <button onClick={() => setTab("whatsapp")} title="WhatsApp (W)" aria-keyshortcuts="W" className="inline-flex flex-none justify-center h-8 rounded-md px-3 inline-flex items-center gap-1.5 text-small font-medium text-white bg-ink hover:bg-black"><WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp</button>
              <a href={telHref(lead.phone)} title="Call (C)" aria-keyshortcuts="C" className="inline-flex flex-none justify-center h-8 rounded-md border border-line-control px-2.5 inline-flex items-center gap-1.5 text-small text-ink-2 hover:bg-surface-subtle"><Phone className="h-3.5 w-3.5" /> Call</a>
              <button onClick={(e) => setMenu(menu?.type === "more" ? null : { type: "more", anchor: e.currentTarget })} aria-label="More" className={`h-9 w-9 sm:h-8 sm:w-8 rounded-lg border border-line-control flex items-center justify-center text-ink-3 hover:bg-surface-subtle ${menu?.type === "more" ? "bg-surface-hover" : ""}`}><MoreHorizontal className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Tabs */}
          <div className="cw-rise relative mt-5 -mx-5 px-5 sm:mx-0 sm:px-0 flex items-center gap-5 sm:gap-6 border-b border-line overflow-x-auto [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]" style={{ animationDelay: "110ms" }}>
            {tabs.map(([id, label, count]) => (
              <button key={id} ref={(el) => (tabRefs.current[id] = el)} onClick={() => setTab(id)} className={`h-10 shrink-0 inline-flex items-center gap-1.5 text-body transition-colors duration-150 ${tab === id ? "text-ink font-medium" : "text-ink-4 hover:text-ink"}`}>
                {label}
                {count > 0 && <span className="text-small font-normal text-ink-4 tabular-nums">{count}</span>}
              </button>
            ))}
            <span className="absolute -bottom-px left-0 h-[2px] w-px rounded-full origin-left transition-transform duration-[250ms]" style={{ transform: `translateX(${ind.left}px) scaleX(${ind.width})`, backgroundColor: "#1F1F1F", transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }} />
          </div>

          <div key={tab} className="mt-5">
            {tab === "overview" && (
              <div className="space-y-4">
                {/* Next action */}
                {(actionText || due) && !["Won", "Lost"].includes(lead.stage) && (
                  <div className={`cw-rise rounded-xl border px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2.5 ${tone[0]}`} style={{ animationDelay: "60ms" }}>
                    <ActionIcon className={`h-4 w-4 shrink-0 ${tone[1]}`} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-body-lg font-medium ${tone[1]}`}>{actionText || "Follow up"}</div>
                      {due && <div className={`mt-0.5 text-small tabular-nums ${tone[2]}`}>{due.text}</div>}
                    </div>
                    <div className="w-full sm:w-auto flex items-center gap-2">
                      <button onClick={primary.run} className="flex-1 sm:flex-none h-9 sm:h-8 rounded-md border border-black/10 bg-white px-3 text-small font-medium text-ink hover:bg-surface-subtle">{primary.label}</button>
                      <button ref={snoozeRef} onClick={(e) => setMenu({ type: "snooze", anchor: e.currentTarget })} title="Snooze (S)" aria-label="Snooze" aria-keyshortcuts="S" className="h-9 sm:h-8 min-w-9 sm:min-w-8 rounded-lg border border-black/10 bg-white px-2 inline-flex items-center justify-center gap-1.5 text-small text-ink-2 hover:bg-surface-subtle"><Clock className="h-3.5 w-3.5" /><span className="hidden md:inline">Snooze</span></button>
                      <button ref={doneRef} onClick={(e) => setMenu({ type: "done", anchor: e.currentTarget })} title="Done (E)" aria-label="Done" aria-keyshortcuts="E" className="h-9 sm:h-8 min-w-9 sm:min-w-8 rounded-lg border border-black/10 bg-white px-2 inline-flex items-center justify-center gap-1.5 text-small text-ink-2 hover:bg-surface-subtle"><Check className="h-3.5 w-3.5" /><span className="hidden md:inline">Done</span></button>
                    </div>
                  </div>
                )}

                {/* On a phone the two columns dissolve into one list, ordered by what you act on first */}
                <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
                  <div className="contents lg:block lg:space-y-4 lg:min-w-0">
                    <EditCard title={born ? "Customer and baby" : "Customer and pregnancy"} fields={customerFields} onSave={saveCustomer} validate={validateCustomer} delay={80} className="order-4 lg:order-none" />
                    <EditCard title="Care requirements" fields={careFields} onSave={saveCare} validate={validateCare} delay={160} className="order-5 lg:order-none" top={<CareTimeline lead={lead} now={now} />} />
                    <EditCard title="Consultation and payment" fields={payFields} onSave={savePay} validate={validatePay} top={consultBox} delay={240} className="order-2 lg:order-none" />
                  </div>
                  <div className="contents lg:block lg:space-y-4 lg:min-w-0">
                    <OvCard title="Key notes" delay={120} className="order-1 lg:order-none" right={<button onClick={() => setAddNote(Date.now())} className="h-7 rounded-md px-1.5 text-small text-ink-4 hover:bg-surface-hover hover:text-ink">+ Add</button>}>
                      <KeyNotes notes={keyNotes} onChange={setKeyNotes} addSignal={addNote} hideAdd divided />
                    </OvCard>
                    <OvCard title="Sales" delay={200} className="order-3 lg:order-none">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
                        <div>
                          <Lbl>Stage</Lbl>
                          <button onClick={(e) => setMenu({ type: "stage", anchor: e.currentTarget })} className="group mt-0.5 inline-flex items-center gap-1 text-body-lg font-medium text-ink">{lead.stage}<ChevronDown className="h-3.5 w-3.5 text-ink-4 opacity-0 [@media(hover:none)]:opacity-100 group-hover:opacity-100 transition-opacity" /></button>
                        </div>
                        <div>
                          <Lbl>Priority</Lbl>
                          <button onClick={(e) => setMenu({ type: "priority", anchor: e.currentTarget })} className="group mt-0.5 inline-flex items-center gap-1.5 text-body-lg font-medium text-ink"><span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priority]}`} />{priority}<ChevronDown className="h-3.5 w-3.5 text-ink-4 opacity-0 [@media(hover:none)]:opacity-100 group-hover:opacity-100 transition-opacity" /></button>
                        </div>
                        <div><Lbl>Source</Lbl><Val>{lead.source}</Val></div>
                        <div><Lbl auto="Updated automatically from the latest call, message or payment">Last interaction</Lbl><Val>{lastInteraction}</Val></div>
                        <div>
                          <Lbl>Outcome tag</Lbl>
                          <button onClick={(e) => setMenu({ type: "tag", anchor: e.currentTarget })} className="group mt-0.5 inline-flex items-center gap-1.5 text-body-lg font-medium text-ink">{lead.tag ? <><span className={`h-1.5 w-1.5 rounded-full ${TAG_DOTS[lead.tag] || "bg-line-heavy"}`} />{lead.tag}</> : <span className="font-normal text-ink-faint">—</span>}<ChevronDown className="h-3.5 w-3.5 text-ink-4 opacity-0 [@media(hover:none)]:opacity-100 group-hover:opacity-100 transition-opacity" /></button>
                        </div>
                        <div><Lbl>Next follow-up</Lbl><Val>{unread ? "Now" : lead.nextFollowUp ? `${fmtDay(lead.nextFollowUp)}, ${fmtTime(lead.nextFollowUp)}` : null}</Val></div>
                        <div><Lbl>Created</Lbl><Val>{fmtShortDateY(lead.createdAt)}</Val></div>
                        <div><Lbl>Customer ID</Lbl><Val><span className="tabular-nums">{lead.customerId}</span></Val></div>
                        {lead.stage === "Lost" && <div className="col-span-2"><Lbl>Lost reason</Lbl><Val>{lead.lostReason}</Val></div>}
                        {lead.stage === "Deferred" && <div className="col-span-2"><Lbl>Deferred until</Lbl><Val>{lead.deferredUntil ? `${fmtShortDateY(lead.deferredUntil)}${lead.deferNote ? ` · ${lead.deferNote}` : ""}` : null}</Val></div>}
                      </div>
                    </OvCard>
                    <OvCard title="Recent activity" delay={280} className="order-6 lg:order-none" right={<button onClick={() => setTab("activity")} className="text-small text-ink-4 hover:text-ink">View all</button>}>
                      <ActivityList events={activity} now={now} limit={5} wrap />
                    </OvCard>
                  </div>
                </div>
              </div>
            )}

            {tab === "calls" && <CallsTab calls={calls} now={now} onLog={actions.logCall} />}

            {tab === "followups" && <FollowUpsTab items={myFus} now={now} onAdd={(f) => { addFollowup(f); showToast(`Follow-up set for ${fmtDay(f.due)}, ${fmtTime(f.due)}`); }} onDone={fuDone} />}

            {tab === "services" && isCustomer && (
              <div className="cw-fade-in max-w-[900px]">
                <CustomerServices lead={lead} now={now} onUpdate={onUpdate} onEvent={onEvent} onSell={(e) => onSell?.(e)} showToast={showToast} />
              </div>
            )}

            {tab === "activity" && (
              <div className="max-w-[860px]"><ActivityList events={activity} now={now} wrap /></div>
            )}

            {tab === "whatsapp" && (
              <div className="cw-fade-in h-[560px] max-w-[860px] rounded-xl border border-line overflow-hidden">
                <WhatsAppConversation lead={lead} timeline={timeline} now={now} onSend={actions.sendWhatsApp} showToast={showToast} />
              </div>
            )}

            {tab === "notes" && (
              <div className="cw-fade-in max-w-[760px] space-y-8">
                <section>
                  <h3 className="text-body font-medium text-ink mb-2">Key notes</h3>
                  <KeyNotes notes={keyNotes} onChange={setKeyNotes} />
                </section>
                <section>
                  <h3 className="text-body font-medium text-ink mb-2">Call and visit notes</h3>
                  <div className="rounded-xl border border-line-control focus-within:border-line-heavy transition-colors">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Write a note about this lead…" className="w-full resize-none rounded-xl px-3.5 py-3 text-body outline-none placeholder:text-ink-placeholder" />
                    <div className="flex justify-end px-2 pb-2">
                      <PrimaryButton disabled={!note.trim()} onClick={() => { actions.addNote(note.trim()); setNote(""); showToast("Note added"); }}>Add note</PrimaryButton>
                    </div>
                  </div>
                  <div className="mt-4 divide-y divide-line-subtle">
                    {notes.map((n) => (
                      <div key={n.id} className="py-3.5">
                        <div className="text-body-lg text-ink whitespace-pre-wrap">{n.text}</div>
                        <div className="mt-1 text-small text-ink-4">{fmtRel(now - n.at)}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {tab === "files" && (
              <div className="cw-fade-in max-w-[760px]">
                <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) actions.addFile(f); e.target.value = ""; }} />
                <button onClick={() => fileRef.current?.click()} className="w-full h-20 rounded-xl border border-dashed border-line-strong text-body text-ink-4 hover:border-line-heavy hover:text-ink inline-flex items-center justify-center gap-2 transition-colors"><Upload className="h-4 w-4" /> Upload a file</button>
                <div className="mt-4 divide-y divide-line-subtle">
                  {files.map((f) => (
                    <div key={f.id} className="py-3 flex items-center gap-3 text-body">
                      <span className="h-8 w-8 rounded-lg bg-surface-hover flex items-center justify-center"><FileText className="h-4 w-4 text-ink-3" /></span>
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      <span className="text-small text-ink-4">{fmtRel(now - f.at)}</span>
                    </div>
                  ))}
                  {!files.length && <div className="py-8 text-body text-ink-4">No files yet</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Phones: the main actions sit at the bottom, in thumb reach */}
      <div className="sm:hidden shrink-0 border-t border-line bg-white px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] flex items-center gap-2">
        <button onClick={() => setTab("whatsapp")} className="flex-1 h-11 rounded-md inline-flex items-center justify-center gap-1.5 text-body font-medium text-white bg-ink hover:bg-black"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</button>
        <a href={telHref(lead.phone)} className="flex-1 h-11 rounded-md border border-line-control inline-flex items-center justify-center gap-1.5 text-body font-medium text-ink"><Phone className="h-4 w-4" /> Call</a>
        <button onClick={(e) => setMenu(menu?.type === "more" ? null : { type: "more", anchor: e.currentTarget })} aria-label="More" className="h-11 w-11 shrink-0 rounded-md border border-line-control flex items-center justify-center text-ink-3"><MoreHorizontal className="h-4 w-4" /></button>
      </div>

      {menu && (
        <FixedMenu anchor={menu.anchor} onClose={closeMenu} width={menu.type === "done" ? 240 : 220} align={["more", "snooze", "done"].includes(menu.type) ? "right" : "left"}>
          {menu.type === "stage" &&
            STAGES.map((s) => (
              <MenuItem key={s.id} onClick={() => { closeMenu(); actions.changeStage(s.id); }}>
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                <span className="flex-1">{s.id}</span>
                {lead.stage === s.id && <Check className="h-3.5 w-3.5 text-ink-3" />}
              </MenuItem>
            ))}
          {menu.type === "priority" &&
            PRIORITIES.map((p) => (
              <MenuItem key={p} onClick={() => { closeMenu(); onUpdate(lead.id, { priority: p }); showToast(`Priority set to ${p}`); }}>
                <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[p]}`} />
                <span className="flex-1">{p}</span>
                {priority === p && <Check className="h-3.5 w-3.5 text-ink-3" />}
              </MenuItem>
            ))}
          {menu.type === "tag" &&
            OUTCOME_TAGS.filter((t) => !["Converted", "Lost", "Deferred"].includes(t)).map((t) => (
              <MenuItem key={t} onClick={() => { closeMenu(); edit({ tag: t }, `Outcome tag · ${t}`); showToast(`Tagged ${t}`); }}>
                <span className={`h-2 w-2 rounded-full ${TAG_DOTS[t] || "bg-line-heavy"}`} />
                <span className="flex-1">{t}</span>
                {lead.tag === t && <Check className="h-3.5 w-3.5 text-ink-3" />}
              </MenuItem>
            ))}
          {menu.type === "snooze" && (
            <>
              <MenuHeading>Snooze until</MenuHeading>
              {[["later", "Later today"], ["tomorrow", "Tomorrow, 10 am"], ["3days", "In 3 days"], ["week", "Next week"]].map(([k, l]) => (
                <MenuItem key={k} onClick={() => snoozeTo(k)}><span className="flex-1">{l}</span></MenuItem>
              ))}
            </>
          )}
          {menu.type === "done" && !menu.outcome && (
            <>
              <MenuHeading>What happened?</MenuHeading>
              {OUTCOMES.filter((o) => o !== "Converted").map((o) => (
                <MenuItem key={o} onClick={() => {
                  if (o === "Lost") { closeMenu(); return onRequestStage(lead.id, "Lost"); }
                  if (o === "Deferred") { closeMenu(); return onRequestStage(lead.id, "Deferred"); }
                  const needsNext = actions.done(o);
                  if (needsNext) setMenu((m) => ({ ...m, outcome: o }));
                  else closeMenu();
                }}>
                  <span className={`h-1.5 w-1.5 rounded-full ${TAG_DOTS[o] || "bg-line-heavy"}`} />
                  <span className="flex-1">{o}</span>
                </MenuItem>
              ))}
            </>
          )}
          {menu.type === "done" && menu.outcome && (
            <>
              <MenuHeading>Next follow-up</MenuHeading>
              {[[1, "Tomorrow, 10 am"], [2, "In 2 days"], [7, "In a week"], [null, "No follow-up"]].map(([d, l]) => (
                <MenuItem key={l} onClick={() => nextAfter(d)}><span className="flex-1">{l}</span></MenuItem>
              ))}
            </>
          )}
          {menu.type === "more" && (
            <>
              <MenuItem onClick={() => { closeMenu(); onRequestStage(lead.id, "Lost"); }}><CircleX className="h-3.5 w-3.5 text-ink-4" /> Mark lost</MenuItem>
              <MenuItem onClick={() => { closeMenu(); onRequestStage(lead.id, "Deferred"); }}><PauseCircle className="h-3.5 w-3.5 text-ink-4" /> Defer</MenuItem>
              <MenuItem onClick={() => { closeMenu(); actions.copyPhone(); }}><Copy className="h-3.5 w-3.5 text-ink-4" /> Copy phone</MenuItem>
              <MenuSep />
              <MenuItem onClick={() => { closeMenu(); onDelete?.(lead.id); }}><Trash2 className="h-3.5 w-3.5 text-red-500" /> <span className="text-red-700">Delete</span></MenuItem>
            </>
          )}
        </FixedMenu>
      )}
    </div>
  );
}

function LeadRecord(props) {
  return <LeadRecordSimple {...props} />;
}

// Number that rolls up (or down) when it changes, as in the selection bar
function RollingNumber({ value }) {
  const [state, setState] = useState({ cur: value, prev: null, dir: "up", key: 0 });
  useEffect(() => {
    setState((s) => (s.cur === value ? s : { cur: value, prev: s.cur, dir: value > s.cur ? "up" : "down", key: s.key + 1 }));
  }, [value]);
  useEffect(() => {
    if (state.prev == null) return;
    const t = setTimeout(() => setState((s) => ({ ...s, prev: null })), 170);
    return () => clearTimeout(t);
  }, [state.key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className="relative inline-flex overflow-hidden h-5 align-middle tabular-nums">
      <span key={`c${state.key}`} className={state.key ? `cw-roll-${state.dir}-in` : ""}>{state.cur}</span>
      {state.prev != null && <span key={`p${state.key}`} className={`absolute inset-0 cw-roll-${state.dir}-out`}>{state.prev}</span>}
    </span>
  );
}

function LeadsPage({ leads, setLeads, now, showToast, dismissToast, setToastRaised, timelines, setTimelines, recordRequest, filterRequest, viewRequest, viewRowMatch, onViewChange, onStateChange, onNewView, onSell, newLeadRequest, consults = [], followups = [], setFollowups }) {
  const [activeView, setActiveView] = useState(null);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({}); // field id -> [values]
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [groupBy, setGroupBy] = useState("none");
  const [view, setView] = useState("table");
  const [colsByKey, setColsByKey] = useState(DEFAULT_COLS);
  const colKey = colKeyFor(tab);
  const cols = colsByKey[colKey];
  const setCols = (fn) => setColsByKey((c) => ({ ...c, [colKey]: typeof fn === "function" ? fn(c[colKey]) : fn }));
  const availableCols = LEAD_COLUMNS.filter((c) => !(TAB_EXCLUDED_COLS[tab] || []).includes(c.id));
  const [selected, setSelected] = useState(() => new Set());
  const [panelId, setPanelId] = useState(null);
  const [menu, setMenu] = useState(null); // { type, anchor, leadId?, field? }
  const [pendingStage, setPendingStage] = useState(null); // { ids, stage }
  const [recordId, setRecordId] = useState(null);
  const [recordView, setRecordView] = useState("simple");
  useEffect(() => {
    if (filterRequest) {
      setTab("all");
      setRecordId(null);
      setActiveView(null);
      setFilters(filterRequest.filters);
    }
  }, [filterRequest]);
  // Saved view opened from the sidebar (view: null = plain Leads, clear everything)
  useEffect(() => {
    if (!viewRequest) return;
    const v = viewRequest.view;
    setRecordId(null);
    setQuery("");
    setSelected(new Set());
    setActiveView(v);
    setTab(v?.tab || "all");
    setFilters(v?.filters || {});
    setSort(v?.sort || DEFAULT_SORT);
  }, [viewRequest]);
  useEffect(() => {
    onViewChange?.(activeView?.id || null);
  }, [activeView]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    onStateChange?.({ tab, filters, viewId: activeView?.id || null });
  }, [tab, filters, activeView]); // eslint-disable-line react-hooks/exhaustive-deps
  const clearView = () => {
    if (!activeView) return;
    if (activeView.sort) setSort(DEFAULT_SORT);
    if (activeView.custom) {
      setFilters({});
      setTab("all");
    }
    setActiveView(null);
  };
  useEffect(() => {
    if (recordRequest) {
      setTab("all");
      setRecordId(recordRequest.id);
    }
  }, [recordRequest]);

  // Timeline events, built lazily per lead and kept in App state
  const logEvent = (id, ev, transform) =>
    setTimelines((t) => {
      const lead = leads.find((l) => l.id === id);
      const cur = t[id] || (lead ? buildTimeline(lead) : []);
      const next = transform ? transform(cur) : [ev, ...cur];
      return { ...t, [id]: next };
    });
  const updateLead = (id, patch) => setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const openRecord = (id) => {
    setPanelId(null);
    setRecordId(id);
  };
  const [newOpen, setNewOpen] = useState(false);
  useEffect(() => {
    if (newLeadRequest) {
      setRecordId(null);
      setNewOpen(true);
    }
  }, [newLeadRequest]);

  useEffect(() => {
    setToastRaised(selected.size > 0);
    return () => setToastRaised(false);
  }, [selected.size, setToastRaised]);

  // Esc closes the panel (menus and modals handle their own Esc first)
  useEffect(() => {
    const k = (e) => {
      if (e.key !== "Escape" || menu || pendingStage || newOpen) return;
      if (panelId) setPanelId(null);
      else if (selected.size) setSelected(new Set());
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const openMenu = (type, e, extra = {}) => {
    e.stopPropagation();
    const anchor = e.currentTarget;
    setMenu((m) => (m && m.anchor === anchor ? null : { type, anchor, ...extra }));
  };
  const closeMenu = useCallback(() => setMenu(null), []);

  /* ----- mutations with undo ----- */
  const mutate = (ids, patchFn, message) => {
    const snapshot = leads;
    const idSet = new Set(ids);
    setLeads((prev) => prev.map((l) => (idSet.has(l.id) ? { ...l, ...patchFn(l) } : l)));
    showToast(message, () => {
      setLeads(snapshot);
      dismissToast();
    });
  };
  const nameOrCount = (ids) => (ids.length === 1 ? leads.find((l) => l.id === ids[0])?.name : `${ids.length} leads`);

  const commitStage = (ids, stage, extra = {}) => {
    ids.forEach((id) => {
      const l = leads.find((x) => x.id === id);
      if (l && l.stage !== stage)
        logEvent(id, {
          id: uid(), type: "stage", from: l.stage, to: stage, by: ME, at: new Date(),
          extra: stage === "Lost" ? extra.lostReason : stage === "Deferred" ? [extra.deferredUntil && `Until ${fmtShortDate(extra.deferredUntil)}`, extra.deferNote].filter(Boolean).join(" · ") : null,
        });
    });
    mutate(
      ids,
      (l) => ({
        prevStage: stage === "Lost" || stage === "Deferred" ? (PIPELINE.includes(l.stage) ? l.stage : l.prevStage) : null,
        nextAction: NEXT_ACTION_BY_STAGE[stage] || null,
        stage,
        lostReason: stage === "Lost" ? extra.lostReason : null,
        deferredUntil: stage === "Deferred" ? extra.deferredUntil : null,
        deferNote: stage === "Deferred" ? extra.deferNote || "" : "",
        ...(stage === "Deferred" ? { nextFollowUp: extra.deferredUntil, needsReply: false } : {}),
        ...(stage === "Lost" || stage === "Won" ? { nextFollowUp: null, needsReply: false } : {}),
      }),
      stage === "Won" ? `${nameOrCount(ids)} ${ids.length > 1 ? "are" : "is"} now in Paid customers` : `Moved ${nameOrCount(ids)} to ${stage}`
    );
  };
  const requestStage = (ids, stage) => {
    if (stage === "Lost" || stage === "Deferred") setPendingStage({ ids, stage });
    else commitStage(ids, stage);
  };
  const setFollowUp = (ids, date) =>
    mutate(ids, () => ({ nextFollowUp: date, needsReply: false }), date ? `Follow-up set for ${dayDiff(date, now) === 0 ? `today, ${fmtTime(date)}` : fmtDay(date)}` : "Follow-up cleared");

  const createLead = (f) => {
    const t = Date.now();
    const date = startOfDay(f.date ? new Date(`${f.date}T10:00:00`) : f.status === "P" ? new Date(t + 60 * DAY) : new Date(t));
    const nextNo = Math.max(0, ...leads.map((l) => l.customerNo || 0)) + 1;
    const lead = {
      id: `N${t}`,
      customerNo: nextNo,
      customerId: customerId(nextNo, f.status === "P" ? "P" : "B"),
      name: f.name.trim() || "New lead",
      phone: f.phone,
      priority: f.priority || "Medium",
      createdAt: new Date(t),
      stage: "New",
      careKind: f.status,
      dueDate: f.status === "P" ? date : null,
      babyDob: f.status === "B" ? date : null,
      babies: 1,
      birthWeights: [],
      currentWeights: [],
      services: [],
      shiftType: null,
      shiftHours: null,
      careStart: null,
      careEnd: null,
      package: null,
      hospital: f.hospital || null,
      zone: f.zone || null,
      address: "",
      source: f.source || "Website",
      score: 50,
      tag: null,
      lastActivity: { type: "Created", at: new Date(t), by: null, none: true },
      unread: 0,
      needsReply: false,
      nextFollowUp: workHours(roundQuarter(new Date(t + 3600000))),
      lostReason: null,
      deferredUntil: null,
      deferNote: "",
      paymentStatus: "Not sent",
      amountPaid: 0,
      bookingStatus: "Not booked",
      paymentLinkOpened: false,
    };
    setLeads((prev) => [lead, ...prev]);
    setNewOpen(false);
    setPanelId(lead.id);
    showToast(`${lead.name} added`, () => {
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setPanelId(null);
      dismissToast();
    });
  };

  /* ----- derived rows ----- */
  const q = query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const tabFn = LEAD_TABS.find((t) => t.id === tab).fn;
  const matchesFilters = (l) => Object.entries(filters).every(([f, vals]) => !vals.length || vals.some((v) => fieldMatches(l, f, v)));
  const matchesSearch = (l) => !q || l.name.toLowerCase().includes(q) || (qDigits.length >= 3 && l.phone.replace(/\D/g, "").includes(qDigits));

  const rows = useMemo(() => {
    const sf = SORT_FIELDS.find((s) => s.id === sort.field);
    const mul = sort.dir === "asc" ? 1 : -1;
    return leads
      .filter((l) => tabFn(l) && matchesSearch(l) && matchesFilters(l) && (!activeView || viewRowMatch(activeView, l)))
      .sort((a, b) => {
        const va = sf.val(a);
        const vb = sf.val(b);
        if (va === vb) return 0;
        if (va === Infinity) return 1;
        if (vb === Infinity) return -1;
        return (va > vb ? 1 : -1) * mul;
      });
  }, [leads, tab, q, filters, sort, activeView, viewRowMatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: null, rows }];
    const get = (l) => (groupBy === "priority" ? leadPriority(l) : l[groupBy] ?? "—");
    const keys = groupBy === "stage" ? STAGES.map((s) => s.id) : [...new Set(rows.map(get))].sort();
    return keys.map((k) => ({ key: k, rows: rows.filter((l) => get(l) === k) })).filter((g) => g.rows.length);
  }, [rows, groupBy]);

  const tabCounts = useMemo(() => {
    const base = activeView ? leads.filter((l) => viewRowMatch(activeView, l)) : leads;
    return Object.fromEntries(LEAD_TABS.map((t) => [t.id, base.filter(t.fn).length]));
  }, [leads, activeView, viewRowMatch]);
  const panelLead = leads.find((l) => l.id === panelId) || null;
  const selectedIds = [...selected].filter((id) => leads.some((l) => l.id === id));
  // Rows cascade in again whenever the list itself changes (tab, filters, sort, grouping, view)
  const rowsAnimKey = `${tab}|${JSON.stringify(filters)}|${sort.field}${sort.dir}|${groupBy}|${activeView?.id || ""}`;
  const rowOrder = new Map(groups.flatMap((g) => g.rows).map((l, i) => [l.id, i]));
  // Long lists render 100 rows at a time so the table stays fast with thousands of leads
  const ROW_PAGE = 100;
  const [rowLimit, setRowLimit] = useState(ROW_PAGE);
  useEffect(() => setRowLimit(ROW_PAGE), [rowsAnimKey, q]);
  // Keep the bar mounted while it slides away, showing the last count
  const [barCount, setBarCount] = useState(0);
  useEffect(() => {
    if (selectedIds.length) setBarCount(selectedIds.length);
  }, [selectedIds.length]);
  const allVisibleSelected = rows.length > 0 && rows.every((l) => selected.has(l.id));
  const someVisibleSelected = rows.some((l) => selected.has(l.id));

  const toggleRow = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      if (allVisibleSelected) rows.forEach((l) => n.delete(l.id));
      else rows.forEach((l) => n.add(l.id));
      return n;
    });

  const toggleFilterValue = (field, value) =>
    setFilters((f) => {
      const cur = f[field] || [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      const out = { ...f, [field]: next };
      if (!next.length) delete out[field];
      return out;
    });

  const sortField = SORT_FIELDS.find((s) => s.id === sort.field);
  const visibleCols = cols.map((id) => COLUMN[id]).filter((c) => c && availableCols.includes(c));

  /* ----- table cells ----- */
  // "WhatsApp all" and "Assign" act on the selection, or on every lead in the current view
  const targetIds = selectedIds.length ? selectedIds : rows.map((l) => l.id);
  const targetLabel = selectedIds.length
    ? `${selectedIds.length} selected lead${selectedIds.length > 1 ? "s" : ""}`
    : `${rows.length} lead${rows.length === 1 ? "" : "s"} in this view`;
  const hiddenCount = availableCols.length - visibleCols.length;

  // Shadow on the frozen columns once the table is scrolled sideways
  const [scrolledX, setScrolledX] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const editableCell = (type, lead, content, align = "left") => (
    <button
      onClick={(e) => openMenu(type, e, { leadId: lead.id })}
      className={`-mx-1.5 px-1.5 h-7 w-[calc(100%+12px)] rounded-md flex items-center transition-colors duration-150 hover:bg-surface-active ${
        align === "right" ? "justify-end" : ""
      } ${menu?.leadId === lead.id && menu?.type === type ? "bg-surface-active" : ""}`}
    >
      {content}
    </button>
  );

  const NA = <span className="text-ink-faint">—</span>;
  const num = (v) => <span className="block text-right tabular-nums text-ink">{v ?? NA}</span>;
  const dateCell = (d) => (d ? <span className="text-ink-3 whitespace-nowrap tabular-nums">{fmtShortDate(d)}</span> : NA);

  const renderCell = (col, l) => {
    const born = l.careKind === "B";
    switch (col) {
      case "customerId":
        return <span className="text-ink-3 tabular-nums whitespace-nowrap">{l.customerId}</span>;
      case "phone":
        return <span className="text-ink-3 whitespace-nowrap tabular-nums">{l.phone}</span>;
      case "created":
        return dateCell(l.createdAt);
      case "stage":
        return editableCell("stage", l, <StageLabel lead={l} />);
      case "care":
        return <span className="text-ink whitespace-nowrap tabular-nums">{born ? `Born · ${babyAge(l, now) || "—"}` : (careStage(l, now).split(" · ")[1] || "—")}</span>;
      case "value": {
        const v = packageValue(l);
        return v ? num(fmtINR(v)) : NA;
      }
      case "interactionAt":
        return l.lastActivity.none ? (
          NA
        ) : (
          <span className="text-ink-3 whitespace-nowrap tabular-nums" title={fmtRel(now - l.lastActivity.at)}>
            {fmtShortDate(l.lastActivity.at)}, {fmtTime(l.lastActivity.at)}
          </span>
        );
      case "interactionType":
        return l.lastActivity.none ? (
          <span className="text-ink-4 whitespace-nowrap">No interactions</span>
        ) : (
          <span className="flex items-center gap-1.5 whitespace-nowrap text-ink">
            {l.lastActivity.type}
          </span>
        );
      case "reason":
        if (l.stage === "Lost") return <span className="text-ink whitespace-nowrap"><span className="text-ink-4">Lost · </span>{l.lostReason}</span>;
        if (l.stage === "Deferred")
          return (
            <span className="block truncate text-ink" title={l.deferNote}>
              <span className="text-ink-4 tabular-nums">Till {l.deferredUntil ? fmtShortDate(l.deferredUntil) : "—"}{l.deferNote ? " · " : ""}</span>
              {l.deferNote}
            </span>
          );
        return NA;
      case "address":
        return l.address ? <span className="block truncate text-ink-3" title={l.address}>{l.address}</span> : NA;
      case "due":
        return dateCell(l.dueDate);
      case "dob":
        return dateCell(l.babyDob);
      case "babyAge":
        return born ? num(babyAge(l, now)) : NA;
      case "babies":
        return num(l.babies);
      case "birthWeight":
        return born && l.birthWeights.length ? num(fmtKg(l.birthWeights)) : NA;
      case "currentWeight":
        return born && l.currentWeights.length ? num(fmtKg(l.currentWeights)) : NA;
      case "services":
        return <ServiceTags services={l.services} max={2} />;
      case "shiftType":
        return l.shiftType ? <span className="text-ink">{l.shiftType}</span> : NA;
      case "shiftHours":
        return num(l.shiftHours);
      case "careStart":
        return dateCell(l.careStart);
      case "careEnd":
        return dateCell(l.careEnd);
      case "serviceDays":
        return num(serviceDays(l));
      case "package":
        return editableCell("package", l, <span className={l.package ? "text-ink" : "text-ink-4"}>{l.package || "—"}</span>);
      case "source":
        return (
          <span className="flex items-center gap-1.5 text-ink-3 whitespace-nowrap">
            <SourceIcon source={l.source} />
            {l.source}
          </span>
        );
      case "interaction":
        return l.lastActivity.none ? (
          <span className="text-ink-4 whitespace-nowrap">No interactions</span>
        ) : (
          <span className="text-ink-3 whitespace-nowrap">
            {l.lastActivity.type} · <span className="tabular-nums">{fmtRel(now - l.lastActivity.at)}</span>
          </span>
        );
      case "next":
        return editableCell("next", l, <FollowUp lead={l} now={now} />);
      case "lostReason":
        return l.stage === "Lost" ? <span className="text-ink-3 whitespace-nowrap">{l.lostReason}</span> : NA;
      case "deferredUntil":
        return l.stage === "Deferred" && l.deferredUntil ? (
          <span className="text-ink-3 whitespace-nowrap tabular-nums" title={l.deferNote}>{fmtShortDate(l.deferredUntil)}</span>
        ) : (
          NA
        );
      case "hospital":
        return l.hospital ? <span className="text-ink-3 whitespace-nowrap">{l.hospital}</span> : NA;
      case "zone":
        return l.zone ? <span className="text-ink-3 whitespace-nowrap">{l.zone}</span> : NA;
      case "payment":
        return editableCell("payment", l, <DotLabel dot={PAYMENT_DOT[l.paymentStatus]}>{l.paymentStatus}</DotLabel>);
      case "amount":
        return l.amountPaid ? num(fmtINR(l.amountPaid)) : <span className="block text-right tabular-nums text-ink-faint">₹0</span>;
      case "booking":
        return editableCell("booking", l, <DotLabel dot={BOOKING_DOT[l.bookingStatus]}>{l.bookingStatus}</DotLabel>);
      case "priority": {
        const p = leadPriority(l);
        return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink"><span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[p]}`} />{p}</span>;
      }
      default:
        return null;
    }
  };

  // Payment status drives booking: Paid → Confirmed automatically
  const setPayment = (id, status) => {
    const lead = leads.find((l) => l.id === id);
    const autoConfirm = status === "Paid" && lead.bookingStatus !== "Confirmed";
    mutate(
      [id],
      (l) => ({
        paymentStatus: status,
        amountPaid: status === "Paid" ? packageValue(l) || l.amountPaid : status === "Not sent" || status === "Link sent" ? 0 : l.amountPaid,
        ...(autoConfirm ? { bookingStatus: "Confirmed" } : {}),
      }),
      autoConfirm ? `Marked as paid · booking confirmed` : `Payment status set to ${status}`
    );
  };

  const NAME_W = 210;
  const CHECK_W = 44;
  const ID_W = 112;
  const tableWidth = CHECK_W + ID_W + NAME_W + visibleCols.reduce((s, c) => s + c.width, 0) + 72;
  const frozenShadow = scrolledX ? "shadow-[6px_0_8px_-6px_rgba(0,0,0,0.10)]" : "";
  const rowBg = (isSel, active) =>
    isSel ? "bg-brand-tint" : active ? "bg-surface-sidebar" : "bg-white group-hover:bg-surface-subtle";
  const th = "sticky top-0 z-10 bg-white h-9 border-b border-line text-left text-small leading-4 font-medium text-ink-4 whitespace-nowrap";
  const GRID = "border-r border-line";

  const recordLead = recordId ? leads.find((l) => l.id === recordId) : null;
  const stageModal = pendingStage && (
    <StageExtraModal
      pending={pendingStage}
      count={pendingStage.ids.length}
      onCancel={() => setPendingStage(null)}
      onConfirm={(extra) => {
        commitStage(pendingStage.ids, pendingStage.stage, extra);
        setPendingStage(null);
      }}
    />
  );
  if (recordLead)
    return (
      <>
        <LeadRecord
          key={recordLead.id}
          nav={(() => {
            const list = groups.flatMap((g) => g.rows);
            const i = list.findIndex((l) => l.id === recordLead.id);
            if (i < 0) return null;
            return { index: i, total: list.length, prev: i > 0 ? () => setRecordId(list[i - 1].id) : null, next: i < list.length - 1 ? () => setRecordId(list[i + 1].id) : null };
          })()}
          lead={recordLead}
          leads={leads}
          now={now}
          tabLabel={LEAD_TABS.find((t) => t.id === tab)?.label || "All"}
          timeline={timelines[recordLead.id] || buildTimeline(recordLead)}
          onBack={(toTab) => {
            if (toTab) setTab(toTab);
            setRecordId(null);
          }}
          onUpdate={updateLead}
          onEvent={logEvent}
          showToast={showToast}
          dismissToast={dismissToast}
          onRequestStage={(id, stage) => setPendingStage({ ids: [id], stage })}
          onSell={(expert) => onSell?.(recordLead.id, expert)}
          crumbRoot={recordLead.stage === "Won" ? "Paid customers" : "Leads"}
          consults={consults}
          followups={followups}
          setFollowups={setFollowups}
          onDelete={(id) => {
            const snapshot = leads;
            const l = leads.find((x) => x.id === id);
            setRecordId(null);
            setLeads((prev) => prev.filter((x) => x.id !== id));
            showToast(`Deleted ${l?.name || "lead"}`, () => { setLeads(snapshot); dismissToast(); });
          }}
          view={recordView}
          setView={setRecordView}
        />
        {stageModal}
      </>
    );

  return (
    <div className="flex flex-col h-[calc(100dvh-48px)] md:h-[100dvh]">
      {/* Header */}
      <div className="px-5 md:px-8 pt-8 md:pt-10">
        <div className="cw-fade-in flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-h1 font-medium tracking-[-0.01em] flex items-baseline gap-2">
            Leads <span className="text-title-sm font-normal text-ink-4 tabular-nums">{openLeadsTotal(leads)}</span>
          </h1>
          <div className="flex items-center gap-1.5 flex-wrap">
            <PrimaryButton onClick={() => setNewOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New lead
            </PrimaryButton>
            <SecondaryButton onClick={(e) => openMenu("waAll", e)} className="flex items-center gap-1.5">
              <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp all
            </SecondaryButton>
            <span className="mx-1 h-5 w-px bg-surface-active" />
            {view === "table" && (
              <HeaderIconButton title="Hide columns" active={menu?.type === "columns"} onClick={(e) => openMenu("columns", e)}>
                <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                {hiddenCount > 0 && <span aria-hidden="true">{hiddenCount} hidden</span>}
              </HeaderIconButton>
            )}
            <HeaderIconButton title="Filter" active={menu?.type === "filter" || menu?.type === "filterValues" || Object.keys(filters).length > 0} onClick={(e) => openMenu("filter", e)}>
              <ListFilter className="h-4 w-4" strokeWidth={1.75} />
              {Object.keys(filters).length > 0 && <span>{Object.keys(filters).length}</span>}
            </HeaderIconButton>
            <HeaderIconButton title="Sort" active={menu?.type === "sort"} onClick={(e) => openMenu("sort", e)}>
              <ArrowUpDown className="h-4 w-4" strokeWidth={1.75} />
            </HeaderIconButton>
            {searchOpen || query ? (
              <label className="h-8 w-56 inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2 text-body">
                <Search className="h-3.5 w-3.5 text-ink-4" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onBlur={() => !query && setSearchOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setQuery("");
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search name or phone"
                  className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-ink-placeholder"
                />
                {query && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    className="text-ink-4 hover:text-ink"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </label>
            ) : (
              <HeaderIconButton title="Search" onClick={() => setSearchOpen(true)}>
                <Search className="h-4 w-4" strokeWidth={1.75} />
              </HeaderIconButton>
            )}
          </div>
        </div>

        {/* View tabs */}
        <div className="cw-fade-in mt-6 flex items-center gap-5 border-b border-line overflow-x-auto" style={{ animationDelay: "70ms" }}>
          {LEAD_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSelected(new Set());
              }}
              className={`relative h-9 flex items-center gap-1.5 text-body whitespace-nowrap transition-colors duration-150 ${
                tab === t.id ? "text-ink font-medium" : "text-ink-4 hover:text-ink"
              }`}
            >
              {t.label}
              <span className="text-caption text-ink-4 font-normal tabular-nums">{tabCounts[t.id]}</span>
              {tab === t.id && <span className="absolute -bottom-px left-0 right-0 h-[1.5px] bg-ink rounded-full" />}
            </button>
          ))}
          {onNewView && <button
            onClick={() => onNewView?.()}
            title="Save as view"
            className="h-9 w-6 flex items-center justify-center text-ink-4 hover:text-ink"
            aria-label="New view"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>}
        </div>

        {/* Active filters, sort, grouping, view toggle */}
        <div className="cw-fade-in py-3 min-h-[52px] flex items-center gap-1.5 flex-wrap" style={{ animationDelay: "140ms" }}>
          {activeView && (
            <span title={activeView.desc} className="h-7 inline-flex items-center rounded-md border border-brand-line bg-brand-tint text-small text-brand-strong">
              <span className="pl-2 pr-1.5 flex items-center gap-1.5 max-w-[340px]">
                {activeView.icon && <activeView.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />}
                <span className="font-medium">{activeView.label}</span>
                {activeView.note && <span className="text-brand/75 truncate">· {activeView.note}</span>}
              </span>
              <button onClick={clearView} className="h-full px-1.5 text-brand/70 hover:text-brand-strong border-l border-brand-line" aria-label={`Remove ${activeView.label} view`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {Object.entries(filters).map(([f, vals]) => (
            <span key={f} className="h-7 inline-flex items-center rounded-md border border-line-strong bg-surface-hover text-small">
              <button onClick={(e) => openMenu("filterValues", e, { field: f })} className="pl-2 pr-1 h-full flex items-center gap-1 max-w-[260px]">
                <span className="text-ink-4">{FIELD[f].label}</span>
                <span className="text-ink-4">{vals.length > 1 ? "is any of" : "is"}</span>
                <span className="text-ink truncate">{vals.join(", ")}</span>
              </button>
              <button
                onClick={() => setFilters((x) => { const n = { ...x }; delete n[f]; return n; })}
                className="h-full px-1.5 text-ink-4 hover:text-ink border-l border-line-control"
                aria-label={`Remove ${FIELD[f].label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Chip onClick={(e) => openMenu("sort", e)} active={menu?.type === "sort"}>
            <span className="text-ink-4">Sort</span> {sortField.label} {sort.dir === "asc" ? "↑" : "↓"}
          </Chip>
          <Chip onClick={(e) => openMenu("group", e)} active={menu?.type === "group" || groupBy !== "none"}>
            <Layers className="h-3.5 w-3.5" />
            {groupBy === "none" ? "Group by" : <>Group by <span className="text-ink">{GROUP_OPTIONS.find((g) => g.id === groupBy).label}</span></>}
          </Chip>

          <div className="ml-auto h-7 flex items-center rounded-md border border-line-control p-0.5">
            {[
              ["table", Table2, "Table view"],
              ["board", SquareKanban, "Board view"],
            ].map(([v, Icon, label]) => (
              <button
                key={v}
                title={label}
                aria-label={label}
                onClick={() => setView(v)}
                className={`h-[22px] w-7 rounded flex items-center justify-center transition-colors duration-150 ${view === v ? "bg-surface-active text-ink" : "text-ink-4 hover:text-ink"}`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {view === "board" ? (
          <LeadBoard rows={rows} now={now} onOpen={setPanelId} onMove={requestStage} panelId={panelId} />
        ) : (
          <>
          {/* Phones: a card list instead of a squeezed table */}
          <div className="md:hidden h-full overflow-y-auto px-4 pb-28">
            {rows.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-body font-medium">{leads.some((l) => l.stage !== "Won") ? "No leads match" : "No leads yet"}</div>
                <div className="text-small leading-4 text-ink-4 mt-1">{leads.some((l) => l.stage !== "Won") ? "Try another view or remove a filter." : "New enquiries will appear here."}</div>
              </div>
            ) : (
              <ul className="divide-y divide-line-subtle" aria-label="Leads">
                {rows.slice(0, rowLimit).map((l) => {
                  const p = leadPriority(l);
                  return (
                    <li key={l.id}>
                      <button onClick={() => openRecord(l.id)} className="w-full min-h-[60px] py-3 flex items-start gap-3 text-left">
                        <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[p]}`} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-3">
                            <span className="font-medium text-ink truncate">{l.name}</span>
                            <span className="sr-only">, {p} priority,</span>
                            <span className="ml-auto shrink-0 text-small"><StageLabel lead={l} /></span>
                          </span>
                          <span className="mt-1 flex items-center gap-1.5 text-small text-ink-4 min-w-0">
                            <span className="whitespace-nowrap">{l.careKind === "B" ? `Born · ${babyAge(l, now) || "—"}` : (careStage(l, now).split(" · ")[1] || "—")}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">Next: <FollowUp lead={l} now={now} /></span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {rows.length > rowLimit && (
              <button onClick={() => setRowLimit((n) => n + ROW_PAGE)} className={`mt-3 w-full ${btn("secondary", "md")}`}>Show {Math.min(ROW_PAGE, rows.length - rowLimit)} more</button>
            )}
          </div>
          <div className="hidden md:block h-full overflow-auto" onScroll={(e) => setScrolledX(e.currentTarget.scrollLeft > 0)}>
            <div className="inline-block min-w-full align-top pl-5 md:pl-8 pr-5 md:pr-8 pb-28">
              <table className="border-separate border-spacing-0 text-body table-fixed" style={{ width: tableWidth, minWidth: "100%" }}>
                <colgroup>
                  <col style={{ width: CHECK_W }} />
                  <col style={{ width: NAME_W }} />
                  <col style={{ width: ID_W }} />
                  {visibleCols.map((c) => (
                    <col key={c.id} style={{ width: c.width }} />
                  ))}
                  <col style={{ width: 72 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={`${th} left-0 z-30 pl-3 border-t`}>
                      <Checkbox checked={allVisibleSelected} indeterminate={!allVisibleSelected && someVisibleSelected} onChange={toggleAll} label="Select all" />
                    </th>
                    <th className={`${th} z-30 border-t ${GRID} px-2`} style={{ left: CHECK_W }}>
                      <ColumnHeading icon={UserRound} label="Name" />
                    </th>
                    <th className={`${th} z-30 border-t ${GRID} ${frozenShadow} px-2`} style={{ left: CHECK_W + NAME_W }}>
                      <ColumnHeading icon={IdCard} label="Customer ID" />
                    </th>
                    {visibleCols.map((c) => (
                      <th key={c.id} className={`${th} border-t ${GRID} px-3`}>
                        <ColumnHeading icon={c.icon} label={c.label} ai={c.ai} align={c.align} />
                      </th>
                    ))}
                    <th className={`${th} border-t`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody key={rowsAnimKey}>
                  {groups.map((g) => (
                    <React.Fragment key={g.key ?? "all"}>
                      {g.key != null && (
                        <tr>
                          <td colSpan={visibleCols.length + 4} className="h-9 pt-3 border-b border-line bg-white">
                            <span className="sticky left-3 inline-flex items-center gap-1.5 pl-3 text-small leading-4 font-medium text-ink-3">
                              {(groupBy === "stage" || groupBy === "paymentStatus") && <span className={`h-1.5 w-1.5 rounded-full ${(groupBy === "stage" ? STAGE_DOT : PAYMENT_DOT)[g.key]}`} />}
                              {g.key}
                              <span className="text-ink-4 tabular-nums">{g.rows.length}</span>
                            </span>
                          </td>
                        </tr>
                      )}
                      {g.rows.filter((l) => (rowOrder.get(l.id) ?? 0) < rowLimit).map((l) => {
                        const rowIndex = rowOrder.get(l.id) ?? 0;
                        const isSel = selected.has(l.id);
                        const bg = rowBg(isSel, panelId === l.id);
                        const cell = `h-10 border-b border-line transition-colors duration-150 ${bg}`;
                        return (
                          <tr key={l.id} onClick={() => setPanelId(l.id)} className="group cursor-default cw-row-in" style={{ animationDelay: `${80 + Math.min(rowIndex, 6) * 40}ms` }}>
                            <td className={`${cell} sticky left-0 z-[2] pl-3`}>
                              <Checkbox checked={isSel} onChange={() => toggleRow(l.id)} label={`Select ${l.name}`} />
                            </td>
                            <td className={`${cell} sticky z-[2] px-2 ${GRID}`} style={{ left: CHECK_W }}>
                              <span className="flex items-center gap-2 min-w-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRecord(l.id);
                                  }}
                                  className="font-medium truncate hover:underline underline-offset-2 decoration-line-heavy"
                                >
                                  {l.name}
                                </button>
                              </span>
                            </td>
                            <td className={`${cell} sticky z-[2] px-2 ${GRID} ${frozenShadow}`} style={{ left: CHECK_W + NAME_W }}>
                              <button onClick={(e) => { e.stopPropagation(); openRecord(l.id); }} className="text-ink-3 tabular-nums whitespace-nowrap hover:text-ink hover:underline underline-offset-2 decoration-line-heavy">{l.customerId}</button>
                            </td>
                            {visibleCols.map((c) => (
                              <td key={c.id} className={`${cell} px-3 ${GRID} overflow-hidden`}>
                                {renderCell(c.id, l)}
                              </td>
                            ))}
                            <td className={`${cell} pr-2`}>
                              <span className="flex justify-end gap-0.5 opacity-0 [@media(hover:none)]:opacity-100 group-hover:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
                                <GhostIcon title="WhatsApp" onClick={() => openWhatsApp(l.phone)}>
                                  <WhatsAppIcon className="h-[15px] w-[15px]" />
                                </GhostIcon>
                                <GhostIcon title="Call" onClick={() => openCall(l.phone)}>
                                  <Phone className="h-[14px] w-[14px]" strokeWidth={1.75} />
                                </GhostIcon>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {/* folk-style "Add lead" row */}
                  <tr className="group cursor-pointer" tabIndex={0} aria-label="Add lead" onClick={() => setNewOpen(true)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setNewOpen(true); } }}>
                    <td colSpan={visibleCols.length + 4} className="h-10 border-b border-line bg-white transition-colors duration-150 group-hover:bg-surface-subtle">
                      <span className="sticky left-0 inline-flex items-center gap-2 pl-3 text-body text-ink-4 transition-colors duration-150 group-hover:text-ink">
                        <Plus className="h-3.5 w-3.5" /> Add lead
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              {rows.length === 0 ? (
                <div className="sticky left-0 w-[min(100%,calc(100vw-320px))] py-16 text-center">
                  {leads.some((l) => l.stage !== "Won") ? (
                    <>
                      <div className="text-body font-medium">No leads match</div>
                      <div className="text-small leading-4 text-ink-4 mt-1">Try another view or remove a filter.</div>
                    </>
                  ) : (
                    <>
                      <div className="text-body font-medium">No leads yet</div>
                      <div className="text-small leading-4 text-ink-4 mt-1">New enquiries from WhatsApp, Meta ads and the website will appear here.</div>
                      <button onClick={() => setNewOpen(true)} className={`mt-3 ${btn("primary", "sm")}`}><Plus className="h-3.5 w-3.5" /> New lead</button>
                    </>
                  )}
                </div>
              ) : (
                <div key={rowsAnimKey} className="cw-fade-in sticky left-0 pt-3 pl-3 text-small leading-4 text-ink-4 tabular-nums" style={{ animationDelay: `${120 + Math.min(rows.length, 6) * 40}ms` }}>
                  {rows.length > rowLimit && (
                    <button onClick={() => setRowLimit((n) => n + ROW_PAGE)} className={`mb-3 ${btn("secondary", "sm")}`}>
                      Show {Math.min(ROW_PAGE, rows.length - rowLimit)} more · {rows.length - rowLimit} hidden
                    </button>
                  )}
                  <div>{rows.length} of {openLeadsTotal(leads)} leads · {leads.filter((l) => l.stage !== "Won").length} loaded in this prototype</div>
                </div>
              )}
            </div>
          </div>
          </>
        )}
      </div>

      {/* Selection bar — slides up with a springy settle; count rolls as rows are ticked */}
      <div
        inert={!selectedIds.length}
        className={`fixed bottom-6 left-1/2 md:left-[calc(50%+130px)] z-40 transition-[transform,opacity] ${selectedIds.length ? "duration-[250ms] opacity-100" : "duration-150 opacity-0 pointer-events-none"}`}
        style={{
          transform: `translateX(-50%) translateY(${selectedIds.length ? 0 : 8}px) scale(${selectedIds.length ? 1 : 0.96})`,
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        aria-hidden={!selectedIds.length}
      >
        <div className="flex items-center gap-0.5 rounded-xl bg-ink p-1 text-body text-white shadow-float">
          <span className="h-8 rounded-lg bg-white/[0.08] px-2.5 inline-flex items-center gap-1 whitespace-nowrap">
            <RollingNumber value={selectedIds.length || barCount} /> Selected
          </span>
          <span className="h-4 w-px bg-white/15 mx-1.5" />
          {[
            ["bulkPriority", "Set priority", Flag],
            ["bulkStage", "Change stage", CircleDot],
          ].map(([type, label, Icon]) => (
            <button
              key={type}
              onClick={(e) => openMenu(type, e)}
              className={`h-8 rounded-lg px-2.5 inline-flex items-center gap-1.5 whitespace-nowrap text-white/85 transition-colors duration-150 hover:bg-white/10 hover:text-white ${menu?.type === type ? "bg-white/10 text-white" : ""}`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} /> {label}
            </button>
          ))}
          <span className="h-4 w-px bg-white/15 mx-1.5" />
          {[
            ["bulkTemplate", "Send WhatsApp template", (p) => <WhatsAppIcon {...p} />],
            ["bulkSnooze", "Snooze follow-ups", (p) => <AlarmClock {...p} strokeWidth={1.75} />],
          ].map(([type, label, render]) => (
            <button
              key={type}
              title={label}
              aria-label={label}
              onClick={(e) => openMenu(type, e)}
              className={`h-8 w-8 rounded-lg inline-flex items-center justify-center text-white/75 transition-colors duration-150 hover:bg-white/10 hover:text-white ${menu?.type === type ? "bg-white/10 text-white" : ""}`}
            >
              {render({ className: "h-[15px] w-[15px]" })}
            </button>
          ))}
          <span className="h-4 w-px bg-white/15 mx-1.5" />
          <button onClick={() => setSelected(new Set())} title="Clear selection (Esc)" aria-label="Clear selection" className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-white/60 transition-colors duration-150 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Menus */}
      {menu && (
        <FixedMenu
          anchor={menu.anchor}
          onClose={closeMenu}
          width={["filterValues", "filter", "bulkTemplate", "waAll"].includes(menu.type) ? 260 : 220}
          align={["columns", "filter", "sort", "waAll"].includes(menu.type) ? "right" : "left"}
        >
          {menu.type === "filter" && (
            <>
              <MenuHeading>Filter by</MenuHeading>
              {FILTER_FIELDS.map((f) => (
                <MenuItem key={f.id} onClick={() => setMenu((m) => ({ ...m, type: "filterValues", field: f.id }))}>
                  <span className="flex-1">{f.label}</span>
                  {filters[f.id] && <span className="text-caption text-ink-4 tabular-nums">{filters[f.id].length}</span>}
                  <ChevronRight className="h-3.5 w-3.5 text-ink-4" />
                </MenuItem>
              ))}
            </>
          )}
          {menu.type === "filterValues" && (
            <>
              <button onClick={() => setMenu((m) => ({ ...m, type: "filter" }))} className="w-full flex items-center gap-1 px-2 pt-1 pb-1.5 text-caption text-ink-4 hover:text-ink">
                <ChevronRight className="h-3 w-3 rotate-180" /> {FIELD[menu.field].label}
              </button>
              {FIELD[menu.field].values.map((v) => {
                const on = (filters[menu.field] || []).includes(v);
                return (
                  <MenuItem key={v} onClick={() => toggleFilterValue(menu.field, v)}>
                    <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${on ? "bg-ink border-ink" : "border-line-strong"}`}>
                      {on && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </span>
                    {menu.field === "stage" && <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[v]}`} />}
                    <span className="flex-1">{v}</span>
                    <span className="text-caption text-ink-4 tabular-nums">{leads.filter((l) => fieldMatches(l, menu.field, v)).length}</span>
                  </MenuItem>
                );
              })}
            </>
          )}
          {menu.type === "sort" && (
            <>
              <MenuHeading>Sort by</MenuHeading>
              {SORT_FIELDS.map((s) => (
                <MenuItem key={s.id} onClick={() => setSort({ field: s.id, dir: s.dir })}>
                  <span className="flex-1">{s.label}</span>
                  {sort.field === s.id && <Check className="h-3.5 w-3.5 text-ink-3" />}
                </MenuItem>
              ))}
              <MenuSep />
              <div className="flex gap-1 p-1">
                {[
                  ["asc", "Ascending", ArrowUp],
                  ["desc", "Descending", ArrowDown],
                ].map(([d, label, Icon]) => (
                  <button
                    key={d}
                    onClick={() => setSort((s) => ({ ...s, dir: d }))}
                    className={`flex-1 h-7 rounded-md text-small flex items-center justify-center gap-1 transition-colors duration-150 ${sort.dir === d ? "bg-surface-active text-ink" : "text-ink-4 hover:text-ink"}`}
                  >
                    <Icon className="h-3 w-3" /> {label}
                  </button>
                ))}
              </div>
            </>
          )}
          {menu.type === "group" && (
            <>
              <MenuHeading>Group by</MenuHeading>
              {GROUP_OPTIONS.map((g) => (
                <MenuItem
                  key={g.id}
                  onClick={() => {
                    setGroupBy(g.id);
                    closeMenu();
                  }}
                >
                  <span className="flex-1">{g.label}</span>
                  {groupBy === g.id && <Check className="h-3.5 w-3.5 text-ink-3" />}
                </MenuItem>
              ))}
            </>
          )}
          {menu.type === "columns" && (
            <>
              <MenuHeading>Show columns</MenuHeading>
              {availableCols.map((c) => {
                const on = cols.includes(c.id);
                return (
                  <MenuItem key={c.id} onClick={() => setCols((cs) => (on ? cs.filter((x) => x !== c.id) : [...cs, c.id]))}>
                    <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${on ? "bg-ink border-ink" : "border-line-strong"}`}>
                      {on && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="flex-1">{c.label}</span>
                  </MenuItem>
                );
              })}
              <MenuSep />
              <MenuItem onClick={() => setCols(DEFAULT_COLS[colKey])}>
                <span className="text-ink-4">Reset to default</span>
              </MenuItem>
            </>
          )}
          {(menu.type === "stage" || menu.type === "bulkStage") && (
            <>
              <MenuHeading>{menu.type === "bulkStage" ? `Move ${selectedIds.length} leads to` : "Stage"}</MenuHeading>
              {STAGES.map((s) => {
                const current = menu.leadId && leads.find((l) => l.id === menu.leadId)?.stage === s.id;
                return (
                  <MenuItem
                    key={s.id}
                    onClick={() => {
                      closeMenu();
                      if (!current) requestStage(menu.leadId ? [menu.leadId] : selectedIds, s.id);
                    }}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    <span className="flex-1">{s.id}</span>
                    {current && <Check className="h-3.5 w-3.5 text-ink-3" />}
                    {(s.id === "Lost" || s.id === "Deferred") && !current && <span className="text-caption text-ink-4">{s.id === "Lost" ? "reason" : "date"}</span>}
                  </MenuItem>
                );
              })}
            </>
          )}
          {menu.type === "payment" && (
            <>
              <MenuHeading>Payment status</MenuHeading>
              {PAYMENT_STATUSES.map((p) => {
                const current = leads.find((l) => l.id === menu.leadId)?.paymentStatus === p;
                return (
                  <MenuItem
                    key={p}
                    onClick={() => {
                      closeMenu();
                      if (!current) setPayment(menu.leadId, p);
                    }}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${PAYMENT_DOT[p]}`} />
                    <span className="flex-1">{p}</span>
                    {current ? <Check className="h-3.5 w-3.5 text-ink-3" /> : p === "Paid" && <span className="text-caption text-ink-4">confirms booking</span>}
                  </MenuItem>
                );
              })}
            </>
          )}
          {menu.type === "booking" && (
            <>
              <MenuHeading>Booking status</MenuHeading>
              {BOOKING_STATUSES.map((s) => {
                const current = leads.find((l) => l.id === menu.leadId)?.bookingStatus === s;
                return (
                  <MenuItem
                    key={s}
                    onClick={() => {
                      closeMenu();
                      if (!current) mutate([menu.leadId], () => ({ bookingStatus: s }), `Booking set to ${s}`);
                    }}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${BOOKING_DOT[s]}`} />
                    <span className="flex-1">{s}</span>
                    {current && <Check className="h-3.5 w-3.5 text-ink-3" />}
                  </MenuItem>
                );
              })}
            </>
          )}
          {menu.type === "package" && (
            <>
              <MenuHeading>Package</MenuHeading>
              {[...PACKAGE_OPTIONS, null].map((p) => {
                const current = leads.find((l) => l.id === menu.leadId)?.package === p;
                return (
                  <MenuItem
                    key={p || "none"}
                    onClick={() => {
                      closeMenu();
                      if (!current) mutate([menu.leadId], () => ({ package: p }), p ? `Package set to ${p}` : "Package cleared");
                    }}
                  >
                    <span className={`flex-1 ${p ? "" : "text-ink-4"}`}>{p || "No package"}</span>
                    {current && <Check className="h-3.5 w-3.5 text-ink-3" />}
                  </MenuItem>
                );
              })}
            </>
          )}
          {(menu.type === "next" || menu.type === "bulkSnooze") && (
            <FollowUpPicker
              onPick={(d) => {
                closeMenu();
                setFollowUp(menu.type === "next" ? [menu.leadId] : selectedIds, d);
              }}
            />
          )}
          {menu.type === "bulkPriority" && (
            <>
              <MenuHeading>Set priority for {selectedIds.length} leads</MenuHeading>
              {PRIORITIES.map((p) => (
                <MenuItem key={p} onClick={() => { closeMenu(); mutate(selectedIds, () => ({ priority: p }), `Set ${nameOrCount(selectedIds)} to ${p} priority`); }}>
                  <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[p]}`} />
                  <span className="flex-1">{p}</span>
                </MenuItem>
              ))}
            </>
          )}
          {menu.type === "waAll" && (
            <>
              <MenuHeading>Send a template to {targetLabel}</MenuHeading>
              {WA_TEMPLATES.map((t) => (
                <MenuItem
                  key={t}
                  onClick={() => {
                    closeMenu();
                    showToast(`Sent “${t}” to ${nameOrCount(targetIds)}`);
                  }}
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 text-ink-4" />
                  {t}
                </MenuItem>
              ))}
            </>
          )}
          {menu.type === "bulkTemplate" && (
            <>
              <MenuHeading>WhatsApp template</MenuHeading>
              {WA_TEMPLATES.map((t) => (
                <MenuItem
                  key={t}
                  onClick={() => {
                    closeMenu();
                    showToast(`Sent “${t}” to ${nameOrCount(selectedIds)}`);
                  }}
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 text-ink-4" />
                  {t}
                </MenuItem>
              ))}
            </>
          )}
        </FixedMenu>
      )}

      <LeadPanel
        lead={panelLead}
        now={now}
        onClose={() => setPanelId(null)}
        onSnooze={(l, d) => setFollowUp([l.id], d)}
        onOpenRecord={openRecord}
        onToast={showToast}
      />

      {pendingStage && (
        <StageExtraModal
          pending={pendingStage}
          count={pendingStage.ids.length}
          onCancel={() => setPendingStage(null)}
          onConfirm={(extra) => {
            commitStage(pendingStage.ids, pendingStage.stage, extra);
            setPendingStage(null);
          }}
        />
      )}

      {newOpen && (
        <NewLeadModal
          leads={leads}
          onClose={() => setNewOpen(false)}
          onCreate={createLead}
          onOpenExisting={(l) => {
            setNewOpen(false);
            setPanelId(l.id);
          }}
        />
      )}
    </div>
  );
}

/* ==========================================================================
   INBOX — mock conversations (linked to leads by name)
   ========================================================================== */

// Tags are labels, not alarms: neutral, except a complaint which needs attention
const CHAT_TAG_STYLES = {
  Price: "bg-surface-hover text-ink-3",
  Payment: "bg-surface-hover text-ink-3",
  Complaint: "bg-red-50 text-red-700",
  Callback: "bg-surface-hover text-ink-3",
};


const chatName = (c, leads) => (c.leadId ? leads.find((l) => l.id === c.leadId)?.name : c.contact?.name) || "Unknown";
const lastMessage = (c) => [...c.messages].reverse().find((m) => m.from !== "event");


const waitTone = (ms) => {
  const m = ms / 60000;
  if (m < 3) return "text-emerald-700";
  if (m <= 5) return "text-amber-600";
  if (m <= 60) return "text-red-700";
  return "text-ink-4";
};
const shortAgo = (ms) => {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d}d`;
};

/* ---------- Message pieces ---------- */

function Ticks({ state }) {
  if (!state) return null;
  if (state === "sent") return <Check className="inline h-3 w-3 text-ink-4" />;
  return <CheckCheck className={`inline h-3 w-3 ${state === "read" ? "text-sky-500" : "text-ink-4"}`} />;
}

function MessageBody({ m }) {
  if (m.kind === "pdf" || m.kind === "file")
    return (
      <div className="flex items-center gap-2.5 rounded-lg bg-white/80 border border-black/[0.06] px-2.5 py-2 min-w-[220px]">
        <span className="h-8 w-8 rounded-md bg-red-50 text-red-700 flex items-center justify-center text-micro font-semibold">{m.kind === "pdf" ? "PDF" : "FILE"}</span>
        <span className="min-w-0">
          <span className="block truncate text-body text-ink">{m.text}</span>
          <span className="text-caption text-ink-4 tabular-nums">{m.size}</span>
        </span>
      </div>
    );
  if (m.kind === "payment")
    return (
      <div className="rounded-lg bg-white/80 border border-black/[0.06] px-3 py-2.5 min-w-[230px]">
        <div className="flex items-center gap-1.5 text-caption text-ink-4"><IndianRupee className="h-3 w-3" /> Payment link</div>
        <div className="mt-0.5 text-title-sm font-medium tabular-nums text-ink">{fmtINR(m.amount)}</div>
        <div className="text-small text-ink-3">{m.text}</div>
        <div className="mt-2 flex items-center justify-between text-caption">
          <span className="text-ink underline underline-offset-2">pay.cradlewell.com</span>
          <DotLabel dot={PAYMENT_DOT[m.status] || "bg-stone-300"}><span className="text-ink-3">{m.status === "Link sent" ? "Not opened" : m.status}</span></DotLabel>
        </div>
      </div>
    );
  if (m.kind === "image")
    return (
      <div className="w-[220px] overflow-hidden rounded-lg border border-black/[0.06] bg-white">
        <div className="bg-gradient-to-b from-[#F3F7F4] to-white px-3 pt-3 pb-2.5 text-center">
          <div className="mx-auto h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="h-4 w-4" strokeWidth={3} /></div>
          <div className="mt-1.5 text-caption text-ink-3">Paid to Tenderkin Wellness</div>
          <div className="text-title font-semibold tabular-nums text-ink">{fmtINR(m.amount)}</div>
          <div className="text-micro text-ink-4 tabular-nums">UPI · UTR 4318 2290 7741</div>
        </div>
        <div className="flex items-center gap-1 border-t border-line px-2.5 py-1.5 text-caption text-ink-4"><ImageIcon className="h-3 w-3" /> payment-screenshot.jpg</div>
      </div>
    );
  return <span className="whitespace-pre-line">{m.text}</span>;
}

function ChatThread({ chat, lead, name, now, scrollKey }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [chat.id, scrollKey]);
  let lastDay = null;
  let lastSender = null;
  return (
    <div ref={ref} className="flex-1 min-h-0 overflow-y-auto bg-surface-subtle">
      <div className="mx-auto max-w-[760px] px-5 md:px-8 py-5">
        {chat.messages.map((m) => {
          const day = dayLabel(m.at, now);
          const showDay = day !== lastDay;
          lastDay = day;
          if (m.from === "event") {
            lastSender = null;
            const Icon = { missed: PhoneMissed, call: PhoneCall, stage: ArrowRightLeft, resolved: CircleCheck }[m.icon] || Clock;
            return (
              <React.Fragment key={m.id}>
                {showDay && <DaySep label={day} />}
                <div className="flex justify-center py-1.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption tabular-nums ${m.icon === "missed" ? "border-red-100 bg-red-50/60 text-red-700" : "border-line bg-white text-ink-3"}`}>
                    <Icon className="h-3 w-3" />
                    {m.text}
                    <span className="opacity-60">· {fmtTime(m.at)}</span>
                  </span>
                </div>
              </React.Fragment>
            );
          }
          const mine = m.from !== "lead";
          const sender = m.from === "lead" ? firstName({ name }) : "You";
          const showSender = sender !== lastSender || showDay;
          lastSender = sender;
          const tone = !mine ? "bg-surface-active text-ink rounded-bl-md" : "bg-[#DCF3E3] text-[#173A26] rounded-br-md";
          return (
            <React.Fragment key={m.id}>
              {showDay && <DaySep label={day} />}
              <div className={`flex ${mine ? "justify-end" : "justify-start"} ${showSender ? "mt-3" : "mt-1"}`}>
                <div className="max-w-[76%]">
                  {showSender && mine && (
                    <div className="mb-1 text-right text-caption text-ink-4">{sender}</div>
                  )}
                  <div className={`rounded-2xl px-3.5 py-2 text-body leading-relaxed ${tone}`}>
                    <MessageBody m={m} />
                    <div className="mt-0.5 flex items-center justify-end gap-1 text-micro text-ink-3 tabular-nums">
                      {fmtTime(m.at)}
                      {mine && <Ticks state={m.ticks} />}
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Details pane ---------- */

function InboxDetails({ chat, lead, now, actions, onOpenRecord, onCreateLead }) {
  const [doneAnchor, setDoneAnchor] = useState(null);
  const [force, setForce] = useState(null);
  const closeDone = useCallback(() => setDoneAnchor(null), []);
  if (!lead)
    return (
      <div className="p-5">
        <div className="text-body font-medium">{chat.contact?.name}</div>
        <div className="text-small text-ink-4 tabular-nums">{chat.contact?.phone}</div>
        <div className="mt-5 rounded-lg border border-dashed border-line-control p-4 text-center">
          <div className="text-body">Not a lead yet</div>
          <div className="mt-1 text-small text-ink-4">Add this contact to track the conversation.</div>
          <PrimaryButton onClick={onCreateLead} className="mt-3 inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Create lead</PrimaryButton>
        </div>
      </div>
    );
  const { set } = actions;
  const born = lead.careKind === "B";
  const hasUpcoming = lead.stage !== "Lost" && (lead.nextFollowUp || lead.needsReply);
  const overdue = hasUpcoming && (lead.needsReply || lead.nextFollowUp < now);
  const today = hasUpcoming && !overdue && dayDiff(lead.nextFollowUp, now) === 0;
  return (
    <div className="p-4">
      <div className="text-small font-medium text-ink-4 mb-1">Stage</div>
      <EditSelect value={lead.stage} options={STAGES.map((s) => s.id)} render={(v) => <DotLabel dot={STAGE_DOT[v]}>{v}</DotLabel>} onSave={actions.changeStage} />

      <div className="mt-4 text-small font-medium text-ink-4 mb-1">Key facts</div>
      <div className="space-y-0.5">
        {born ? (
          <DetailRow icon={Baby} label="Baby age" auto>
            <ReadOnly><span className="tabular-nums text-ink">{babyAge(lead, now)}{lead.babies > 1 ? " · twins" : ""}</span></ReadOnly>
          </DetailRow>
        ) : (
          <DetailRow icon={Calendar} label="Due date">
            <EditDate value={lead.dueDate} emptyLabel="Set due date" onSave={(d) => d && set({ dueDate: d })} display={(d) => fmtShortDate(d)} />
          </DetailRow>
        )}
        <DetailRow icon={Building2} label="Hospital">
          <EditSelect value={lead.hospital} options={HOSPITALS} searchable emptyLabel="Set hospital" onSave={(v) => set({ hospital: v })} />
        </DetailRow>
        <DetailRow icon={MapPin} label="Zone">
          <EditSelect value={lead.zone} options={ZONES} searchable emptyLabel="Set zone" onSave={(v) => set({ zone: v })} />
        </DetailRow>
        <DetailRow icon={Package} label="Package">
          <EditSelect value={lead.package} options={PACKAGE_OPTIONS} width={180} emptyLabel="Set interest" onSave={(v) => set({ package: v })} />
        </DetailRow>
        <DetailRow icon={Megaphone} label="Source">
          <EditSelect value={lead.source} options={SOURCES} render={(v) => <span className="inline-flex items-center gap-1.5"><span className="text-ink-4"><SourceIcon source={v} /></span>{v}</span>} onSave={(v) => set({ source: v })} />
        </DetailRow>
        <DetailRow icon={Flag} label="Priority">
          <EditSelect value={leadPriority(lead)} options={PRIORITIES} width={160} render={(v) => <DotLabel dot={PRIORITY_DOT[v]}>{v}</DotLabel>} onSave={(v) => set({ priority: v })} />
        </DetailRow>
      </div>

      <div className="mt-4 text-small font-medium text-ink-4 mb-1.5">Next step</div>
      {hasUpcoming ? (
        <div className={`rounded-xl border px-3 py-2.5 ${overdue ? "border-red-200 bg-red-50/50" : today ? "border-amber-200 bg-amber-50/50" : "border-line"}`}>
          <div className="text-body leading-snug">{lead.needsReply ? "Reply on WhatsApp" : lead.nextAction || NEXT_ACTION_BY_STAGE[lead.stage]}</div>
          <div className="mt-0.5 flex items-center justify-between">
            <FollowUp lead={lead} now={now} />
            <button onClick={(e) => setDoneAnchor(e.currentTarget)} className="h-6 rounded-md border border-line-control bg-white px-2 text-small inline-flex items-center gap-1 hover:bg-surface-subtle"><Check className="h-3 w-3" /> Done</button>
          </div>
        </div>
      ) : (
        <div className="text-body text-ink-4">Nothing scheduled</div>
      )}

      <button onClick={() => onOpenRecord(lead.id)} className="mt-5 inline-flex items-center gap-1 text-body text-ink hover:underline underline-offset-2 decoration-line-heavy">
        Open full record <ArrowRight className="h-3.5 w-3.5" />
      </button>

      {doneAnchor && <DoneOutcomeMenu anchor={doneAnchor} onClose={closeDone} onPick={(o) => { if (actions.done(o)) setForce(o); }} />}
      {force && (
        <NextFollowUpModal
          lead={lead}
          outcome={force}
          onSave={(when, action) => {
            set({ nextFollowUp: when, nextAction: action, needsReply: false }, { id: uid(), type: "followup", by: ME, at: new Date(), when, action });
            setForce(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Page ---------- */

// A chat needs a reply when the lead spoke last or called and we missed it
const lastTalk = (c) => { for (let i = c.messages.length - 1; i >= 0; i--) if (c.messages[i].from !== "event") return c.messages[i]; return null; };
const needsHumanReply = (c) => c.status !== "resolved" && (!!c.missedCallAt || lastTalk(c)?.from === "lead");

const INBOX_FILTERS = [
  { id: "unread", label: "Unread", fn: (c) => c.status !== "resolved" && c.unread },
  { id: "needs", label: "Needs reply", fn: needsHumanReply },
  { id: "all", label: "All", fn: (c) => c.status !== "resolved" },
  { id: "resolved", label: "Resolved", fn: (c) => c.status === "resolved" },
];

function InboxPage({ chats, setChats, leads, setLeads, now, showToast, dismissToast, onOpenRecord, setTimelines, timelines, resetKey }) {
  const [filter, setFilter] = useState("needs");
  // Clicking Inbox in the sidebar always lands on Needs reply
  useEffect(() => {
    if (!resetKey) return;
    setFilter("needs");
    setSelectedId((id) => (chats.some((c) => c.id === id && needsHumanReply(c)) ? id : chats.find(needsHumanReply)?.id));
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(() => chats.find(needsHumanReply)?.id);
  const [prefill, setPrefill] = useState(null);
  const [pendingStage, setPendingStage] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const counts = Object.fromEntries(INBOX_FILTERS.map((f) => [f.id, chats.filter(f.fn).length]));
  const q = query.trim().toLowerCase();
  const qd = q.replace(/\D/g, "");
  const leadOf = (c) => (c.leadId ? leads.find((l) => l.id === c.leadId) : null);
  const list = chats
    .filter(INBOX_FILTERS.find((f) => f.id === filter).fn)
    .filter((c) => {
      if (!q) return true;
      const l = leadOf(c);
      const name = chatName(c, leads).toLowerCase();
      const phone = (l?.phone || c.contact?.phone || "").replace(/\D/g, "");
      return name.includes(q) || (qd.length >= 3 && phone.includes(qd));
    })
    .sort((a, b) => {
      if (filter === "needs" || filter === "unread") return (a.waitingSince || Infinity) - (b.waitingSince || Infinity) || (lastMessage(b)?.at || 0) - (lastMessage(a)?.at || 0);
      return (lastMessage(b)?.at || 0) - (lastMessage(a)?.at || 0);
    });

  const chat = chats.find((c) => c.id === selectedId) || null;
  const lead = chat ? leadOf(chat) : null;
  const name = chat ? chatName(chat, leads) : "";
  const timeline = lead ? timelines[lead.id] || buildTimeline(lead) : [];

  const updateLead = (id, patch) => setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const logEvent = (id, ev, transform) =>
    setTimelines((t) => {
      const l = leads.find((x) => x.id === id);
      const cur = t[id] || (l ? buildTimeline(l) : []);
      return { ...t, [id]: transform ? transform(cur) : [ev, ...cur] };
    });
  const actions = useRecordActions({ lead: lead || { id: null, name: "", stage: "New" }, timeline, onUpdate: updateLead, onEvent: logEvent, showToast, dismissToast, onRequestStage: (id, stage) => setPendingStage({ ids: [id], stage }) });

  const inboxActions = {
    ...actions,
    changeStage: (to) => {
      if (lead && to !== lead.stage && to !== "Lost" && to !== "Deferred")
        setChats((cs) => cs.map((c) => (c.id === chat.id ? { ...c, messages: [...c.messages, { id: uid(), from: "event", text: `${lead.stage} → ${to}`, at: new Date(), icon: "stage" }] } : c)));
      actions.changeStage(to);
    },
  };

  const patchChat = (id, fn) => setChats((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  const pushMsgs = (id, msgs, extra = {}) => patchChat(id, (c) => ({ ...c, messages: [...c.messages, ...msgs], ...extra }));

  const select = (id) => {
    setSelectedId(id);
    setPrefill(null);
    setMobileShowChat(true);
    patchChat(id, (c) => ({ ...c, unread: false }));
  };

  const send = (text, attachment) => {
    if (!chat) return;
    const at = new Date();
    const out = [];
    out.push(attachment ? { id: uid(), from: "agent", at, ticks: "delivered", ...attachment } : { id: uid(), from: "agent", text, at, ticks: "delivered" });
    pushMsgs(chat.id, out, { status: "open", unread: false, waitingSince: null, missedCallAt: null });
    if (lead) {
      logEvent(lead.id, { id: uid(), type: "whatsapp", by: ME, at, messages: [{ from: "agent", text: attachment ? attachment.text : text, at }] });
      updateLead(lead.id, { lastActivity: { type: "WhatsApp", at, by: ME, none: false }, needsReply: false });
    }
    setPrefill(null);
    // Mark as read a moment later
    setTimeout(() => patchChat(chat.id, (c) => ({ ...c, messages: c.messages.map((m) => (m.from === "agent" && m.ticks === "delivered" ? { ...m, ticks: "read" } : m)) })), 2500);
  };

  const resolve = () => {
    const snapshot = chat;
    const idx = list.findIndex((c) => c.id === chat.id);
    const next = list[idx + 1] || list[idx - 1];
    pushMsgs(chat.id, [{ id: uid(), from: "event", text: "Marked resolved", at: new Date(), icon: "resolved" }], { status: "resolved", waitingSince: null, missedCallAt: null, unread: false });
    setSelectedId(next?.id || null);
    showToast("Chat resolved", () => {
      setChats((cs) => cs.map((c) => (c.id === snapshot.id ? snapshot : c)));
      setSelectedId(snapshot.id);
      dismissToast();
    });
  };

  const call = () => {
    pushMsgs(chat.id, [{ id: uid(), from: "event", text: "Outgoing call", at: new Date(), icon: "call" }], { missedCallAt: null });
    showToast(`Calling ${name}…`);
  };

  const createLead = () => {
    const t = Date.now();
    const nextNo = Math.max(0, ...leads.map((l) => l.customerNo || 0)) + 1;
    const nl = {
      id: `N${t}`, customerNo: nextNo, customerId: customerId(nextNo), name: chat.contact.name, phone: chat.contact.phone, createdAt: new Date(t),
      stage: "New", careKind: "B", dueDate: null, babyDob: startOfDay(new Date(t - 9 * DAY)), babies: 1, birthWeights: [], currentWeights: [],
      services: ["Lactation support"], shiftType: null, shiftHours: null, careStart: null, careEnd: null, package: null, hospital: null, zone: null, address: "",
      source: "WhatsApp", score: 60, priority: "Medium", tag: null, lastActivity: { type: "WhatsApp", at: lastMessage(chat).at, by: ME, none: false }, unread: 0, needsReply: false,
      nextFollowUp: workHours(roundQuarter(new Date(t + 3600000))), nextAction: "Call to understand latching difficulty", lostReason: null, deferredUntil: null, deferNote: "",
      paymentStatus: "Not sent", amountPaid: 0, bookingStatus: "Not booked", paymentLinkOpened: false, prevStage: null, starred: false,
    };
    setLeads((prev) => [nl, ...prev]);
    patchChat(chat.id, (c) => ({ ...c, leadId: nl.id, contact: null }));
    showToast(`${nl.name} added as a lead (${nl.customerId})`);
  };

  const lm = chat ? lastMessage(chat) : null;
  const careLine = lead ? (lead.careKind === "B" ? `Baby ${babyAge(lead, now) || "—"}${lead.babies > 1 ? " · twins" : ""}` : `Expecting · ${(careStage(lead, now).split(" · ")[1] || "—")}`) : chat?.contact?.phone;
  const composerLead = lead || { name, package: null, services: [], careStart: null, customerId: "", shiftType: null };

  return (
    <div className="flex h-[calc(100dvh-48px)] md:h-[100dvh]">
      {/* ---------- Pane 1: list ---------- */}
      <div className={`w-full md:w-[300px] shrink-0 flex-col border-r border-line bg-surface-subtle ${mobileShowChat ? "hidden md:flex" : "flex"}`}>
        <div className="h-14 shrink-0 px-4 flex items-center gap-2">
          {searchOpen ? (
            <label className="flex-1 h-8 inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-white px-2 text-body">
              <Search className="h-3.5 w-3.5 text-ink-4" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setQuery(""); setSearchOpen(false); } }} placeholder="Name or phone" className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-ink-placeholder" />
              <button onClick={() => { setQuery(""); setSearchOpen(false); }} className="text-ink-4 hover:text-ink" aria-label="Close search"><X className="h-3 w-3" /></button>
            </label>
          ) : (
            <>
              <h1 className="flex-1 text-title-sm font-semibold tracking-[-0.01em]">Inbox</h1>
              <button onClick={() => setSearchOpen(true)} className="h-8 w-8 rounded-md flex items-center justify-center text-ink-3 hover:bg-surface-active hover:text-ink" aria-label="Search chats"><Search className="h-4 w-4" /></button>
            </>
          )}
        </div>
        <div className="px-2.5 pb-2 flex gap-0 overflow-x-auto [scrollbar-width:none]">
          {INBOX_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`h-7 shrink-0 rounded-full px-[7px] text-small inline-flex items-center gap-1 transition-colors duration-150 ${filter === f.id ? "bg-ink text-white" : "text-ink-3 hover:bg-surface-active hover:text-ink"}`}>
              {f.label}
              {["unread", "needs"].includes(f.id) && <span className={`tabular-nums ${filter === f.id ? "text-white/70" : "text-ink-4"}`}>{counts[f.id]}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
          {list.map((c) => {
            const l = leadOf(c);
            const nm = chatName(c, leads);
            const last = lastMessage(c);
            const sel = c.id === selectedId;
            const waiting = c.waitingSince && needsHumanReply(c);
            const right = waiting ? (
              <span className={`tabular-nums ${waitTone(now - c.waitingSince)}`}>{shortAgo(now - c.waitingSince)}</span>
            ) : (
              <span className="tabular-nums text-ink-4">{last ? shortAgo(now - last.at) : ""}</span>
            );
            return (
              <button
                key={c.id}
                onClick={() => select(c.id)}
                className={`relative w-full text-left rounded-lg px-2.5 py-2.5 mb-0.5 flex gap-2.5 transition-colors duration-150 ${sel ? "bg-white shadow-ring-line" : "hover:bg-surface-active"}`}
              >
                {c.unread && <span className="absolute left-0.5 top-[18px] h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />}
                <Avatar name={nm} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="flex-1 truncate text-body font-medium text-ink">{nm}</span>
                    <span className="text-caption">{right}</span>
                  </span>
                  {c.missedCallAt ? (
                    <span className={`mt-0.5 flex items-center gap-1 text-small ${c.unread ? "text-red-700 font-medium" : "text-red-500"}`}>
                      <PhoneMissed className="h-3 w-3" /> Missed call · {fmtTime(c.missedCallAt)}
                    </span>
                  ) : (
                    <span className={`mt-0.5 block truncate text-small ${c.unread ? "text-ink font-medium" : "text-ink-4"}`}>
                      {last?.from === "agent" ? "You: " : ""}
                      {last?.kind === "image" ? "Photo · payment screenshot" : last?.kind === "payment" ? `Payment link · ${fmtINR(last.amount)}` : last?.text}
                    </span>
                  )}
                  {c.tags.length > 0 && (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {c.tags.map((tg) => (
                        <span key={tg} className={`rounded px-1.5 py-px text-caption ${CHAT_TAG_STYLES[tg] || "bg-surface-hover text-ink-3"}`}>{tg}</span>
                      ))}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          {list.length === 0 && <div className="px-3 py-10 text-center text-small text-ink-4">{q ? "No chats match" : filter === "needs" || filter === "unread" ? "All caught up" : "No chats here"}</div>}
        </div>

      </div>

      {/* ---------- Pane 2: conversation ---------- */}
      <div className={`flex-1 min-w-0 flex-col ${mobileShowChat ? "flex" : "hidden md:flex"}`}>
        {chat ? (
          <>
            <div className="h-14 shrink-0 px-4 md:px-6 flex items-center gap-3 border-b border-line">
              <button onClick={() => setMobileShowChat(false)} className="md:hidden h-8 w-8 -ml-1 rounded-md flex items-center justify-center hover:bg-surface-hover" aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>
              <Avatar name={name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-body-lg font-medium">{name}</span>
                </div>
                <div className="text-small text-ink-4 tabular-nums truncate">{careLine}</div>
              </div>
              <button onClick={call} className="h-8 w-8 rounded-md border border-line-control flex items-center justify-center text-ink-3 hover:bg-surface-subtle hover:text-ink" aria-label="Call" title="Call">
                <Phone className="h-3.5 w-3.5" />
              </button>
            </div>

            <ChatThread chat={chat} lead={lead} name={name} now={now} scrollKey={chat.messages.length} />

            <div className="shrink-0 mx-auto w-full max-w-[824px]">
              <Composer
                key={chat.id}
                lead={composerLead}
                tab="whatsapp"
                setTab={() => {}}
                only="whatsapp"
                prefill={prefill}
                placeholder="Reply on WhatsApp… type / for templates"
                onWhatsApp={(text) => send(text)}
                onAttach={(file) => send(null, { kind: /\.pdf$/i.test(file.name) ? "pdf" : "file", text: file.name, size: fmtBytes(file.size) })}
              />
              <div className="px-5 md:px-8 pb-3 -mt-1 flex items-center justify-end">
                <button
                  onClick={resolve}
                  disabled={chat.status === "resolved"}
                  className="inline-flex items-center gap-1.5 text-small text-ink-3 hover:text-emerald-700 disabled:opacity-35"
                >
                  <CircleCheck className="h-3.5 w-3.5" /> {chat.status === "resolved" ? "Resolved" : "Mark resolved"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <MessageSquare className="h-5 w-5 text-ink-4 mb-2" />
            <div className="text-body font-medium">No chat selected</div>
            <div className="text-small text-ink-4 mt-1">Pick a conversation from the list.</div>
          </div>
        )}
      </div>

      {/* ---------- Pane 3: details ---------- */}
      {chat && (
        <aside aria-label="Contact details" className="hidden xl:block w-[260px] shrink-0 border-l border-line overflow-y-auto">
          <InboxDetails chat={chat} lead={lead} now={now} actions={inboxActions} onOpenRecord={onOpenRecord} onCreateLead={createLead} />
        </aside>
      )}

      {pendingStage && (
        <StageExtraModal
          pending={pendingStage}
          count={1}
          onCancel={() => setPendingStage(null)}
          onConfirm={(extra) => {
            const id = pendingStage.ids[0];
            const l = leads.find((x) => x.id === id);
            updateLead(id, {
              stage: pendingStage.stage,
              prevStage: PIPELINE.includes(l.stage) ? l.stage : l.prevStage,
              lostReason: pendingStage.stage === "Lost" ? extra.lostReason : null,
              deferredUntil: pendingStage.stage === "Deferred" ? extra.deferredUntil : null,
              deferNote: pendingStage.stage === "Deferred" ? extra.deferNote || "" : "",
              nextFollowUp: pendingStage.stage === "Deferred" ? extra.deferredUntil : null,
            });
            logEvent(id, { id: uid(), type: "stage", from: l.stage, to: pendingStage.stage, by: ME, at: new Date(), extra: extra.lostReason || extra.deferNote });
            pushMsgs(chat.id, [{ id: uid(), from: "event", text: `${l.stage} → ${pendingStage.stage}`, at: new Date(), icon: "stage" }]);
            setPendingStage(null);
          }}
        />
      )}
    </div>
  );
}

/* ==========================================================================
   FOLLOW-UPS — mock data
   ========================================================================== */

const FU_TYPES = ["Call", "WhatsApp", "Payment", "Consult"];
const FU_TYPE_COLOR = {
  Call: { block: "bg-blue-50 border-blue-400 text-blue-900", dot: "bg-blue-500" },
  WhatsApp: { block: "bg-emerald-50 border-emerald-500 text-emerald-900", dot: "bg-emerald-500" },
  Payment: { block: "bg-amber-50 border-amber-500 text-amber-900", dot: "bg-amber-500" },
  Consult: { block: "bg-brand/[0.07] border-brand text-brand-strong", dot: "bg-brand" },
};

const AUTO_RULES = [
  "Consult done without payment → Payment call in 24h",
  "Payment link not opened → WhatsApp reminder in 24h",
  "2 messages without reply → Call in 48h",
  "Deferred until date → Call on that date",
  "Expecting lead reaches 36 weeks → Pre-delivery check-in call",
  "Baby born detected → Call within 2 hours",
];

// due: ["d", days, hour, minute] relative to today, or ["t", minutes from now] for later today

// [lead, type, action, days ago, hour, outcome, completed by, extra]


/* ---------- Helpers ---------- */

const fuGroup = (f, now) => {
  const diff = dayDiff(f.due, now);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 6) return "week";
  return "later";
};
const FU_GROUPS = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "week", label: "This week" },
  { id: "later", label: "Later" },
];

function FuTypeIcon({ type, size = "md" }) {
  const cls = "h-3.5 w-3.5";
  const icon = {
    Call: <Phone className={cls} strokeWidth={1.75} />,
    WhatsApp: <WhatsAppIcon className={cls} />,
    Payment: <IndianRupee className={cls} strokeWidth={1.75} />,
    Consult: <CalendarCheck className={cls} strokeWidth={1.75} />,
  }[type];
  return (
    <span title={type} className={`${size === "sm" ? "h-6 w-6" : "h-7 w-7"} shrink-0 rounded-md flex items-center justify-center bg-surface-hover text-ink-3`}>
      {icon}
    </span>
  );
}

const leadCareLine = (l, now) =>
  l ? [l.careKind === "B" ? `Baby ${babyAge(l, now) || "—"}${l.babies > 1 ? " · twins" : ""}` : `Expecting ${(careStage(l, now).split(" · ")[1] || "—")}${l.babies > 1 ? " · twins" : ""}`, l.package].filter(Boolean).join(" · ") : "";

const fuDueLabel = (f, now, group) => {
  if (group === "overdue") {
    const n = -dayDiff(f.due, now);
    return { text: `${n} day${n > 1 ? "s" : ""} late`, late: true };
  }
  if (group === "today") return { text: fmtTime(f.due), late: f.due < now };
  if (group === "tomorrow") return { text: fmtTime(f.due), late: false };
  return { text: `${f.due.toLocaleDateString("en-GB", { weekday: "short" })} ${f.due.getDate()} · ${fmtTime(f.due)}`, late: false };
};

const primaryForType = (t) => ({ Call: "Call", WhatsApp: "WhatsApp", Payment: "Send link", Consult: "Reschedule" }[t]);

/* ---------- Modals ---------- */

function NextFollowUpTypedModal({ outcome, leadName, defaultType, onSave }) {
  const [type, setType] = useState(defaultType || "Call");
  const [when, setWhen] = useState(() => toLocalInput(atTen(outcome === "Deferred" ? 7 : 2)));
  const [action, setAction] = useState("");
  return (
    <Modal title="Set next follow-up" width={440}>
      <div className="p-5 space-y-4">
        <div className="text-body text-ink-3">
          {leadName} · logged as <Tag label={outcome} />. Open leads always need a next step.
        </div>
        <Field label="Type" required>
          <div className="flex flex-wrap gap-1.5">
            {FU_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={`h-8 rounded-md border px-2.5 text-small inline-flex items-center gap-1.5 transition-colors duration-150 ${type === t ? "border-ink bg-surface-hover" : "border-line-control text-ink-3 hover:border-line-strong"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${FU_TYPE_COLOR[t].dot}`} />
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Due" required>
          <input autoFocus type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={`${inputCls} tabular-nums`} />
        </Field>
        <Field label="Action">
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. Call about the payment link" className={inputCls} />
        </Field>
      </div>
      <div className="flex justify-end px-5 pb-5">
        <PrimaryButton disabled={!when} onClick={() => onSave({ type, due: new Date(when), action: action.trim() || `${type} follow-up` })}>
          Set follow-up
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function NewFollowUpModal({ leads, onClose, onCreate }) {
  const [leadName, setLeadName] = useState("");
  const [type, setType] = useState("Call");
  const [when, setWhen] = useState(() => toLocalInput(atTen(1)));
  const [note, setNote] = useState("");
  const lead = leads.find((l) => l.name === leadName);
  return (
    <Modal title="New follow-up" onClose={onClose} width={480}>
      <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-4">
        <Field label="Lead" required className="col-span-2">
          <SearchSelect value={leadName} onChange={setLeadName} options={leads.map((l) => l.name)} placeholder="Search leads" />
          {lead && <div className="mt-1.5 text-small text-ink-4 tabular-nums">{lead.customerId} · {lead.phone} · {leadCareLine(lead, new Date())}</div>}
        </Field>
        <Field label="Type" required className="col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {FU_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={`h-8 rounded-md border px-2.5 text-small inline-flex items-center gap-1.5 transition-colors duration-150 ${type === t ? "border-ink bg-surface-hover" : "border-line-control text-ink-3 hover:border-line-strong"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${FU_TYPE_COLOR[t].dot}`} />
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Due date and time" required className="col-span-2">
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={`${inputCls} tabular-nums`} />
        </Field>
        <Field label="Note" className="col-span-2">
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should happen on this follow-up?" className={`${inputCls} h-auto py-2 resize-none`} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 px-5 py-4 border-t border-line">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton disabled={!lead || !when} onClick={() => onCreate({ leadId: lead.id, type, due: new Date(when), owner: ME, action: note.trim() || `${type} follow-up` })}>
          Create follow-up
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/* ---------- Calendar ---------- */

const CAL_START = 7;
const CAL_END = 24;
const SLOT_H = 26; // px per 30 min

function FollowUpCalendar({ items, leads, now, onMove, onOpenLead }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const monday = useMemo(() => {
    const d = startOfDay(new Date());
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow + weekOffset * 7);
    return d;
  }, [weekOffset]);
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * DAY));
  const slots = Array.from({ length: (CAL_END - CAL_START) * 2 }, (_, i) => i);
  const nameOf = (id) => leads.find((l) => l.id === id)?.name || "";

  const blocksFor = (day) => {
    const list = items.filter((f) => dayDiff(f.due, day) === 0).sort((a, b) => a.due - b.due);
    const bySlot = {};
    return list.map((f) => {
      const mins = f.due.getHours() * 60 + f.due.getMinutes();
      const slot = Math.min(Math.max(Math.floor((mins - CAL_START * 60) / 30), 0), slots.length - 1);
      bySlot[slot] = (bySlot[slot] || 0) + 1;
      return { f, slot, col: bySlot[slot] - 1 };
    }).map((b, _, arr) => ({ ...b, cols: arr.filter((x) => x.slot === b.slot).length }));
  };

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMins - CAL_START * 60) / 30) * SLOT_H;

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 md:px-8 pb-3 flex items-center gap-2">
        <span className="text-body font-medium tabular-nums">
          {fmtShortDate(days[0])} – {fmtShortDate(days[6])} {days[6].getFullYear()}
        </span>
        <div className="ml-2 flex items-center gap-1">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="h-7 w-7 rounded-md border border-line-control flex items-center justify-center text-ink-3 hover:bg-surface-subtle" aria-label="Previous week"><ChevronLeft className="h-3.5 w-3.5" /></button>
          <button onClick={() => setWeekOffset(0)} className="h-7 rounded-md border border-line-control px-2 text-small text-ink-3 hover:bg-surface-subtle">This week</button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="h-7 w-7 rounded-md border border-line-control flex items-center justify-center text-ink-3 hover:bg-surface-subtle" aria-label="Next week"><ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
        <div className="ml-auto hidden md:flex items-center gap-3 text-caption text-ink-4">
          {FU_TYPES.map((t) => (
            <span key={t} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-sm ${FU_TYPE_COLOR[t].dot}`} />{t}</span>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-5 md:px-8 pb-8">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] sticky top-0 z-10 bg-white border-b border-line">
            <div />
            {days.map((d) => {
              const today = dayDiff(d, now) === 0;
              return (
                <div key={d.toISOString()} className="h-10 flex items-center justify-center gap-1.5 text-small">
                  <span className="text-ink-4">{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                  <span className={`tabular-nums h-6 min-w-6 px-1 rounded-full flex items-center justify-center ${today ? "bg-ink text-white" : "text-ink"}`}>{d.getDate()}</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))]">
            <div>
              {slots.map((s) => (
                <div key={s} className="relative" style={{ height: SLOT_H }}>
                  {s % 2 === 0 && <span className="absolute -top-1.5 right-2 text-micro text-ink-4 tabular-nums">{fmtTime(new Date(2000, 0, 1, CAL_START + s / 2)).replace(":00", "")}</span>}
                </div>
              ))}
            </div>
            {days.map((d) => {
              const blocks = blocksFor(d);
              const today = dayDiff(d, now) === 0;
              return (
                <div key={d.toISOString()} className={`relative border-l border-line ${today ? "bg-surface-subtle" : ""}`}>
                  {slots.map((s) => {
                    const key = `${d.toDateString()}-${s}`;
                    return (
                      <div
                        key={s}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (over !== key) setOver(key);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const id = e.dataTransfer.getData("text/plain");
                          const nd = new Date(d);
                          nd.setHours(CAL_START + Math.floor(s / 2), (s % 2) * 30, 0, 0);
                          setOver(null);
                          setDragId(null);
                          onMove(id, nd);
                        }}
                        className={`${s % 2 === 0 ? "border-t border-line-subtle" : ""} ${over === key ? "bg-brand-tint" : ""}`}
                        style={{ height: SLOT_H }}
                      />
                    );
                  })}
                  {today && nowTop > 0 && nowTop < slots.length * SLOT_H && (
                    <div className="pointer-events-none absolute left-0 right-0 z-[2] border-t border-red-400" style={{ top: nowTop }}>
                      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  )}
                  {blocks.map(({ f, slot, col, cols }) => (
                    <div
                      key={f.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", f.id);
                        setDragId(f.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      onClick={() => onOpenLead(f.leadId)}
                      title={`${f.type} · ${f.action} · ${nameOf(f.leadId)} · ${fmtTime(f.due)}`}
                      className={`absolute z-[1] overflow-hidden rounded-md border-l-2 px-1.5 text-caption cursor-grab active:cursor-grabbing transition-opacity duration-150 ${FU_TYPE_COLOR[f.type].block} ${dragId === f.id ? "opacity-40" : ""}`}
                      style={{ top: slot * SLOT_H + 1, height: SLOT_H - 2, left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)` }}
                    >
                      <div className="truncate leading-[20px]">
                        <span className="font-medium">{nameOf(f.leadId).split(" ")[0]}</span>
                        <span className="opacity-70 tabular-nums"> · {fmtTime(f.due)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

function FollowUpsPage({ followups, setFollowups, leads, setLeads, now, showToast, dismissToast, setTimelines, onOpenRecord, setToastRaised }) {
  const [tab, setTab] = useState("open");
  const [view, setView] = useState("list");
  const [types, setTypes] = useState([]);
  const [stages, setStages] = useState([]);
  const [tags, setTags] = useState([]);
  const [range, setRange] = useState("week");
  const [collapsed, setCollapsed] = useState({ later: true });
  const [selected, setSelected] = useState(() => new Set());
  const [menu, setMenu] = useState(null); // { type, anchor, id? }
  const [pendingNext, setPendingNext] = useState(null); // { ids, outcome, undo }
  const [newOpen, setNewOpen] = useState(false);
  const [panelLeadId, setPanelLeadId] = useState(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const openMenu = (type, e, extra = {}) => {
    e.stopPropagation();
    const anchor = e.currentTarget;
    setMenu((m) => (m && m.anchor === anchor ? null : { type, anchor, ...extra }));
  };

  useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape" && !menu && !pendingNext && !newOpen) {
        if (panelLeadId) setPanelLeadId(null);
        else setSelected(new Set());
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  useEffect(() => {
    setToastRaised(selected.size > 0);
    return () => setToastRaised(false);
  }, [selected.size, setToastRaised]);

  const leadById = (id) => leads.find((l) => l.id === id);
  const passes = (f) => {
    const l = leadById(f.leadId);
    return (!types.length || types.includes(f.type)) && (!stages.length || stages.includes(l?.stage)) && (!tags.length || tags.includes(l?.tag));
  };

  const open = followups.filter((f) => (f.status === "open" || f.status === "leaving") && passes(f));
  const openCount = open.filter((f) => f.status === "open").length;
  const rangeStart = range === "today" ? startOfDay(now) : range === "week" ? new Date(startOfDay(now) - 6 * DAY) : new Date(startOfDay(now) - 29 * DAY);
  const completed = followups.filter((f) => f.status === "done" && passes(f) && f.completedAt >= rangeStart).sort((a, b) => b.completedAt - a.completedAt);
  const grouped = FU_GROUPS.map((g) => ({ ...g, items: open.filter((f) => fuGroup(f, now) === g.id).sort((a, b) => a.due - b.due) }));

  /* ----- mutations ----- */
  const patch = (ids, fn) => setFollowups((fs) => fs.map((f) => (ids.includes(f.id) ? { ...f, ...fn(f) } : f)));
  const logLead = (leadId, ev) => {
    const l = leadById(leadId);
    if (!l) return;
    setTimelines((t) => ({ ...t, [leadId]: [ev, ...(t[leadId] || buildTimeline(l))] }));
  };

  const reschedule = (ids, date) => {
    const snapshot = followups;
    patch(ids, () => ({ due: date, ...(ids.length ? {} : {}) }));
    showToast(`${ids.length > 1 ? `${ids.length} follow-ups` : "Follow-up"} moved to ${dayDiff(date, now) === 0 ? "today" : fmtDay(date)}, ${fmtTime(date)}`, () => {
      setFollowups(snapshot);
      dismissToast();
    });
  };

  const completeIds = (ids, outcome, next) => {
    const snapshot = followups;
    const leadSnapshot = leads;
    const at = new Date();
    patch(ids, () => ({ status: "leaving" }));
    setTimeout(() => patch(ids, (f) => (f.status === "leaving" ? { status: "done", completedAt: at, completedBy: ME, outcome } : {})), 160);
    const created = [];
    ids.forEach((id) => {
      const f = followups.find((x) => x.id === id);
      logLead(f.leadId, { id: uid(), type: "followup", done: true, by: ME, at, outcome, action: f.action });
      if (next) {
        const nf = { id: uid(), leadId: f.leadId, type: next.type, action: next.action, due: next.due, owner: ME, status: "open", createdAt: at };
        created.push(nf);
      }
    });
    if (created.length) setTimeout(() => setFollowups((fs) => [...fs, ...created]), 170);
    setLeads((prev) =>
      prev.map((l) => {
        const mine = ids.map((id) => followups.find((x) => x.id === id)).find((f) => f.leadId === l.id);
        if (!mine) return l;
        const nx = created.find((c) => c.leadId === l.id);
        return { ...l, tag: outcome, nextFollowUp: nx ? nx.due : outcome === "Converted" || outcome === "Lost" ? null : l.nextFollowUp, nextAction: nx ? nx.action : l.nextAction, needsReply: false, lastActivity: { type: "Follow-up", at, by: ME, none: false } };
      })
    );
    setSelected(new Set());
    showToast(`${ids.length > 1 ? `${ids.length} follow-ups` : "Follow-up"} marked as ${outcome}${created.length ? ` · next set for ${fmtDay(created[0].due)}` : ""}`, () => {
      setFollowups(snapshot);
      setLeads(leadSnapshot);
      dismissToast();
    });
  };

  const pickOutcome = (ids, outcome) => {
    if (outcome === "Converted" || outcome === "Lost") return completeIds(ids, outcome, null);
    if (ids.length > 1) {
      // Bulk: each gets a next follow-up of the same type in 2 days
      const due = atTen(outcome === "Deferred" ? 7 : 2);
      const f = followups.find((x) => x.id === ids[0]);
      return completeIds(ids, outcome, { type: f.type, due, action: "Follow-up after last outcome" });
    }
    setPendingNext({ ids, outcome });
  };

  const primaryAction = (f, e) => {
    const fl = leadById(f.leadId);
    if (f.type === "Call") openCall(fl?.phone);
    else if (f.type === "WhatsApp" || f.type === "Payment") openWhatsApp(fl?.phone);
    else openMenu("reschedule", e, { id: f.id });
  };

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selIds = [...selected].filter((id) => followups.some((f) => f.id === id && f.status === "open"));

  /* ----- rows ----- */
  const renderOpenRow = (f, group) => {
    const l = leadById(f.leadId);
    const due = fuDueLabel(f, now, group);
    const leaving = f.status === "leaving";
    const isSel = selected.has(f.id);
    const menuOpen = menu?.id === f.id;
    return (
      <div className={`grid grid-cols-[minmax(0,1fr)] transition-[grid-template-rows,opacity] duration-150 ${leaving ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]"}`}>
        <div className={leaving ? "overflow-hidden" : ""}>
          <div className={`group relative grid grid-cols-[28px_32px_minmax(0,1fr)_200px_118px] items-center gap-2 h-11 px-3 border-b border-line text-body transition-colors duration-150 ${isSel ? "bg-brand-tint" : "hover:bg-surface-subtle"}`}>
            <Checkbox checked={isSel} onChange={() => toggle(f.id)} label={`Select ${f.action}`} />
            <FuTypeIcon type={f.type} />
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="truncate text-ink">{f.action}</span>
              <span className="text-ink-faint">·</span>
              <button onClick={() => setPanelLeadId(f.leadId)} className="max-w-[45%] sm:max-w-[12rem] truncate font-medium hover:underline underline-offset-2 decoration-line-heavy">
                {l ? l.name : "—"}
              </button>
              {f.auto && (
                <span title={`Auto follow-up: ${f.auto}`} className="shrink-0 inline-flex items-center gap-0.5 text-caption text-ink-4"><Zap className="h-3 w-3" /> Auto</span>
              )}
            </div>
            <span className="hidden sm:inline truncate text-small text-ink-4 tabular-nums">{leadCareLine(l, now)}</span>
            <span className={`text-right tabular-nums text-small ${due.late ? "text-red-700" : "text-ink-3"}`}>{due.text}</span>

            <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg pl-6 pr-1 py-1 bg-gradient-to-r from-transparent via-surface-subtle to-surface-subtle transition-opacity duration-150 ${menuOpen ? "opacity-100" : "opacity-0 [@media(hover:none)]:opacity-100 group-hover:opacity-100 focus-within:opacity-100"}`}>
              <SmallButton onClick={(e) => primaryAction(f, e)}>
                {f.type === "WhatsApp" ? <WhatsAppIcon className="h-3.5 w-3.5" /> : f.type === "Payment" ? <IndianRupee className="h-3.5 w-3.5" /> : f.type === "Call" ? <Phone className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
                {primaryForType(f.type)}
              </SmallButton>
              <SmallButton onClick={(e) => openMenu("snooze", e, { id: f.id })}>
                <AlarmClock className="h-3.5 w-3.5" /> Snooze
              </SmallButton>
              <SmallButton onClick={(e) => openMenu("done", e, { id: f.id })}>
                <Check className="h-3.5 w-3.5" /> Done
              </SmallButton>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const chip = (label, active, onClick, onClear) => (
    <span className={`h-7 inline-flex items-center rounded-md border text-small ${active ? "border-line-strong bg-surface-hover" : "border-line-control bg-white"}`}>
      <button onClick={onClick} className={`h-full px-2 inline-flex items-center gap-1 ${active ? "text-ink" : "text-ink-3 hover:text-ink"}`}>{label}</button>
      {active && onClear && (
        <button onClick={onClear} className="h-full px-1.5 border-l border-line-control text-ink-4 hover:text-ink" aria-label="Clear filter"><X className="h-3 w-3" /></button>
      )}
    </span>
  );

  const menuFor = menu && followups.find((f) => f.id === menu.id);
  const overdueTotal = followups.filter((f) => f.status === "open" && fuGroup(f, now) === "overdue").length;
  const panelLead = panelLeadId ? leadById(panelLeadId) : null;

  return (
    <div className="flex flex-col h-[calc(100dvh-48px)] md:h-[100dvh]">
      <div className="px-5 md:px-8 pt-8 md:pt-10 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-h1 font-medium tracking-[-0.01em] flex items-baseline gap-2">
            Follow-ups <span className="text-title-sm font-normal text-ink-4 tabular-nums">{openCount}</span>
          </h1>
          <PrimaryButton onClick={() => setNewOpen(true)} className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New follow-up</PrimaryButton>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-small text-ink-4">
          <span className="group/rules relative inline-flex items-center gap-1 cursor-default">
            <Zap className="h-3 w-3 text-ink-4" strokeWidth={1.75} />
            Auto follow-ups on
            <Info className="h-3 w-3 text-ink-4" />
            <span className="pointer-events-none absolute left-0 top-full z-40 mt-2 w-[360px] rounded-lg bg-ink p-3 text-small leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/rules:opacity-100">
              <span className="block mb-1.5 font-medium">Follow-ups are created automatically when:</span>
              {AUTO_RULES.map((r) => (
                <span key={r} className="flex gap-2"><span className="text-white/40">•</span>{r}</span>
              ))}
            </span>
          </span>
          {overdueTotal > 0 && <span className="text-red-700">· {overdueTotal} overdue</span>}
        </div>

        <div className="mt-6 flex items-center gap-5 border-b border-line">
          {[
            ["open", "Open", openCount],
            ["completed", "Completed", followups.filter((f) => f.status === "done" && passes(f)).length],
          ].map(([id, label, n]) => (
            <button key={id} onClick={() => { setTab(id); setSelected(new Set()); }} className={`relative h-9 flex items-center gap-1.5 text-body transition-colors duration-150 ${tab === id ? "text-ink font-medium" : "text-ink-4 hover:text-ink"}`}>
              {label}
              <span className="text-caption font-normal text-ink-4 tabular-nums">{n}</span>
              {tab === id && <span className="absolute -bottom-px left-0 right-0 h-[1.5px] rounded-full bg-ink" />}
            </button>
          ))}
        </div>

        {(
          <div className="py-3 flex items-center gap-1.5 flex-wrap">
            {chip(types.length ? <><span className="text-ink-4">Type</span> {types.join(", ")}</> : "Type", types.length > 0, (e) => openMenu("types", e), () => setTypes([]))}
            {chip(stages.length ? <><span className="text-ink-4">Stage</span> {stages.join(", ")}</> : "Stage", stages.length > 0, (e) => openMenu("stages", e), () => setStages([]))}
            {chip(tags.length ? <><span className="text-ink-4">Outcome</span> {tags.join(", ")}</> : "Outcome tag", tags.length > 0, (e) => openMenu("tags", e), () => setTags([]))}
            {tab === "completed" && (
              <div className="ml-2 h-7 flex items-center rounded-md border border-line-control p-0.5">
                {[
                  ["today", "Today"],
                  ["week", "This week"],
                  ["month", "This month"],
                ].map(([id, label]) => (
                  <button key={id} onClick={() => setRange(id)} className={`h-[22px] rounded px-2 text-small transition-colors duration-150 ${range === id ? "bg-surface-active text-ink" : "text-ink-4 hover:text-ink"}`}>{label}</button>
                ))}
              </div>
            )}
            {tab === "open" && (
              <div className="ml-auto h-7 flex items-center rounded-md border border-line-control p-0.5">
                {[
                  ["list", Rows3, "List view"],
                  ["calendar", CalendarDays, "Calendar view"],
                ].map(([v, Icon, label]) => (
                  <button key={v} title={label} aria-label={label} onClick={() => setView(v)} className={`h-[22px] w-7 rounded flex items-center justify-center transition-colors duration-150 ${view === v ? "bg-surface-active text-ink" : "text-ink-4 hover:text-ink"}`}>
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {tab === "open" && view === "calendar" ? (
          <FollowUpCalendar items={open.filter((f) => f.status === "open")} leads={leads} now={now} onOpenLead={setPanelLeadId} onMove={(id, d) => reschedule([id], d)} />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="px-5 md:px-8 pb-28 min-w-[760px]">
              {tab === "open" &&
                (openCount === 0 ? (
                  <div className="py-24 text-center">
                    <Check className="h-5 w-5 mx-auto text-ink-4 mb-2" />
                    <div className="text-body font-medium">No open follow-ups</div>
                    <div className="text-small text-ink-4 mt-1">Try removing a filter.</div>
                  </div>
                ) : (
                  <div className="space-y-6 pt-1">
                    {grouped.map((g) => {
                      const live = g.items.filter((f) => f.status === "open").length;
                      if (!g.items.length) return null;
                      const isCollapsed = collapsed[g.id];
                      return (
                        <section key={g.id}>
                          <button onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))} className="group/h flex items-center gap-1.5 h-7 text-small leading-4 font-medium">
                            <span className={g.id === "overdue" ? "text-red-700" : "text-ink-4 group-hover/h:text-ink"}>{g.label}</span>
                            <span className={`tabular-nums ${g.id === "overdue" ? "text-red-700" : "text-ink-4"}`}>{live}</span>
                            <ChevronDown className={`h-3 w-3 text-ink-4 transition-transform duration-150 ${isCollapsed ? "-rotate-90" : ""}`} />
                          </button>
                          {!isCollapsed && (
                            <div className="mt-1 border-t border-line">
                              {g.items.map((f) => (
                                <React.Fragment key={f.id}>{renderOpenRow(f, g.id)}</React.Fragment>
                              ))}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                ))}

              {tab === "completed" && (
                <div className="border-t border-line">
                  {completed.map((f) => {
                    const l = leadById(f.leadId);
                    return (
                      <div key={f.id} className="grid grid-cols-[32px_minmax(0,1fr)_190px_150px_140px] items-center gap-2 h-11 px-3 border-b border-line text-body hover:bg-surface-subtle transition-colors duration-150">
                        <FuTypeIcon type={f.type} />
                        <div className="min-w-0 flex items-center gap-1.5">
                          <span className="truncate text-ink-3">{f.action}</span>
                          <span className="text-ink-faint">·</span>
                          <button onClick={() => setPanelLeadId(f.leadId)} className="max-w-[45%] sm:max-w-[12rem] truncate font-medium hover:underline underline-offset-2 decoration-line-heavy">{l ? l.name : "—"}</button>
                        </div>
                        <span className="hidden sm:inline truncate text-small text-ink-4 tabular-nums">{leadCareLine(l, now)}</span>
                        <span className="text-small text-ink-3 tabular-nums">
                          {dayDiff(f.completedAt, now) === 0 ? `Today, ${fmtTime(f.completedAt)}` : dayDiff(f.completedAt, now) === -1 ? `Yesterday, ${fmtTime(f.completedAt)}` : `${fmtShortDate(f.completedAt)}, ${fmtTime(f.completedAt)}`}
                        </span>
                        <Tag label={f.outcome} className="text-small" />
                      </div>
                    );
                  })}
                  {completed.length === 0 && <div className="py-16 text-center text-body text-ink-4">Nothing completed in this period</div>}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Bulk bar */}
      {selIds.length > 0 && tab === "open" && (
        <div className="cw-toast fixed bottom-6 left-1/2 md:left-[calc(50%+130px)] -translate-x-1/2 z-40 flex items-center gap-0.5 rounded-xl bg-ink p-1 pl-3.5 text-body text-white shadow-float">
          <span className="pr-2 tabular-nums whitespace-nowrap">{selIds.length} selected</span>
          <span className="h-4 w-px bg-white/15 mx-1" />
          {[
            ["bulkReschedule", "Reschedule"],
          ].map(([type, label]) => (
            <button key={type} onClick={(e) => openMenu(type, e)} className={`h-8 rounded-lg px-2.5 whitespace-nowrap transition-colors duration-150 hover:bg-white/10 ${menu?.type === type ? "bg-white/10" : ""}`}>{label}</button>
          ))}
          <button onClick={(e) => openMenu("bulkDone", e)} className={`h-8 rounded-lg px-2.5 whitespace-nowrap transition-colors duration-150 hover:bg-white/10 ${menu?.type === "bulkDone" ? "bg-white/10" : ""}`}>Mark done</button>
          <span className="h-4 w-px bg-white/15 mx-1" />
          <button onClick={() => setSelected(new Set())} className="h-8 rounded-lg px-2.5 text-white/60 transition-colors duration-150 hover:bg-white/10 hover:text-white">Clear</button>
        </div>
      )}

      {/* Menus */}
      {menu && (
        <FixedMenu anchor={menu.anchor} onClose={closeMenu} width={["types", "stages", "tags"].includes(menu.type) ? 220 : 230} align={["snooze", "done", "reschedule"].includes(menu.type) ? "right" : "left"}>
          {(menu.type === "snooze" || menu.type === "reschedule") && menuFor && (
            <>
              <MenuHeading>{menu.type === "snooze" ? "Snooze until" : "Reschedule to"}</MenuHeading>
              {[
                ["Later today", () => roundQuarter(new Date(Date.now() + 3 * 3600000))],
                ["Tomorrow", () => atTen(1)],
                ["In 3 days", () => atTen(3)],
              ].map(([label, fn]) => (
                <MenuItem key={label} onClick={() => { closeMenu(); reschedule([menuFor.id], fn()); }}>{label}</MenuItem>
              ))}
              <div className="px-2 py-1.5">
                <div className="text-caption text-ink-4 mb-1">Pick a date</div>
                <input type="datetime-local" defaultValue={toLocalInput(atTen(1))} onChange={(e) => e.target.value && (closeMenu(), reschedule([menuFor.id], new Date(e.target.value)))} className="w-full h-8 rounded-md border border-line-control px-2 text-body outline-none tabular-nums focus:border-line-heavy" />
              </div>
            </>
          )}
          {(menu.type === "done" || menu.type === "bulkDone") && (
            <>
              <MenuHeading>{menu.type === "bulkDone" ? `Outcome for ${selIds.length} follow-ups` : "What was the outcome?"}</MenuHeading>
              {OUTCOMES.map((o) => (
                <MenuItem key={o} onClick={() => { closeMenu(); pickOutcome(menu.type === "done" ? [menu.id] : selIds, o); }}>
                  <span className={`h-1.5 w-1.5 rounded-full ${TAG_DOTS[o]}`} />
                  <span className="flex-1">{o}</span>
                  {o !== "Converted" && o !== "Lost" && <span className="text-caption text-ink-4">+ next</span>}
                </MenuItem>
              ))}
            </>
          )}
          {menu.type === "bulkReschedule" && (
            <>
              <MenuHeading>Reschedule {selIds.length} follow-ups</MenuHeading>
              <MenuItem onClick={() => { closeMenu(); reschedule(selIds, atTen(1)); setSelected(new Set()); }}>Tomorrow, 10:00 am</MenuItem>
              <div className="px-2 py-1.5">
                <div className="text-caption text-ink-4 mb-1">Pick a date</div>
                <input type="datetime-local" defaultValue={toLocalInput(atTen(2))} onChange={(e) => { if (e.target.value) { closeMenu(); reschedule(selIds, new Date(e.target.value)); setSelected(new Set()); } }} className="w-full h-8 rounded-md border border-line-control px-2 text-body outline-none tabular-nums focus:border-line-heavy" />
              </div>
            </>
          )}
          {["types", "stages", "tags"].includes(menu.type) && (() => {
            const [vals, setVals, opts, dot] =
              menu.type === "types" ? [types, setTypes, FU_TYPES, (v) => FU_TYPE_COLOR[v].dot] : menu.type === "stages" ? [stages, setStages, STAGES.map((s) => s.id), (v) => STAGE_DOT[v]] : [tags, setTags, OUTCOMES, (v) => TAG_DOTS[v]];
            return (
              <>
                <MenuHeading>{menu.type === "types" ? "Type" : menu.type === "stages" ? "Lead stage" : "Outcome tag"}</MenuHeading>
                {opts.map((v) => {
                  const on = vals.includes(v);
                  return (
                    <MenuItem key={v} onClick={() => setVals((x) => (on ? x.filter((y) => y !== v) : [...x, v]))}>
                      <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${on ? "bg-ink border-ink" : "border-line-strong"}`}>{on && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${dot(v)}`} />
                      <span className="flex-1">{v}</span>
                    </MenuItem>
                  );
                })}
              </>
            );
          })()}
        </FixedMenu>
      )}

      {pendingNext && (
        <NextFollowUpTypedModal
          outcome={pendingNext.outcome}
          leadName={leadById(followups.find((f) => f.id === pendingNext.ids[0])?.leadId)?.name}
          defaultType={(() => { const t = followups.find((f) => f.id === pendingNext.ids[0])?.type; return t; })()}
          onSave={(next) => {
            completeIds(pendingNext.ids, pendingNext.outcome, next);
            setPendingNext(null);
          }}
        />
      )}

      {newOpen && (
        <NewFollowUpModal
          leads={leads}
          onClose={() => setNewOpen(false)}
          onCreate={(f) => {
            const nf = { id: uid(), status: "open", createdAt: new Date(), ...f };
            setFollowups((fs) => [...fs, nf]);
            setNewOpen(false);
            const l = leadById(f.leadId);
            showToast(`Follow-up added for ${l?.name} · ${dayDiff(f.due, now) === 0 ? "today" : fmtDay(f.due)}, ${fmtTime(f.due)}`, () => {
              setFollowups((fs) => fs.filter((x) => x.id !== nf.id));
              dismissToast();
            });
          }}
        />
      )}

      <LeadPanel
        lead={panelLead}
        now={now}
        onClose={() => setPanelLeadId(null)}
        onSnooze={(l, d) => setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, nextFollowUp: d } : x)))}
        onToast={showToast}
        onOpenRecord={(id) => { setPanelLeadId(null); onOpenRecord(id); }}
      />
    </div>
  );
}

/* ==========================================================================
   CONSULTATIONS — mock data
   ========================================================================== */

const CONSULT_OUTCOMES = ["Interested", "Needs time", "Price concern", "Not interested", "Paid on call"];
const CONSULT_OBJECTIONS = ["Price", "Family help available", "Caregiver preference", "Timing", "Trust"];
const NICU_DAYS = {};
// Historic baseline for the stats strip (last 30 days, before this mock week)
const CONSULT_HISTORY = { shows: 0, noShows: 0, paid: 0 };
const OUTCOME_DOT = { Interested: "bg-blue-500", "Needs time": "bg-stone-400", "Price concern": "bg-amber-500", "Not interested": "bg-red-500", "Paid on call": "bg-emerald-500" };

// Demo data is seeded by name. If a demo record is missing (renamed, deleted, real data), skip the
// demo set instead of taking the whole app down. These builders go away once Supabase is connected.
const seedSafely = (label, fn, fallback = []) => {
  try { return fn(); } catch (e) { console.warn(`Demo ${label} skipped:`, e.message); return fallback; }
};


/* ---------- Helpers ---------- */

const consultStatus = (c, now, nextId) => {
  if (c.status === "cancelled") return { key: "cancelled", label: "Cancelled", cls: "bg-surface-hover text-ink-4", dot: "bg-stone-400" };
  if (c.status === "noshow") return { key: "noshow", label: "No-show", cls: "bg-red-50 text-red-700", dot: "bg-red-500" };
  if (c.status === "done") return { key: "done", label: `Done · ${c.outcome}`, cls: "bg-surface-hover text-ink-2", dot: OUTCOME_DOT[c.outcome] || "bg-stone-400" };
  const end = c.start.getTime() + c.duration * 60000;
  if (end < now) return { key: "needs", label: "Outcome needed", cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  if (c.start <= now) return { key: "live", label: "In progress", cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", soon: true };
  const mins = Math.round((c.start - now) / 60000);
  if (mins <= 60) return { key: "next", label: `Starts in ${mins} min`, cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", soon: true };
  if (c.rescheduledFrom) return { key: "rescheduled", label: "Rescheduled", cls: "bg-orange-50 text-orange-700", dot: "bg-orange-400" };
  if (c.confirmed) return { key: "upcoming", label: "Confirmed", cls: "bg-blue-50 text-blue-700", dot: "bg-blue-500" };
  return { key: "upcoming", label: "Awaiting reply", cls: "bg-surface-hover text-ink-3", dot: "bg-stone-400" };
};
const freeSlots = (consults, date, now, excludeId) => {
  const out = [];
  for (let m = 9 * 60; m <= 20 * 60 + 30; m += 30) {
    const s = startOfDay(date);
    s.setMinutes(m);
    if (s < now) continue;
    const clash = consults.some((c) => c.id !== excludeId && c.status !== "noshow" && c.status !== "cancelled" && Math.abs(c.start - s) < 30 * 60000);
    if (!clash) out.push(s);
  }
  return out;
};

const consultFlags = (l) => [l?.babies > 1 ? "Twins" : null, NICU_DAYS[l?.name] ? "NICU" : null].filter(Boolean);

const eventLine = (e) => {
  switch (e.type) {
    case "whatsapp": return `WhatsApp · ${e.messages.length} message${e.messages.length > 1 ? "s" : ""}`;
    case "call": return `${e.label || "Call"} · ${e.duration} min${e.outcome ? ` · ${e.outcome}` : ""}`;
    case "payment": return e.status === "paid" ? `Payment received · ${fmtINR(e.amount)}` : `Payment link sent · ${fmtINR(e.amount)}`;
    case "stage": return `${e.from} → ${e.to}`;
    case "unread": return "Unread WhatsApp";
    case "note": return `Note · ${e.text}`;
    case "created": return `Lead created · ${e.source}`;
    case "followup": return e.done ? `Follow-up done · ${e.outcome}` : `Follow-up set · ${e.action || ""}`;
    case "file": return `File · ${e.name}`;
    case "service": return `Service sold · ${EXPERT[e.expert]?.name}${e.pack > 1 ? ` · pack of ${e.pack}` : ""}`;
    default: return e.type;
  }
};

/* ---------- Book modal ---------- */

function BookConsultModal({ leads, consults, now, initial = {}, onClose, onBook }) {
  const [leadName, setLeadName] = useState(initial.leadName || "");
  const [date, setDate] = useState(() => toLocalInput(initial.date || atTen(1)).slice(0, 10));
  const [slot, setSlot] = useState(initial.date ? initial.date.getTime() : null);
  const [mode, setMode] = useState("Phone");
  const [note, setNote] = useState("");
  const lead = leads.find((l) => l.name === leadName);
  const slots = freeSlots(consults, new Date(`${date}T00:00:00`), now);
  return (
    <Modal title="Book consultation" onClose={onClose} width={520}>
      <div className="p-5 space-y-4">
        <Field label="Lead" required>
          <SearchSelect value={leadName} onChange={setLeadName} options={leads.filter((l) => !["Won", "Lost"].includes(l.stage)).map((l) => l.name)} placeholder="Search leads" />
          {lead && <div className="mt-1.5 text-small text-ink-4 tabular-nums">{lead.customerId} · {lead.phone} · {leadCareLine(lead, now)}</div>}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <input type="date" value={date} min={toLocalInput(new Date()).slice(0, 10)} onChange={(e) => { setDate(e.target.value); setSlot(null); }} className={`${inputCls} tabular-nums`} />
          </Field>
        </div>
        <Field label="Free slots · 30 min" required>
          {slots.length ? (
            <div className="grid grid-cols-5 gap-1.5 max-h-[132px] overflow-y-auto pr-1">
              {slots.map((s) => (
                <button key={s.getTime()} type="button" onClick={() => setSlot(s.getTime())} className={`h-8 rounded-md border text-small tabular-nums transition-colors duration-150 ${slot === s.getTime() ? "border-ink bg-ink text-white" : "border-line-control text-ink-2 hover:border-line-heavy"}`}>
                  {fmtTime(s)}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-body text-ink-4">No free slots this day. Try another date</div>
          )}
        </Field>
        <Field label="Mode">
          <div className="flex h-9 w-[220px] rounded-md border border-line-control p-0.5">
            {[["Phone", Phone], ["Video", Video]].map(([m, Icon]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 rounded text-small inline-flex items-center justify-center gap-1.5 transition-colors duration-150 ${mode === m ? "bg-surface-active font-medium" : "text-ink-4 hover:text-ink"}`}><Icon className="h-3.5 w-3.5" /> {m}</button>
            ))}
          </div>
        </Field>
        <Field label="Note">
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Husband joining, NICU discharge plan" className={`${inputCls} h-auto py-2 resize-none`} />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-line">
        <span className="inline-flex items-center gap-1.5 text-small text-ink-4"><WhatsAppIcon className="h-3.5 w-3.5 text-emerald-700" /> WhatsApp confirmation will be sent</span>
        <div className="flex gap-2">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton disabled={!lead || !slot} onClick={() => onBook({ leadId: lead.id, start: new Date(slot), mode, note: note.trim() })}>Book consultation</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Outcome form (inside the consult panel) ---------- */

function ConsultOutcomeForm({ consult, lead, callNotes, onCancel, onSave }) {
  const [outcome, setOutcome] = useState("Interested");
  const [pkg, setPkg] = useState(lead.package || "Together");
  const [price, setPrice] = useState(String(packageValue(lead) || ""));
  const [obj, setObj] = useState([]);
  const [sendLink, setSendLink] = useState(false);
  const [next, setNext] = useState(() => toLocalInput(roundQuarter(new Date(Date.now() + 24 * 3600000))));
  const [notes, setNotes] = useState(callNotes || "");
  const needsNext = outcome !== "Paid on call" && outcome !== "Not interested";
  const lbl = "block text-small font-medium text-ink-4 mb-1.5";
  return (
    <div className="space-y-4">
      <div>
        <span className={lbl}>Outcome</span>
        <div className="flex flex-wrap gap-1.5">
          {CONSULT_OUTCOMES.map((o) => (
            <button key={o} onClick={() => setOutcome(o)} className={`h-7 rounded-md border px-2 text-small inline-flex items-center gap-1.5 transition-colors duration-150 ${outcome === o ? "border-ink bg-surface-hover" : "border-line-control text-ink-3 hover:border-line-strong"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${OUTCOME_DOT[o]}`} /> {o}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={lbl}>Package quoted</span>
          <select value={pkg} onChange={(e) => setPkg(e.target.value)} className={`${inputCls} h-8`}>
            {PACKAGE_OPTIONS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={lbl}>Price quoted</span>
          <div className="flex">
            <span className="h-8 px-2 flex items-center rounded-l-md border border-r-0 border-line-control bg-surface-subtle text-small text-ink-4">₹</span>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputCls} h-8 rounded-l-none tabular-nums`} />
          </div>
        </label>
      </div>
      <div>
        <span className={lbl}>Objections</span>
        <div className="space-y-1">
          {CONSULT_OBJECTIONS.map((o) => (
            <label key={o} className="flex items-center gap-2 text-body cursor-pointer">
              <input type="checkbox" checked={obj.includes(o)} onChange={() => setObj((x) => (x.includes(o) ? x.filter((y) => y !== o) : [...x, o]))} className="h-3.5 w-3.5 accent-ink" />
              {o}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 cursor-pointer">
        <span className="text-body">Send payment link now</span>
        <button type="button" role="switch" aria-checked={sendLink} onClick={() => setSendLink((s) => !s)} disabled={outcome === "Paid on call" || outcome === "Not interested"} className={`relative h-5 w-9 rounded-full transition-colors duration-150 disabled:opacity-35 ${sendLink ? "bg-ink" : "bg-line-control"}`}>
          <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${sendLink ? "translate-x-4" : "translate-x-0"}`} />
        </button>
      </label>
      {needsNext && (
        <label className="block">
          <span className={lbl}>Next follow-up <span className="text-brand">*</span></span>
          <input type="datetime-local" value={next} onChange={(e) => setNext(e.target.value)} className={`${inputCls} h-8 tabular-nums`} />
        </label>
      )}
      <label className="block">
        <span className={lbl}>Notes</span>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was discussed?" className={`${inputCls} h-auto py-2 resize-none`} />
      </label>
      <div className="flex gap-2">
        <SecondaryButton onClick={onCancel} className="flex-1">Cancel</SecondaryButton>
        <PrimaryButton
          disabled={needsNext && !next}
          onClick={() => onSave({ outcome, packageQuoted: pkg, priceQuoted: Number(price) || 0, objections: obj, sendLink: sendLink && outcome !== "Paid on call" && outcome !== "Not interested", next: needsNext ? new Date(next) : null, notes: notes.trim() })}
          className="flex-1"
        >
          Save outcome
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------- Week view ---------- */

// ---------- Consultations calendar (Day / Week / Month) ----------
const CC_START = 8; // 8 AM
const CC_END = 22; // 10 PM
const CC_HOUR = 112; // px per hour
const MODE_STYLE = {
  Video: { block: "bg-[#EFF6FE] border-[#C9DEF7]", active: "border-[#3B82F6] shadow-[0_0_0_1px_#3B82F6]", time: "text-[#2F6FD6]", dot: "bg-[#3B82F6]", label: "Video call" },
  Phone: { block: "bg-[#F6F1FB] border-[#DCCDEB]", active: "border-[#8B5CC7] shadow-[0_0_0_1px_#8B5CC7]", time: "text-[#7B3FB8]", dot: "bg-[#8B5CC7]", label: "Phone call" },
};
const modeStyle = (m) => MODE_STYLE[m] || MODE_STYLE.Video;
const fmtT2 = (d) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
// "12:00 – 12:30 PM" (drops the first AM/PM when both match)
const fmtRange = (a, b) => {
  const [ta, pa] = fmtT2(a).split(" ");
  const [tb, pb] = fmtT2(b).split(" ");
  return pa === pb ? `${ta} – ${tb} ${pb}` : `${ta} ${pa} – ${tb} ${pb}`;
};

// Lay out overlapping consults side by side within a day
function layoutDay(list) {
  const items = [...list].sort((a, b) => a.start - b.start);
  const out = [];
  let cluster = [];
  let clusterEnd = 0;
  const flush = () => {
    const cols = [];
    cluster.forEach((c) => {
      let col = cols.findIndex((end) => end <= c.start.getTime());
      if (col === -1) { col = cols.length; cols.push(0); }
      cols[col] = c.start.getTime() + c.duration * 60000;
      out.push({ c, col });
    });
    out.slice(out.length - cluster.length).forEach((o) => (o.cols = cols.length));
    cluster = [];
  };
  items.forEach((c) => {
    const s = c.start.getTime();
    if (cluster.length && s >= clusterEnd) flush();
    cluster.push(c);
    clusterEnd = Math.max(clusterEnd, s + c.duration * 60000);
  });
  if (cluster.length) flush();
  return out;
}

function ConsultPopover({ c, lead, st, anchor, onClose, onDetails, onJoin }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const w = 300, h = ref.current?.offsetHeight || 240;
    let left = r.right + 10;
    if (left + w > window.innerWidth - 12) left = r.left - w - 10;
    let top = Math.min(Math.max(12, r.top - 8), window.innerHeight - h - 12);
    setPos({ left: Math.max(12, left), top });
  }, [anchor]);
  useOutsideClick(ref, onClose, true);
  const ms = modeStyle(c.mode);
  return (
    <div ref={ref} className="cw-toast fixed z-[75] w-[300px] rounded-xl border border-line-control bg-white p-4 shadow-pop" style={pos || { left: -9999, top: 0 }}>
      <div className="flex items-start gap-3">
        <Avatar name={lead?.name || "?"} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-body-lg font-semibold text-ink truncate">{lead?.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-small text-ink-3 min-w-0">
            <Phone className="h-3 w-3 shrink-0" /> <span className="tabular-nums truncate">{lead?.phone}</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 h-6 text-small ${st.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}</span>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-y-3 gap-x-4 text-small">
        <div><div className="text-ink-4">Consultation type</div><div className="mt-0.5 text-body text-ink inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${ms.dot}`} />{ms.label}</div></div>
        <div><div className="text-ink-4">Priority</div><div className="mt-0.5 text-body text-ink">{lead ? leadPriority(lead) : "—"}</div></div>
        <div><div className="text-ink-4">Care stage</div><div className="mt-0.5 text-body text-ink">{lead ? (lead.careKind === "B" ? `Born · ${babyAge(lead, new Date()) || "—"}` : `Expecting · ${careStage(lead, new Date()).split(" · ")[1] || "—"}`) : "—"}</div></div>
        <div><div className="text-ink-4">Package</div><div className="mt-0.5 text-body text-ink">{lead?.package || "Not decided"}</div></div>
      </div>
      <div className="mt-4 space-y-2 text-small text-ink-2">
        <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-ink-4" /><span className="tabular-nums">{c.start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, {fmtT2(c.start)} · {c.duration} min</span></div>
        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-ink-4" /><span className="truncate">{[lead?.hospital, lead?.zone].filter(Boolean).join(" · ") || "—"}</span></div>
        {c.note && <div className="flex items-center gap-2"><StickyNote className="h-3.5 w-3.5 text-ink-4" /><span className="truncate">{c.note}</span></div>}
      </div>
      <div className="mt-4 flex gap-2">
        {(st.key === "next" || st.key === "live" || st.key === "upcoming") && (
          <button onClick={onJoin} className={`flex-1 ${btn("primary", "lg")}`}>
            {c.mode === "Video" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />} {c.mode === "Video" ? "Join" : "Call"}
          </button>
        )}
        <button onClick={onDetails} className="h-9 flex-1 rounded-lg border border-line-control text-body text-ink inline-flex items-center justify-center gap-1.5 hover:bg-surface-subtle">
          {st.key === "needs" ? "Log outcome" : "View details"} <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ConsultCalendar({ consults, leads, now, nextId, onMove, onSelect, onJoin, onBookSlot }) {
  const [mode, setMode] = useState("week"); // day | week | month
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date()));
  const [pop, setPop] = useState(null); // { id, anchor }
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [dragId, setDragId] = useState(null);
  const [dropHint, setDropHint] = useState(null); // { day, mins }
  const scrollRef = useRef(null);
  const leadOf = (id) => leads.find((l) => l.id === id);

  const q = query.trim().toLowerCase();
  const visible = consults.filter((c) => {
    if (q && !(leadOf(c.leadId)?.name || "").toLowerCase().includes(q)) return false;
    if (status === "All") return true;
    const k = consultStatus(c, now, nextId).key;
    return status === "Upcoming" ? ["upcoming", "next", "rescheduled", "live"].includes(k) : status === "Outcome needed" ? k === "needs" : status === "Done" ? k === "done" : k === "noshow";
  });

  const weekStart = useMemo(() => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  }, [anchorDate]);
  const days = mode === "day" ? [anchorDate] : Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY));
  const step = (dir) => {
    const d = new Date(anchorDate);
    if (mode === "day") d.setDate(d.getDate() + dir);
    else if (mode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir, 1);
    setAnchorDate(startOfDay(d));
  };
  const rangeLabel =
    mode === "day"
      ? anchorDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" })
      : mode === "week"
        ? `${fmtShortDate(days[0])} – ${fmtShortDate(days[6])} ${days[6].getFullYear()}`
        : anchorDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const inRange = mode === "month"
    ? visible.filter((c) => c.start.getMonth() === anchorDate.getMonth() && c.start.getFullYear() === anchorDate.getFullYear())
    : visible.filter((c) => days.some((d) => dayDiff(c.start, d) === 0));

  // Open on the current hour
  useEffect(() => {
    if (mode === "month" || !scrollRef.current) return;
    const h = Math.max(CC_START, Math.min(new Date().getHours() - 1, CC_END - 4));
    scrollRef.current.scrollTop = (h - CC_START) * CC_HOUR;
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const minsFromY = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const raw = ((e.clientY - r.top) / CC_HOUR) * 60 + CC_START * 60;
    return Math.max(CC_START * 60, Math.min(CC_END * 60 - 30, Math.floor(raw / 30) * 30));
  };
  const atMins = (day, mins) => { const d = new Date(day); d.setHours(Math.floor(mins / 60), mins % 60, 0, 0); return d; };
  const hours = Array.from({ length: CC_END - CC_START }, (_, i) => CC_START + i);
  const popC = pop && consults.find((c) => c.id === pop.id);

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="px-5 md:px-8 pb-3 flex items-center gap-2 flex-wrap">
        <span className="text-body text-ink"><span className="font-semibold tabular-nums">{inRange.length}</span> <span className="text-ink-3">consultations</span></span>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-8 w-48 rounded-md border border-line-control px-2.5 flex items-center gap-1.5 focus-within:border-line-heavy">
            <Search className="h-3.5 w-3.5 text-ink-4" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name" className="min-w-0 flex-1 text-body outline-none placeholder:text-ink-placeholder" />
          </div>
          <div className="relative">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 appearance-none rounded-md border border-line-control bg-white pl-2.5 pr-7 text-body text-ink outline-none cursor-pointer hover:border-line-heavy">
              {["All", "Upcoming", "Outcome needed", "Done", "No-show"].map((s) => <option key={s} value={s}>{s === "All" ? "All status" : s}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-4" />
          </div>
        </div>
      </div>

      <div className="mx-5 md:mx-8 mb-6 flex-1 min-h-0 flex flex-col rounded-xl border border-line-control bg-white overflow-hidden">
        {/* Calendar header */}
        <div className="h-12 shrink-0 px-4 flex items-center gap-3 border-b border-line-control">
          <span className="text-body-lg font-semibold text-ink">{anchorDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-small text-[#2F6FD6]"><span className="h-2 w-2 rounded-full bg-[#3B82F6]" />Video call</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-small text-[#7B3FB8]"><span className="h-2 w-2 rounded-full bg-[#8B5CC7]" />Phone call</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-8 flex items-center rounded-md border border-line-control overflow-hidden">
              {[["day", "Day"], ["week", "Week"], ["month", "Month"]].map(([k, l], i) => (
                <button key={k} onClick={() => setMode(k)} className={`h-full px-3 text-small transition-colors duration-150 ${i ? "border-l border-line-control" : ""} ${mode === k ? "text-white" : "text-ink-2 hover:bg-surface-subtle"}`} style={mode === k ? { backgroundColor: ACCENT } : undefined}>{l}</button>
              ))}
            </div>
            <div className="h-8 flex items-center rounded-md border border-line-control">
              <button onClick={() => step(-1)} aria-label="Previous" className="h-full w-7 flex items-center justify-center text-ink-3 hover:text-ink"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button onClick={() => setAnchorDate(startOfDay(new Date()))} className="h-full px-2 inline-flex items-center gap-1.5 text-small text-ink-2 tabular-nums border-x border-line-control hover:bg-surface-subtle" title="Go to today">
                <CalendarDays className="h-3.5 w-3.5 text-ink-4" /> {rangeLabel}
              </button>
              <button onClick={() => step(1)} aria-label="Next" className="h-full w-7 flex items-center justify-center text-ink-3 hover:text-ink"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>

        {mode === "month" ? (
          <MonthGrid anchorDate={anchorDate} consults={visible} leadOf={leadOf} now={now} nextId={nextId} onPick={(c, el) => setPop({ id: c.id, anchor: el })} onDay={(d) => { setAnchorDate(startOfDay(d)); setMode("day"); }} />
        ) : (
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
            <div style={{ minWidth: mode === "day" ? 0 : 64 + 7 * 150 }}>
              {/* Day headers */}
              <div className="sticky top-0 z-[3] grid bg-surface-subtle border-b border-line-control" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0,1fr))` }}>
                <div />
                {days.map((d) => {
                  const today = dayDiff(d, now) === 0;
                  return (
                    <div key={d.getTime()} className="h-10 border-l border-line-control flex items-center justify-center gap-1.5 text-small">
                      <span className={today ? "font-semibold text-ink" : "font-medium text-ink-2"}>{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                      <span className={`tabular-nums ${today ? "h-6 min-w-6 px-1.5 rounded-full text-white font-medium flex items-center justify-center" : "font-medium text-ink-2"}`} style={today ? { backgroundColor: ACCENT } : undefined}>{String(d.getDate()).padStart(2, "0")}</span>
                    </div>
                  );
                })}
              </div>
              {/* Body */}
              <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0,1fr))` }}>
                <div>
                  {hours.map((h) => (
                    <div key={h} className="relative" style={{ height: CC_HOUR }}>
                      <span className="absolute -top-2 right-3 text-small font-medium text-ink-2 tabular-nums">{h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}</span>
                    </div>
                  ))}
                </div>
                {days.map((d) => {
                  const mine = layoutDay(visible.filter((c) => dayDiff(c.start, d) === 0));
                  const today = dayDiff(d, now) === 0;
                  const nowTop = ((now.getHours() * 60 + now.getMinutes() - CC_START * 60) / 60) * CC_HOUR;
                  return (
                    <div
                      key={d.getTime()}
                      className={`relative border-l border-line-control ${today ? "bg-brand-tint" : ""}`}
                      style={{ height: hours.length * CC_HOUR }}
                      onDragOver={(e) => { if (!dragId) return; e.preventDefault(); const m = minsFromY(e); if (!dropHint || dropHint.mins !== m || dropHint.day !== d.getTime()) setDropHint({ day: d.getTime(), mins: m }); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropHint(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("text/plain");
                        const c = consults.find((x) => x.id === id);
                        const when = atMins(d, minsFromY(e));
                        setDragId(null); setDropHint(null);
                        if (c && when > now) onMove(id, when);
                      }}
                      onClick={(e) => {
                        if (e.target !== e.currentTarget) return;
                        const when = atMins(d, minsFromY(e));
                        if (when > now) onBookSlot(when);
                      }}
                    >
                      {hours.map((h, i) => (
                        <div key={h} className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-line-control" style={{ top: i * CC_HOUR }} />
                      ))}
                      {dropHint && dropHint.day === d.getTime() && (
                        <div className="pointer-events-none absolute left-1.5 right-1.5 rounded-lg border border-dashed border-brand bg-brand/[0.05] text-caption text-brand px-2 py-1 tabular-nums" style={{ top: ((dropHint.mins - CC_START * 60) / 60) * CC_HOUR + 2, height: CC_HOUR / 2 - 4 }}>
                          Move to {fmtT2(atMins(d, dropHint.mins))}
                        </div>
                      )}
                      {today && nowTop > 0 && nowTop < hours.length * CC_HOUR && (
                        <div className="pointer-events-none absolute left-0 right-0 z-[2]" style={{ top: nowTop }}>
                          <div className="h-px" style={{ backgroundColor: ACCENT }} />
                          <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full" style={{ backgroundColor: ACCENT }} />
                        </div>
                      )}
                      {mine.map(({ c, col, cols }) => {
                        const lead = leadOf(c.leadId);
                        const st = consultStatus(c, now, nextId);
                        const ms = modeStyle(c.mode);
                        const mins = c.start.getHours() * 60 + c.start.getMinutes();
                        const top = ((mins - CC_START * 60) / 60) * CC_HOUR;
                        if (top < 0 || top >= hours.length * CC_HOUR) return null;
                        const height = Math.max((c.duration / 60) * CC_HOUR - 4, 40);
                        const end = new Date(c.start.getTime() + c.duration * 60000);
                        const movable = c.status === "scheduled" && c.start > now;
                        const muted = st.key === "noshow" || st.key === "cancelled";
                        const isOpen = pop?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            draggable={movable}
                            onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.id); e.dataTransfer.effectAllowed = "move"; setDragId(c.id); setPop(null); }}
                            onDragEnd={() => { setDragId(null); setDropHint(null); }}
                            onClick={(e) => setPop(isOpen ? null : { id: c.id, anchor: e.currentTarget })}
                            className={`absolute z-[1] text-left rounded-lg border px-2 py-1.5 overflow-hidden transition-[box-shadow,border-color,opacity] duration-150 hover:shadow-lift ${ms.block} ${isOpen ? ms.active : ""} ${muted ? "opacity-60" : ""} ${dragId === c.id ? "opacity-40" : ""} ${movable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                            style={{ top: top + 2, height, left: `calc(${(col / cols) * 100}% + 6px)`, width: `calc(${100 / cols}% - 12px)` }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="h-5 w-5 shrink-0 rounded-full bg-white/80 border border-black/[0.06] text-micro font-medium text-ink-3 flex items-center justify-center">{(lead?.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                              <span className={`truncate text-small font-medium text-ink ${muted ? "line-through" : ""}`}>{lead?.name || "—"}</span>
                              {["needs", "noshow", "done", "next", "live"].includes(st.key) && <span title={st.label} className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`} />}
                            </div>
                            {height >= 44 && <div className={`mt-1 text-small tabular-nums truncate ${ms.time}`}>{fmtRange(c.start, end)}</div>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {popC && (
        <ConsultPopover
          c={popC}
          lead={leadOf(popC.leadId)}
          st={consultStatus(popC, now, nextId)}
          anchor={pop.anchor}
          onClose={() => setPop(null)}
          onDetails={() => { setPop(null); onSelect(popC.id); }}
          onJoin={() => { setPop(null); onJoin(popC.id); }}
        />
      )}
    </div>
  );
}

function MonthGrid({ anchorDate, consults, leadOf, now, nextId, onPick, onDay }) {
  const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="grid grid-cols-7 bg-surface-subtle border-b border-line-control">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => <div key={d} className={`h-9 flex items-center justify-center text-small font-medium text-ink-2 ${i ? "border-l border-line-control" : ""}`}>{d}</div>)}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-7 auto-rows-[minmax(118px,1fr)] overflow-auto">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === anchorDate.getMonth();
          const today = dayDiff(d, now) === 0;
          const list = consults.filter((c) => dayDiff(c.start, d) === 0).sort((a, b) => a.start - b.start);
          return (
            <div key={i} className={`p-1.5 border-b border-line-control ${i % 7 ? "border-l" : ""} ${inMonth ? "" : "bg-surface-subtle"}`}>
              <button onClick={() => onDay(d)} className={`h-6 min-w-6 px-1.5 rounded-full text-small tabular-nums ${today ? "text-white font-medium" : inMonth ? "text-ink-2 hover:bg-surface-hover" : "text-ink-faint"}`} style={today ? { backgroundColor: ACCENT } : undefined}>{d.getDate()}</button>
              <div className="mt-1 space-y-1">
                {list.slice(0, 3).map((c) => {
                  const ms = modeStyle(c.mode);
                  return (
                    <button key={c.id} onClick={(e) => onPick(c, e.currentTarget)} className={`w-full flex items-center gap-1.5 rounded-md border px-1.5 h-[22px] text-small text-left ${ms.block}`}>
                      <span className={`tabular-nums shrink-0 ${ms.time}`}>{fmtTime(c.start)}</span>
                      <span className="truncate text-ink">{leadOf(c.leadId)?.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
                {list.length > 3 && <button onClick={() => onDay(d)} className="px-1.5 text-caption text-ink-4 hover:text-ink">+{list.length - 3} more</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

function ConsultationsPage({ consults, setConsults, leads, setLeads, now, showToast, dismissToast, timelines, setTimelines, setFollowups, onOpenRecord }) {
  const [view, setView] = useState("list");
  const [tab, setTab] = useState("today");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const drawerBackdropRef = useRef(null);
  usePanelFocus(drawerOpen, drawerRef, () => {});
  const grabDrawer = useSheetDrag(drawerRef, drawerBackdropRef, () => setDrawerOpen(false));
  const pendingMode = useRef(null);
  const [showPast, setShowPast] = useState(false);
  const [needsOnly, setNeedsOnly] = useState(false);
  const [bookOpen, setBookOpen] = useState(null); // {} or { date }
  const [panel, setPanel] = useState("notes"); // notes | call | outcome
  const [call, setCall] = useState(null); // { startedAt, notes }
  const [confirmNoShow, setConfirmNoShow] = useState(false);
  const [resAnchor, setResAnchor] = useState(null);
  const closeRes = useCallback(() => setResAnchor(null), []);

  const leadById = (id) => leads.find((l) => l.id === id);
  const upcomingSorted = consults.filter((c) => c.status === "scheduled" && c.start > now).sort((a, b) => a.start - b.start);
  const nextId = upcomingSorted[0]?.id;
  const [selectedId, setSelectedId] = useState(() => nextId || consults[0]?.id);
  const sel = consults.find((c) => c.id === selectedId);
  const selLead = sel ? leadById(sel.leadId) : null;

  useEffect(() => {
    const mode = pendingMode.current || "notes";
    pendingMode.current = null;
    setPanel(mode);
    setCall(mode === "call" ? { startedAt: Date.now(), notes: "" } : null);
  }, [selectedId]);
  const openConsult = (id, mode = "notes") => {
    if (id === selectedId) {
      setPanel(mode);
      if (mode === "call") setCall({ startedAt: Date.now(), notes: "" });
    } else {
      pendingMode.current = mode;
      setSelectedId(id);
    }
    setDrawerOpen(true);
  };
  useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape" && drawerOpen && !confirmNoShow && !bookOpen) setDrawerOpen(false);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  /* ----- stats ----- */
  const todayStart = startOfDay(now);
  const weekEnd = new Date(todayStart.getTime() + 7 * DAY);
  const isNeeds = (c) => c.status === "scheduled" && c.start.getTime() + c.duration * 60000 < now;
  const active = (c) => c.status !== "rescheduled-old";
  const todayCount = consults.filter((c) => active(c) && dayDiff(c.start, now) === 0).length;
  const weekCount = consults.filter((c) => active(c) && c.start >= todayStart && c.start < weekEnd).length;
  const doneLive = consults.filter((c) => c.status === "done").length;
  const noShowLive = consults.filter((c) => c.status === "noshow").length;
  const paidLive = consults.filter((c) => c.status === "done" && (c.outcome === "Paid on call" || leadById(c.leadId)?.paymentStatus === "Paid")).length;
  const showRate = Math.round(((CONSULT_HISTORY.shows + doneLive) / (CONSULT_HISTORY.shows + CONSULT_HISTORY.noShows + doneLive + noShowLive)) * 100);
  const paidRate = Math.round(((CONSULT_HISTORY.paid + paidLive) / (CONSULT_HISTORY.shows + doneLive)) * 100);
  const needsCount = consults.filter(isNeeds).length;

  /* ----- list ----- */
  const listItems = consults
    .filter((c) => (needsOnly ? isNeeds(c) : showPast ? true : c.start >= todayStart))
    .sort((a, b) => a.start - b.start);
  const groups = [];
  listItems.forEach((c) => {
    const k = startOfDay(c.start).getTime();
    let g = groups.find((x) => x.k === k);
    if (!g) groups.push((g = { k, date: startOfDay(c.start), items: [] }));
    g.items.push(c);
  });
  const groupLabel = (d) => {
    const diff = dayDiff(d, now);
    const base = `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;
    if (diff === 0) return `Today · ${base}`;
    if (diff === 1) return `Tomorrow · ${base}`;
    if (diff === -1) return `Yesterday · ${base}`;
    return base;
  };

  /* ----- mutations ----- */
  const updateLead = (id, patch) => setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const logEvents = (leadId, evs) =>
    setTimelines((t) => {
      const l = leadById(leadId);
      return { ...t, [leadId]: [...evs, ...(t[leadId] || (l ? buildTimeline(l) : []))] };
    });
  const patchConsult = (id, p) => setConsults((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));

  const book = (b) => {
    const nc = { id: uid(), duration: 30, status: "scheduled", ...b };
    const l = leadById(b.leadId);
    setConsults((cs) => [...cs, nc]);
    const evs = [{ id: uid(), type: "followup", by: ME, at: new Date(), when: b.start, action: `Consult booked · ${b.mode}` }];
    if (["New", "Qualified"].includes(l.stage)) evs.unshift({ id: uid(), type: "stage", from: l.stage, to: "Consult booked", by: ME, at: new Date() });
    logEvents(l.id, evs);
    updateLead(l.id, { ...(["New", "Qualified"].includes(l.stage) ? { stage: "Consult booked" } : {}), nextFollowUp: b.start, nextAction: "Consult call" });
    setBookOpen(null);
    setSelectedId(nc.id);
    showToast(`Consult booked for ${l.name} · ${fmtDay(b.start)}, ${fmtTime(b.start)} · WhatsApp confirmation will be sent`, () => {
      setConsults((cs) => cs.filter((c) => c.id !== nc.id));
      dismissToast();
    });
  };

  const reschedule = (id, start) => {
    const c = consults.find((x) => x.id === id);
    if (!c || c.status !== "scheduled") return;
    const snapshot = consults;
    patchConsult(id, { start, rescheduledFrom: c.rescheduledFrom || c.start });
    logEvents(c.leadId, [{ id: uid(), type: "followup", by: ME, at: new Date(), when: start, action: `Consult rescheduled from ${fmtDay(c.start)}, ${fmtTime(c.start)}` }]);
    updateLead(c.leadId, { nextFollowUp: start, nextAction: "Consult call" });
    showToast(`Rescheduled to ${fmtDay(start)}, ${fmtTime(start)} · WhatsApp update will be sent`, () => {
      setConsults(snapshot);
      dismissToast();
    });
  };

  const markNoShow = () => {
    const c = sel;
    const l = selLead;
    patchConsult(c.id, { status: "noshow" });
    const at = new Date();
    logEvents(l.id, [
      { id: uid(), type: "whatsapp", by: ME, at: new Date(at.getTime() + 1000), messages: [{ from: "agent", text: `Hi ${firstName(l)}, we missed you for the consult today. No worries at all — would you like to pick a new time? Reply with a day that suits you.`, at }] },
      { id: uid(), type: "edit", by: ME, at, text: `Consult marked no-show · ${fmtTime(c.start)}` },
    ]);
    const due = workHours(roundQuarter(new Date(Date.now() + 4 * 3600000)));
    setFollowups((fs) => [...fs, { id: uid(), leadId: l.id, type: "Call", action: "Call to rebook consult", due, owner: ME, status: "open", auto: "Consult no-show", createdAt: at }]);
    updateLead(l.id, { nextFollowUp: due, nextAction: "Call to rebook consult", tag: "Not responding" });
    setConfirmNoShow(false);
    showToast(`Marked no-show · reschedule message sent · rebook call set for ${dayDiff(due, now) === 0 ? "today" : "tomorrow"}, ${fmtTime(due)}`);
  };

  const saveOutcome = (o) => {
    const c = sel;
    const l = selLead;
    const at = new Date();
    const duration = call ? Math.max(1, Math.round((Date.now() - call.startedAt) / 60000)) : c.duration;
    patchConsult(c.id, { status: "done", outcome: o.outcome, packageQuoted: o.packageQuoted, priceQuoted: o.priceQuoted, objections: o.objections, notes: o.notes });
    const tag = { Interested: "Interested", "Needs time": "Deferred", "Price concern": "Price concern", "Not interested": "Lost", "Paid on call": "Converted" }[o.outcome];
    const evs = [{ id: uid(), type: "call", label: "Consult", by: ME, at, duration, outcome: tag, notes: [o.notes, o.objections.length ? `Objections: ${o.objections.join(", ")}` : "", `Quoted ${o.packageQuoted} at ${fmtINR(o.priceQuoted)}`].filter(Boolean).join(" · ") }];
    let patch = { tag, package: o.packageQuoted, lastActivity: { type: "Consult", at, by: ME, none: false } };
    const toStage = (to) => {
      if (l.stage !== to) evs.unshift({ id: uid(), type: "stage", from: l.stage, to, by: ME, at: new Date(at.getTime() + 1000) });
      patch.stage = to;
    };
    if (o.outcome === "Paid on call") {
      // Ending a call never marks a sale as won — payment has to be verified first
      toStage("Payment pending");
      const verifyAt = workHours(roundQuarter(new Date(Date.now() + 2 * 3600000)));
      patch = { ...patch, nextFollowUp: verifyAt, nextAction: "Verify payment received", needsReply: false };
      evs.unshift({ id: uid(), type: "followup", by: ME, at: new Date(at.getTime() + 2000), when: verifyAt, action: `Verify payment received · ${fmtINR(o.priceQuoted)} said paid on call` });
      setFollowups((fs) => [...fs, { id: uid(), leadId: l.id, type: "Payment", action: "Verify payment received", due: verifyAt, owner: ME, status: "open", createdAt: at }]);
    } else if (o.outcome === "Not interested") {
      toStage("Lost");
      patch = { ...patch, lostReason: o.objections.includes("Price") ? "Price" : o.objections.includes("Family help available") ? "Family will manage" : "Not needed", prevStage: "Consult done", nextFollowUp: null };
    } else if (o.sendLink) {
      toStage("Payment pending");
      patch = { ...patch, paymentStatus: "Link sent", paymentLinkOpened: false };
      evs.unshift({ id: uid(), type: "payment", status: "sent", amount: o.priceQuoted, by: ME, at: new Date(at.getTime() + 2000), note: "Not opened yet" });
    } else toStage("Consult done");
    if (o.next) {
      patch = { ...patch, nextFollowUp: o.next, nextAction: o.sendLink ? "Check on the payment link" : "Follow up after consult" };
      evs.unshift({ id: uid(), type: "followup", by: ME, at: new Date(at.getTime() + 3000), when: o.next, action: patch.nextAction });
      setFollowups((fs) => [...fs, { id: uid(), leadId: l.id, type: o.sendLink ? "Payment" : "Call", action: patch.nextAction, due: o.next, owner: ME, status: "open", createdAt: at }]);
    }
    updateLead(l.id, patch);
    logEvents(l.id, evs);
    setPanel("notes");
    setCall(null);
    setDrawerOpen(false);
    showToast(`Outcome saved · ${o.outcome}${o.sendLink ? " · payment link sent" : o.outcome === "Paid on call" ? " · verify payment to mark Won" : ""}`);
  };

  /* ----- side panel: key notes, call notes, outcome ----- */
  const renderPanel = () => {
    if (!sel || !selLead) return <div className="p-6 text-center text-body text-ink-4">Select a consultation</div>;
    const l = selLead;
    const st = consultStatus(sel, now, nextId);
    const tl = (timelines[l.id] || buildTimeline(l)).filter((e) => e.type !== "edit").slice(0, 3);
    const born = l.careKind === "B";
    const facts = [born ? `Baby ${babyAge(l, now) || "—"}` : `${(careStage(l, now).split(" · ")[1] || "—").replace("w", " weeks")}`, NICU_DAYS[l.name] ? `NICU ${NICU_DAYS[l.name]} days` : null, l.babies > 1 ? "Twins" : null, l.hospital, l.zone].filter(Boolean).join(" · ");
    const section = (title, children, icon) => (
      <div className="mt-4">
        <div className="flex items-center gap-1 text-small font-medium text-ink-4 mb-1">{icon}{title}</div>
        {children}
      </div>
    );
    const elapsed = call ? Math.floor((now - call.startedAt) / 1000) : 0;
    return (
      <div className="p-4">
        <div className="flex items-center gap-1.5 text-caption text-ink-4">
          {panel === "call" ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> In call · <span className="tabular-nums">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</span></span>
          ) : panel === "outcome" ? (
            <span className="font-medium text-ink">Log outcome · {fmtTime(sel.start)}</span>
          ) : (
            <>Consultation · <span className="tabular-nums">{fmtTime(sel.start)}</span></>
          )}
          <span className="ml-auto inline-flex items-center gap-1">{sel.mode === "Video" ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />} {sel.mode}</span>
        </div>
        <button onClick={() => onOpenRecord(l.id)} className="mt-2 text-title-sm font-semibold tracking-[-0.01em] hover:underline underline-offset-2 decoration-line-heavy">{l.name}</button>
        <div className="text-small text-ink-4 tabular-nums leading-snug">{facts}</div>

        {panel === "call" && (
          <div className="mt-4">
            <textarea autoFocus rows={9} value={call.notes} onChange={(e) => setCall((c) => ({ ...c, notes: e.target.value }))} placeholder="Notes while you talk: needs, objections, who decides, dates…" className="w-full resize-none rounded-lg border border-line-control px-3 py-2 text-body leading-relaxed outline-none placeholder:text-ink-placeholder focus:border-line-heavy" />
            <PrimaryButton onClick={() => setPanel("outcome")} className="mt-3 w-full flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700"><PhoneOff className="h-3.5 w-3.5" /> End call and log outcome</PrimaryButton>
          </div>
        )}

        {panel === "outcome" && (
          <div className="mt-4">
            <ConsultOutcomeForm consult={sel} lead={l} callNotes={call?.notes} onCancel={() => setPanel(call ? "call" : "notes")} onSave={saveOutcome} />
          </div>
        )}

        {panel === "notes" && (
          <>
            {sel.status === "done" ? (
              section(
                "Outcome",
                <div className="text-body leading-relaxed">
                  <DotLabel dot={OUTCOME_DOT[sel.outcome] || "bg-stone-400"}>{sel.outcome}</DotLabel>
                  {sel.packageQuoted && <div className="text-ink-3 tabular-nums">Quoted {sel.packageQuoted} · {fmtINR(sel.priceQuoted)}</div>}
                  {sel.objections?.length > 0 && <div className="text-ink-3">Objections: {sel.objections.join(", ")}</div>}
                  {sel.notes && <div className="mt-1 text-ink-2">{sel.notes}</div>}
                </div>
              )
            ) : sel.status === "noshow" ? (
              section("No-show", <div className="text-body text-ink-3">Reschedule message sent on WhatsApp. A call to rebook is in Follow-ups.</div>)
            ) : null}
            {section("Key notes", <KeyNotes notes={l.keyNotes || seedKeyNotes(l)} onChange={(list) => updateLead(l.id, { keyNotes: list })} />)}
            {section(
              "Last 3 interactions",
              <ul className="space-y-1">
                {tl.map((e) => (
                  <li key={e.id} className="flex items-baseline gap-2 text-small">
                    <span className="min-w-0 flex-1 truncate text-ink-2">{eventLine(e)}</span>
                    <span className="shrink-0 text-ink-4 tabular-nums">{fmtRel(now - e.at)}</span>
                  </li>
                ))}
              </ul>
            )}
            {sel.status === "scheduled" && (
              <div className="mt-5 flex items-center gap-1.5">
                {st.key === "needs" ? (
                  <PrimaryButton onClick={() => setPanel("outcome")} className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700"><Check className="h-3.5 w-3.5" /> Log outcome</PrimaryButton>
                ) : (
                  <PrimaryButton onClick={() => { setCall({ startedAt: Date.now(), notes: "" }); setPanel("call"); }} className="flex-1 flex items-center justify-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Start call</PrimaryButton>
                )}
                <button onClick={(e) => setResAnchor(resAnchor ? null : e.currentTarget)} title="Reschedule" aria-label="Reschedule" className="h-8 w-8 rounded-md border border-line-control flex items-center justify-center text-ink-3 hover:bg-surface-subtle hover:text-ink"><CalendarClock className="h-4 w-4" /></button>
                <button onClick={() => setConfirmNoShow(true)} title="Mark no-show" aria-label="Mark no-show" className="h-8 w-8 rounded-md border border-line-control flex items-center justify-center text-ink-3 hover:bg-red-50 hover:text-red-700 hover:border-red-200"><UserX className="h-4 w-4" /></button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // The family's journey as quiet text (the CRM's signature), not a coloured category chip
  const careChip = (l) => (
    <span className="inline-flex items-center gap-1 text-small text-ink-3 tabular-nums whitespace-nowrap">
      {l.careKind === "B" ? <Baby className="h-3.5 w-3.5 text-ink-placeholder" strokeWidth={1.5} /> : <Sprout className="h-3.5 w-3.5 text-ink-placeholder" strokeWidth={1.5} />}
      {l.careKind === "B" ? `Born · ${babyAge(l, now) || "—"}` : `Pregnancy · ${(careStage(l, now).split(" · ")[1] || "—")}`}
    </span>
  );

  const TABS = [
    { id: "today", label: "Today", fn: (c) => dayDiff(c.start, now) === 0 && c.status !== "cancelled", sort: 1 },
    { id: "upcoming", label: "Upcoming", fn: (c) => c.status === "scheduled" && dayDiff(c.start, now) > 0, sort: 1 },
    { id: "completed", label: "Completed", fn: (c) => c.status === "done", sort: -1 },
    { id: "cancelled", label: "Cancelled", fn: (c) => c.status === "cancelled", sort: 1 },
    { id: "noshow", label: "No-show", fn: (c) => c.status === "noshow", sort: -1 },
  ];
  const tabDef = TABS.find((t) => t.id === tab);
  const rows = consults.filter(tabDef.fn).sort((a, b) => (a.start - b.start) * tabDef.sort);

  const rebook = (c) => setBookOpen({ leadName: leadById(c.leadId)?.name });

  const actionFor = (c, st) => {
    const base = "h-8 rounded-lg px-3 text-body font-medium inline-flex items-center gap-1.5 transition-colors duration-150";
    const secondary = `${base} border border-line-control bg-white text-ink hover:bg-surface-subtle hover:border-line-strong`;
    if (c.status === "cancelled" || c.status === "noshow")
      return <button onClick={(e) => { e.stopPropagation(); rebook(c); }} className={secondary}><CalendarPlus className="h-3.5 w-3.5" /> Rebook</button>;
    if (c.status === "done") return <button onClick={(e) => { e.stopPropagation(); openConsult(c.id); }} className={secondary}>View outcome</button>;
    if (st.key === "needs") return <button onClick={(e) => { e.stopPropagation(); openConsult(c.id, "outcome"); }} className={secondary}>Log outcome</button>;
    const Icon = c.mode === "Video" ? Video : Phone;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); openConsult(c.id, "call"); }}
        className={st.soon ? `${base} bg-ink text-white shadow-xs hover:bg-black` : secondary}
      >
        <Icon className="h-3.5 w-3.5" /> {c.mode === "Video" ? "Join" : "Call"}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-48px)] md:h-[100dvh]">
      <div className="px-5 md:px-8 pt-8 md:pt-10 shrink-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-h1 font-medium tracking-[-0.01em]">Consultations</h1>
            <p className="mt-1 text-body text-ink-4">Join, then record the outcome. Ending a call never marks a sale as won.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 flex items-center rounded-md border border-line-control bg-surface-subtle p-0.5">
              {[["list", "List", List], ["week", "Calendar", CalendarDays]].map(([v, label, Icon]) => (
                <button key={v} onClick={() => setView(v)} className={`h-[26px] rounded-md px-2.5 text-small inline-flex items-center gap-1.5 transition-colors duration-150 ${view === v ? "bg-white text-ink font-medium shadow-ring-line" : "text-ink-4 hover:text-ink"}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
            <SecondaryButton onClick={() => setBookOpen({})} className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Book consultation</SecondaryButton>
          </div>
        </div>

        {view === "list" && (
          <div className="mt-6 flex items-center gap-6 border-b border-line overflow-x-auto">
            {TABS.map((t) => {
              const n = consults.filter(t.fn).length;
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className={`relative h-10 flex items-center gap-2 text-body whitespace-nowrap transition-colors duration-150 ${on ? "text-ink font-medium" : "text-ink-4 hover:text-ink"}`}>
                  {t.label}
                  <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-caption font-medium tabular-nums flex items-center justify-center ${on ? "bg-brand/10 text-brand" : "bg-surface-active text-ink-3"}`}>{n}</span>
                  {on && <span className="absolute -bottom-px left-0 right-0 h-[1.5px] rounded-full bg-ink" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {view === "week" ? (
          <div className="h-full flex flex-col pt-4">
            <div className="px-5 md:px-8 pb-2 flex items-center gap-1.5 text-small text-ink-4">
              <span className="text-ink-4">Click an empty slot to book · drag a consultation to move it</span>
            </div>
            <div className="flex-1 min-h-0">
              <ConsultCalendar consults={consults.filter((c) => c.status !== "cancelled")} leads={leads} now={now} nextId={nextId} onMove={reschedule} onSelect={(id) => openConsult(id, consultStatus(consults.find((c) => c.id === id), now, nextId).key === "needs" ? "outcome" : "notes")} onJoin={(id) => openConsult(id, "call")} onBookSlot={(date) => setBookOpen({ date })} />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="px-5 md:px-8 py-5 pb-24 max-w-[1180px]">
              {/* Automatic WhatsApp consult reminders are not connected yet */}
              {rows.length ? (
                <div className="overflow-hidden rounded-xl border border-line bg-white">
                  {rows.map((c, i) => {
                    const l = leadById(c.leadId);
                    if (!l) return null;
                    const st = consultStatus(c, now, nextId);
                    const showDate = tab !== "today";
                    const prevDay = i > 0 && dayDiff(rows[i - 1].start, c.start) === 0;
                    return (
                      <div
                        key={c.id}
                        onClick={() => openConsult(c.id)}
                        className={`group grid grid-cols-[60px_minmax(0,1fr)] sm:grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 sm:gap-4 px-4 sm:px-5 py-3.5 cursor-pointer transition-colors duration-150 ${i ? "border-t border-line" : ""} ${st.soon ? "bg-brand/[0.035] hover:bg-brand/[0.06]" : drawerOpen && selectedId === c.id ? "bg-surface-sidebar" : "hover:bg-surface-subtle"}`}
                      >
                        <div>
                          <div className={`text-body font-medium tabular-nums ${c.status === "cancelled" ? "text-ink-4 line-through" : "text-ink"}`}>{fmtTime(c.start).toUpperCase()}</div>
                          <div className="text-small text-ink-4 tabular-nums">{showDate ? (dayDiff(c.start, now) === 1 ? "Tomorrow" : dayDiff(c.start, now) === -1 ? "Yesterday" : fmtDay(c.start)) : `${c.duration} min`}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-body-lg font-medium text-ink">{l.name}</span>
                            {careChip(l)}
                            {consultFlags(l).map((f) => (
                              <span key={f} className="rounded-md bg-surface-hover px-1.5 py-px text-caption text-ink-3">{f}</span>
                            ))}
                          </div>
                          <div className="mt-1 flex items-center gap-2 flex-wrap text-small text-ink-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-medium tabular-nums ${st.cls}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${st.dot} ${st.key === "live" ? "animate-pulse" : ""}`} />
                              {st.label}
                            </span>
                            <span className="truncate">
                              {l.careKind === "B" ? "Postnatal consultation" : "Prenatal consultation"}{l.zone ? ` · ${l.zone}` : ""}
                              {c.status === "cancelled" && c.cancelReason ? ` · ${c.cancelReason}` : ""}
                              {c.rescheduledFrom && c.status === "scheduled" ? ` · moved from ${fmtDay(c.rescheduledFrom)}` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="col-start-2 sm:col-start-auto flex items-center gap-3">
                          {actionFor(c, st)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line-control py-16 text-center">
                  <CalendarDays className="h-5 w-5 mx-auto text-ink-4 mb-2" />
                  <div className="text-body font-medium">No {tabDef.label.toLowerCase()} consultations</div>
                  {tab !== "completed" && tab !== "noshow" && (
                    <button onClick={() => setBookOpen({})} className="mt-2 text-small text-ink-3 underline underline-offset-2 hover:text-ink">Book consultation</button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right-side panel: key notes, in-call notes, outcome */}
      <div ref={drawerBackdropRef} onClick={() => setDrawerOpen(false)} className={`fixed inset-0 z-40 bg-black/10 max-md:bg-black/25 transition-opacity duration-200 max-md:duration-500 ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside ref={drawerRef} tabIndex={-1} inert={!drawerOpen} aria-label="Consultation details" onPointerDown={(e) => e.target.closest("[data-sheet-grab]") && grabDrawer(e)} className={`${sheetCls(drawerOpen)} md:shadow-panel`}>
        <SheetHandle />
        <div data-sheet-grab className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-line max-md:touch-none">
          <span className="text-small leading-4 text-ink-4">Consultation</span>
          <button onClick={() => setDrawerOpen(false)} className="h-7 w-7 rounded-md flex items-center justify-center text-ink-4 hover:bg-surface-hover hover:text-ink" aria-label="Close panel"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{renderPanel()}</div>
      </aside>

      {resAnchor && sel && (
        <FixedMenu anchor={resAnchor} onClose={closeRes} width={260} align="right">
          <MenuHeading>Reschedule · free slots</MenuHeading>
          {[0, 1, 2].map((off) => {
            const d = startOfDay(new Date(Date.now() + off * DAY));
            const s = freeSlots(consults, d, now, sel.id).slice(0, 8);
            if (!s.length) return null;
            return (
              <div key={off} className="px-2 py-1.5">
                <div className="text-caption text-ink-4 mb-1">{off === 0 ? "Today" : off === 1 ? "Tomorrow" : fmtDay(d)}</div>
                <div className="grid grid-cols-4 gap-1">
                  {s.map((x) => (
                    <button key={x.getTime()} onClick={() => { closeRes(); reschedule(sel.id, x); }} className="h-7 rounded-md border border-line-control text-caption tabular-nums hover:border-ink">{fmtTime(x).replace(" ", "")}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </FixedMenu>
      )}

      {confirmNoShow && sel && (
        <Modal title="Mark as no-show?" onClose={() => setConfirmNoShow(false)} width={400}>
          <div className="p-5 text-body leading-relaxed text-ink-2">
            {selLead?.name} didn't join the {fmtTime(sel.start)} consult. A friendly reschedule message goes out on WhatsApp, and a call to rebook is added to your follow-ups in about 4 hours.
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <SecondaryButton onClick={() => setConfirmNoShow(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={markNoShow} className="bg-red-600 hover:bg-red-700">Mark no-show</PrimaryButton>
          </div>
        </Modal>
      )}

      {bookOpen && <BookConsultModal leads={leads} consults={consults} now={now} initial={bookOpen} onClose={() => setBookOpen(null)} onBook={book} />}
    </div>
  );
}

/* ==========================================================================
   PIPELINE — kanban over the same leads
   ========================================================================== */

const PIPE_COLUMNS = ["New", "Qualified", "Consult booked", "Consult done", "Payment pending"];
// Days in stage before a card counts as stuck (Consult booked is measured from the consult time)
const STUCK_LIMITS = { Qualified: 3, "Consult booked": 1, "Consult done": 2, "Payment pending": 2 };
// Average ticket used to value leads without a package yet (planning figure, not a price)
const EST_TICKET = 40000;

const leadValue = (l) => packageValue(l) || EST_TICKET;
const fmtLakh = (n) => fmtShortINR(n);

function stuckDays(l, consults, now) {
  const limit = STUCK_LIMITS[l.stage];
  if (!limit) return 0;
  if (l.stage === "Consult booked") {
    const past = consults.filter((c) => c.leadId === l.id && c.status === "scheduled" && c.start < now).sort((a, b) => b.start - a.start)[0];
    if (!past) return 0;
    const over = Math.floor((now - past.start) / DAY);
    return over >= limit ? over : 0;
  }
  const since = l.stageSince || l.createdAt;
  const d = Math.floor((now - since) / DAY);
  return d > limit ? d : 0;
}

// ---------- Pipeline cards (Pivora-style) ----------
const STAGE_BAR = { New: "#A8A29E", Qualified: "#14B8A6", "Consult booked": "#3B82F6", "Consult done": "#F59E0B", "Payment pending": "#F97316", Won: "#10B981" };
// Colour is reserved for urgency: only High priority gets a tint; package and source stay neutral
const PRIORITY_TAG = { High: "bg-ink text-white", Medium: "bg-surface-hover text-ink-2", Low: "bg-surface-hover text-ink-3" };
const priorityOf = (l) => leadPriority(l);
const PIPE_FIELDS = [
  ["priority", "Priority"],
  ["package", "Package"],
  ["source", "Source icon"],
  ["status", "Next step"],
  ["value", "Value"],
  ["date", "Key date"],
  ["timeline", "Care timeline"],
];
const PIPE_SORTS = [
  ["stuck", "Stuck first"],
  ["value", "Highest value"],
  ["newest", "Newest in stage"],
  ["manual", "Manual (drag order)"],
];
const Tag2 = ({ cls, children }) => <span className={`inline-flex items-center h-[22px] rounded-md px-2 text-small font-medium leading-none whitespace-nowrap ${cls}`}>{children}</span>;

function pipeStatus(l, consults, now) {
  const consult = consults.filter((c) => c.leadId === l.id && c.status === "scheduled" && c.start > now).sort((a, b) => a.start - b.start)[0];
  if (l.stage === "Won") return { text: `Paid · ${l.package || "care plan"} confirmed`, tone: "text-ink-3" };
  if (l.needsReply) return { text: "Unread WhatsApp · reply now", tone: "text-red-700" };
  if (consult) return { text: `Consult ${dayDiff(consult.start, now) === 0 ? "today" : dayDiff(consult.start, now) === 1 ? "tomorrow" : fmtDay(consult.start)}, ${fmtTime(consult.start)}`, tone: "text-ink-3" };
  if (l.paymentStatus === "Link sent") return { text: `Payment link ${l.paymentLinkOpened ? "opened, not paid" : "sent, not opened"}`, tone: "text-ink-3" };
  if (l.nextFollowUp && dayDiff(l.nextFollowUp, now) < 0) return { text: `Follow-up ${-dayDiff(l.nextFollowUp, now)}d late · ${l.nextAction || NEXT_ACTION_BY_STAGE[l.stage] || "call"}`, tone: "text-red-700" };
  return { text: l.nextAction || NEXT_ACTION_BY_STAGE[l.stage] || "Follow up", tone: "text-ink-3" };
}

function PipeCard({ l, consults, now, fields, active, lifted }) {
  const stuck = stuckDays(l, consults, now);
  const st = pipeStatus(l, consults, now);
  const pr = priorityOf(l);
  const value = l.stage === "Won" ? l.amountPaid || packageValue(l) : packageValue(l);
  const born = l.careKind === "B";
  const keyDate = born ? (l.babyDob ? `Born ${fmtShortDate(l.babyDob)}` : "Born") : l.dueDate ? `Due ${fmtShortDate(l.dueDate)}` : "Expecting";
  return (
    <div
      className={`rounded-xl border bg-white px-3.5 pt-3 pb-3 select-none ${
        lifted
          ? "border-line-control shadow-[0_22px_48px_-14px_rgba(16,24,40,0.28),0_4px_10px_rgba(16,24,40,0.06)]"
          : active
            ? "border-brand shadow-[0_0_0_1px_#B4436C]"
            : "border-line-control shadow-xs group-hover/card:border-line-strong group-hover/card:shadow-raise"
      } transition-[border-color,box-shadow] duration-150`}
    >
      <div className="flex items-center gap-1.5 min-h-[22px]">
        {fields.priority && <Tag2 cls={PRIORITY_TAG[pr]}>{pr}</Tag2>}
        {fields.package && <span className={`text-small whitespace-nowrap ${l.package ? "text-ink-3" : "text-ink-4"}`}>{l.package || "No package"}</span>}
        <span className="ml-auto flex items-center gap-1.5">
          {stuck > 0 && <span title={`Stuck ${stuck} days in ${l.stage}`} className="inline-flex items-center gap-1 h-[22px] rounded-md px-1.5 text-caption font-medium text-red-700 bg-red-50 tabular-nums"><AlertTriangle className="h-3 w-3" />{stuck}d</span>}
          {l.unread > 0 && <span title={`${l.unread} unread on WhatsApp`} className="inline-flex items-center gap-1 text-small text-ink-4 tabular-nums"><MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />{l.unread}</span>}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2 min-w-0">
        {fields.source && (
          <span title={l.source} className="shrink-0 flex text-ink-placeholder">
            <SourceIcon source={l.source} />
          </span>
        )}
        <span className="truncate text-body-lg font-semibold text-ink tracking-[-0.005em]">{l.name}</span>
      </div>
      {fields.status && <div className={`mt-1 text-small truncate ${st.tone}`}>{st.text}</div>}
      {fields.timeline && <CareTimeline lead={l} now={now} compact />}
      {(fields.value || fields.date) && (
        <div className="mt-3 pt-2.5 border-t border-line-subtle flex items-center gap-2 text-small tabular-nums min-w-0">
          {fields.value && (value ? <span className="font-medium text-ink-2">{fmtINR(value)}</span> : <span className="text-ink-4">{fmtINR(EST_TICKET)} est.</span>)}
          {fields.value && fields.date && <span className="h-1 w-1 rounded-full bg-line-heavy shrink-0" />}
          {fields.date && <span className="text-ink-4 truncate">{keyDate}</span>}
        </div>
      )}
    </div>
  );
}

const ToolbarButton = ({ children, active, primary, ...p }) => (
  <button
    {...p}
    className={`h-8 rounded-md border px-3 inline-flex items-center gap-1.5 text-body transition-colors duration-150 ${
      primary ? "border-transparent bg-ink font-medium text-white hover:bg-black" : active ? "border-line-heavy bg-surface-hover text-ink" : "border-line-control bg-white text-ink-2 hover:border-line-heavy hover:bg-surface-subtle"
    }`}
  >
    {children}
  </button>
);

// FLIP: animate cards sliding to their new position whenever the board re-lays out
function useCardFlip(rootRef) {
  const prev = useRef(new Map());
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const next = new Map();
    root.querySelectorAll("[data-flip]").forEach((n) => {
      const key = n.dataset.flip;
      const pos = { col: n.dataset.col, top: n.offsetTop };
      next.set(key, pos);
      const p = prev.current.get(key);
      if (p && p.col === pos.col && Math.abs(p.top - pos.top) > 1) {
        // Cards run an entrance animation on the wrapper, so slide the inner card instead
        const t = n.hasAttribute("data-flip-inner") ? n.firstElementChild : n;
        t.style.transition = "none";
        t.style.transform = `translateY(${p.top - pos.top}px)`;
        requestAnimationFrame(() => {
          t.style.transition = "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)";
          t.style.transform = "";
        });
      }
    });
    prev.current = next;
  });
}

function PipelinePage({ leads, setLeads, consults, now, showToast, dismissToast, setTimelines, onOpenRecord, onAddLead, onOpenTable }) {
  const [prio, setPrio] = useState("All");
  const [care, setCare] = useState("All");
  const [source, setSource] = useState("All");
  const [pkg, setPkg] = useState("All");
  const [menu, setMenu] = useState(null);
  const [pending, setPending] = useState(null); // { ids, stage }
  const [panelId, setPanelId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fields, setFields] = useState({ priority: true, package: true, source: true, status: true, value: true, date: true, timeline: true });
  const [collapsedCols, setCollapsedCols] = useState({});
  const [colSort, setColSort] = useState({});
  const [order, setOrder] = useState({}); // stage -> ids (manual order)
  const [drag, setDrag] = useState(null); // { id, from, w, h, offX, offY, x, y, overStage, overIndex, zone, phase, tx, ty }
  const dragRef = useRef(null);
  const pressRef = useRef(null);
  const boardRef = useRef(null);
  const colRefs = useRef({});
  const listRefs = useRef({});
  const zoneRefs = useRef({});
  const phRef = useRef(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  useCardFlip(boardRef);

  useEffect(() => {
    const k = (e) => {
      if (e.key !== "Escape" || pending || menu) return;
      if (dragRef.current) return cancelDrag();
      if (panelId) setPanelId(null);
      else if (searchOpen) { setSearchOpen(false); setQuery(""); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const q = query.trim().toLowerCase();
  const passes = (l) =>
    (prio === "All" || leadPriority(l) === prio) &&
    (care === "All" || (care === "Born" ? l.careKind === "B" : l.careKind === "P")) &&
    (source === "All" || l.source === source) &&
    (pkg === "All" || (pkg === "None" ? !l.package : l.package === pkg)) &&
    (!q || l.name.toLowerCase().includes(q) || (l.hospital || "").toLowerCase().includes(q));
  const visible = leads.filter(passes);
  const open = visible.filter((l) => PIPE_COLUMNS.includes(l.stage));
  const openValue = open.reduce((s, l) => s + leadValue(l), 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const wonMonth = visible.filter((l) => l.stage === "Won" && (l.customerSince || l.stageSince || l.createdAt) >= monthStart);
  const filterCount = [prio, care, source, pkg].filter((v) => v !== "All").length;
  const hiddenFields = PIPE_FIELDS.filter(([k]) => !fields[k]).length;
  const columns = [...PIPE_COLUMNS, "Won"];

  const sortCards = (cards, stage) => {
    const s = colSort[stage] || "stuck";
    const base = [...cards].sort((a, b) =>
      s === "value" ? leadValue(b) - leadValue(a) : s === "newest" ? (b.stageSince || b.createdAt) - (a.stageSince || a.createdAt) : stuckDays(b, consults, now) - stuckDays(a, consults, now) || (a.stageSince || a.createdAt) - (b.stageSince || b.createdAt)
    );
    if (s !== "manual" || !order[stage]) return base;
    const idx = (l) => { const i = order[stage].indexOf(l.id); return i === -1 ? 1e6 + base.indexOf(l) : i; };
    return base.sort((a, b) => idx(a) - idx(b));
  };
  const cardsFor = (stage) => sortCards(stage === "Won" ? wonMonth : open.filter((l) => l.stage === stage), stage);

  const move = (id, to, extra = {}) => {
    const l = leads.find((x) => x.id === id);
    if (!l || l.stage === to) return;
    const snapshot = { ...l };
    const evId = uid();
    setLeads((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              stage: to,
              prevStage: to === "Lost" || to === "Deferred" ? (PIPELINE.includes(x.stage) ? x.stage : x.prevStage) : null,
              lostReason: to === "Lost" ? extra.lostReason : null,
              deferredUntil: to === "Deferred" ? extra.deferredUntil : null,
              deferNote: to === "Deferred" ? extra.deferNote || "" : "",
              nextAction: NEXT_ACTION_BY_STAGE[to] || null,
              stageSince: new Date(),
              ...(to === "Deferred" ? { nextFollowUp: extra.deferredUntil, needsReply: false } : {}),
              ...(to === "Lost" || to === "Won" ? { nextFollowUp: null, needsReply: false } : {}),
            }
          : x
      )
    );
    setTimelines((t) => ({
      ...t,
      [id]: [
        { id: evId, type: "stage", from: l.stage, to, by: ME, at: new Date(), extra: to === "Lost" ? extra.lostReason : to === "Deferred" ? [extra.deferredUntil && `Until ${fmtShortDate(extra.deferredUntil)}`, extra.deferNote].filter(Boolean).join(" · ") : null },
        ...(t[id] || buildTimeline(l)),
      ],
    }));
    showToast(to === "Won" ? `${l.name} is now a paid customer` : `${l.name} moved to ${to}`, () => {
      setLeads((prev) => prev.map((x) => (x.id === id ? snapshot : x)));
      setTimelines((t) => ({ ...t, [id]: (t[id] || []).filter((e) => e.id !== evId) }));
      dismissToast();
    });
  };

  /* ----- Pointer drag: lift, tilt, follow, make room, settle ----- */
  const setDragBoth = (d) => {
    dragRef.current = d;
    setDrag(d);
  };
  const hitTest = (x, y, d) => {
    for (const z of ["Deferred", "Lost"]) {
      const r = zoneRefs.current[z]?.getBoundingClientRect();
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { zone: z, overStage: null, overIndex: 0 };
    }
    for (const stage of columns) {
      const el = colRefs.current[stage];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right) continue;
      const list = listRefs.current[stage];
      let idx = 0;
      if (list) {
        const cards = [...list.querySelectorAll("[data-card]")].filter((n) => n.dataset.card !== d.id);
        idx = cards.length;
        for (let i = 0; i < cards.length; i++) {
          const cr = cards[i].getBoundingClientRect();
          if (y < cr.top + cr.height / 2) { idx = i; break; }
        }
      }
      return { zone: null, overStage: stage, overIndex: idx };
    }
    return { zone: null, overStage: null, overIndex: 0 };
  };
  const onPointerMove = (e) => {
    const press = pressRef.current;
    if (!press) return;
    let d = dragRef.current;
    if (!d) {
      // Touch: a quick swipe scrolls; only a press-and-hold picks the card up
      if (press.touch && !press.armed) {
        if (Math.hypot(e.clientX - press.sx, e.clientY - press.sy) > 8) abortRef.current?.(true);
        return;
      }
      if (!press.armed && Math.hypot(e.clientX - press.sx, e.clientY - press.sy) < 5) return;
      const r = press.el.getBoundingClientRect();
      d = { id: press.id, from: press.stage, w: r.width, h: r.height, offX: press.sx - r.left, offY: press.sy - r.top, ox: r.left, oy: r.top, phase: "drag", overStage: press.stage, overIndex: press.index, zone: null };
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    }
    const hit = hitTest(e.clientX, e.clientY, d);
    // Nudge the board sideways near its edges
    const br = boardRef.current?.getBoundingClientRect();
    if (br) {
      if (e.clientX > br.right - 70) boardRef.current.scrollLeft += 16;
      else if (e.clientX < br.left + 70) boardRef.current.scrollLeft -= 16;
    }
    setDragBoth({ ...d, x: e.clientX, y: e.clientY, ...hit });
  };
  const finishDrag = () => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setDragBoth(null);
  };
  const cancelDrag = () => {
    const d = dragRef.current;
    if (!d) return;
    setDragBoth({ ...d, phase: "drop", tx: d.ox, ty: d.oy, overStage: d.from, zone: null });
    setTimeout(finishDrag, 220);
  };
  const onPointerUp = () => {
    const press = pressRef.current;
    pressRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    abortRef.current?.();
    const d = dragRef.current;
    if (!d) {
      if (press) setPanelId(press.id); // a click, not a drag
      return;
    }
    if (d.zone) {
      finishDrag();
      setPending({ ids: [d.id], stage: d.zone });
      return;
    }
    if (!d.overStage || collapsedCols[d.overStage]) {
      if (d.overStage && d.overStage !== d.from) { finishDrag(); move(d.id, d.overStage); return; }
      return cancelDrag();
    }
    const ph = phRef.current?.getBoundingClientRect();
    setDragBoth({ ...d, phase: "drop", tx: ph ? ph.left : d.ox, ty: ph ? ph.top : d.oy });
    setTimeout(() => {
      const ids = cardsFor(d.overStage).map((l) => l.id).filter((x) => x !== d.id);
      ids.splice(d.overIndex, 0, d.id);
      const sameSpot = d.overStage === d.from && cardsFor(d.from).map((l) => l.id).indexOf(d.id) === d.overIndex;
      if (!sameSpot) {
        setOrder((o) => ({ ...o, [d.overStage]: ids }));
        setColSort((s) => ({ ...s, [d.overStage]: "manual" }));
      }
      if (d.overStage !== d.from) move(d.id, d.overStage);
      finishDrag();
    }, 230);
  };
  // A drag can be interrupted: the browser takes the touch to scroll, the window loses focus, or Esc.
  // Each puts the card back where it was so the next drag works.
  const abortRef = useRef(null);
  const COL_PAGE = 30;
  const [colLimit, setColLimit] = useState({});
  const onCardPointerDown = (e, l, stage, index) => {
    if (e.button !== 0 || dragRef.current) return;
    const press = { id: l.id, stage, index, sx: e.clientX, sy: e.clientY, el: e.currentTarget, touch: e.pointerType === "touch", armed: false };
    pressRef.current = press;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    // While a touch drag is live, stop the page from scrolling under the finger
    const blockScroll = (ev) => { if (press.armed) ev.preventDefault(); };
    let holdTimer = null;
    if (press.touch) {
      // Also on the card itself: once lifted, the card element leaves the page, and touch events keep going to it
      window.addEventListener("touchmove", blockScroll, { passive: false });
      press.el.addEventListener("touchmove", blockScroll, { passive: false });
      holdTimer = setTimeout(() => {
        if (pressRef.current !== press) return;
        press.armed = true;
        navigator.vibrate?.(8);
        onPointerMove({ clientX: press.sx, clientY: press.sy });
      }, 320);
    }
    const interrupt = (quiet) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      cleanup();
      pressRef.current = null;
      if (dragRef.current) cancelDrag();
      else { document.body.style.cursor = ""; document.body.style.userSelect = ""; }
    };
    const onKey = (ev) => { if (ev.key === "Escape" && dragRef.current) { ev.stopPropagation(); interrupt(); } };
    const cleanup = () => {
      clearTimeout(holdTimer);
      window.removeEventListener("touchmove", blockScroll);
      press.el.removeEventListener("touchmove", blockScroll);
      window.removeEventListener("pointercancel", interrupt);
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("keydown", onKey, true);
      abortRef.current = null;
    };
    window.addEventListener("pointercancel", interrupt);
    window.addEventListener("blur", interrupt);
    window.addEventListener("keydown", onKey, true);
    abortRef.current = (scrolling) => (scrolling === true ? interrupt(true) : cleanup());
  };
  useEffect(() => () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    abortRef.current?.();
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const chip = (label, value, key, options) => (
    <button
      onClick={(e) => setMenu(menu?.key === key ? null : { key, anchor: e.currentTarget, options })}
      className={`h-7 rounded-lg border px-2.5 text-small inline-flex items-center gap-1 transition-colors duration-150 ${value !== "All" ? "border-line-strong bg-surface-hover text-ink" : "border-line-control text-ink-3 hover:text-ink hover:border-line-strong"}`}
    >
      <span className="text-ink-4">{label}</span> {value}
      <ChevronDown className="h-3 w-3 text-ink-4" />
    </button>
  );
  const setters = { prio: setPrio, care: setCare, source: setSource, pkg: setPkg };
  const values = { prio, care, source, pkg };
  const dragging = drag && drag.phase === "drag";
  const draggedLead = drag ? leads.find((l) => l.id === drag.id) : null;

  return (
    <div className="flex flex-col h-[calc(100dvh-48px)] md:h-[100dvh] bg-white">
      {/* Title row */}
      <div className="cw-fade-in shrink-0 px-5 md:px-8 pt-8 md:pt-10 pb-4 flex items-center gap-4 flex-wrap">
        <h1 className="text-h1 font-medium tracking-[-0.01em] flex items-baseline gap-2">
          Pipeline <span className="text-title-sm font-normal text-ink-4 tabular-nums">{open.length} open · {fmtLakh(openValue)}</span>
        </h1>
        <div className="ml-auto">
          {searchOpen ? (
            <div className="h-8 w-56 rounded-md border border-line-heavy bg-white pl-2.5 pr-1 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-ink-4" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads or hospital" className="min-w-0 flex-1 text-body outline-none placeholder:text-ink-placeholder" />
              <button onClick={() => { setSearchOpen(false); setQuery(""); }} aria-label="Close search" className="h-6 w-6 rounded-md flex items-center justify-center text-ink-4 hover:bg-surface-hover"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <button onClick={() => setSearchOpen(true)} aria-label="Search cards" className="h-8 rounded-md border border-line-control px-2.5 inline-flex items-center gap-1.5 text-small text-ink-4 hover:border-line-heavy hover:text-ink">
              <Search className="h-3.5 w-3.5" /> Search
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 px-5 md:px-8 py-2.5 flex items-center gap-2 border-b border-line-subtle flex-wrap">
        <ToolbarButton active={showFilters || filterCount > 0} onClick={() => setShowFilters((s) => !s)}>
          <ListFilter className="h-3.5 w-3.5" /> Filter{filterCount > 0 && <span className="tabular-nums text-ink-4">· {filterCount}</span>}
        </ToolbarButton>
        <ToolbarButton active={menu?.key === "sortAll"} onClick={(e) => setMenu(menu?.key === "sortAll" ? null : { key: "sortAll", anchor: e.currentTarget })}>
          <ArrowUpDown className="h-3.5 w-3.5" /> Sort
        </ToolbarButton>
        <ToolbarButton active={menu?.key === "fields"} onClick={(e) => setMenu(menu?.key === "fields" ? null : { key: "fields", anchor: e.currentTarget })}>
          <EyeOff className="h-3.5 w-3.5" /> Fields{hiddenFields > 0 && <span className="tabular-nums text-ink-4">· {hiddenFields} hidden</span>}
        </ToolbarButton>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden md:inline-flex"><ToolbarButton onClick={onOpenTable}><Table2 className="h-3.5 w-3.5" /> Table</ToolbarButton></span>
          <span className="hidden md:inline-flex"><ToolbarButton onClick={() => showToast(`WhatsApp template ready for ${open.length} leads in this view`)}><WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp all</ToolbarButton></span>
          <ToolbarButton primary onClick={onAddLead}><Plus className="h-3.5 w-3.5" /> New lead</ToolbarButton>
        </div>
      </div>

      {(showFilters || filterCount > 0) && (
        <div className="shrink-0 px-5 md:px-8 py-2.5 flex items-center gap-1.5 flex-wrap border-b border-line-subtle">
          {chip("Priority", prio, "prio", ["All", ...PRIORITIES])}
          {chip("Care stage", care, "care", ["All", "Born", "Expecting"])}
          {chip("Source", source, "source", ["All", ...SOURCES])}
          {chip("Package", pkg, "pkg", ["All", ...PACKAGE_OPTIONS, "None"])}
          {filterCount > 0 && <button onClick={() => { setPrio("All"); setCare("All"); setSource("All"); setPkg("All"); }} className="h-7 px-2 text-small text-ink-4 hover:text-ink">Clear</button>}
        </div>
      )}

      {/* Board */}
      <div ref={boardRef} className="flex-1 min-h-0 overflow-x-auto bg-white snap-x snap-mandatory scroll-px-5 md:snap-none">
        <p id="cw-pipe-hint" className="sr-only">Press Enter to open. Press Alt with the left or right arrow to move to the next stage.</p>
        <div className="h-full flex gap-3.5 px-5 md:px-8 py-4 w-max">
          {columns.map((stage, ci) => {
            const isWon = stage === "Won";
            const all = cardsFor(stage);
            const limit = colLimit[stage] || COL_PAGE;
            const cards = (drag ? all.filter((l) => l.id !== drag.id) : all).slice(0, limit);
            const hiddenCards = all.length - (drag && all.some((l) => l.id === drag.id) ? 1 : 0) - cards.length;
            const value = all.reduce((s, l) => s + (isWon ? l.amountPaid || leadValue(l) : leadValue(l)), 0);
            const showPh = drag && !drag.zone && drag.overStage === stage && !collapsedCols[stage];
            const label = isWon ? "Won · this month" : stage;
            if (collapsedCols[stage])
              return (
                <div
                  key={stage}
                  ref={(el) => (colRefs.current[stage] = el)}
                  onClick={() => setCollapsedCols((c) => ({ ...c, [stage]: false }))}
                  title={`Show ${label}`}
                  className={`w-11 shrink-0 rounded-xl flex flex-col items-center gap-2 pt-3 cursor-pointer transition-colors duration-150 ${drag?.overStage === stage ? "bg-surface-active" : "bg-surface-sidebar hover:bg-surface-hover"}`}
                >
                  <span className="text-small text-ink-4 tabular-nums">{all.length}</span>
                  <span className="h-3.5 w-[3px] rounded-full" style={{ backgroundColor: STAGE_BAR[stage] }} />
                  <span className="[writing-mode:vertical-rl] rotate-180 text-small text-ink-2">{label}</span>
                </div>
              );
            return (
              <div
                key={stage}
                ref={(el) => (colRefs.current[stage] = el)}
                className={`group/col w-[calc(100vw-64px)] max-w-[320px] md:w-[288px] snap-start shrink-0 min-h-0 flex flex-col rounded-xl transition-colors duration-200 ${showPh && drag.from !== stage ? "bg-surface-hover" : "bg-surface-sidebar"}`}
              >
                <div className="h-11 shrink-0 flex items-center gap-1.5 pl-2 pr-2.5">
                  <GripVertical className="h-3.5 w-3.5 text-ink-4" />
                  <span className="h-3.5 w-[3px] rounded-full" style={{ backgroundColor: STAGE_BAR[stage] }} />
                  <span className="text-body font-medium text-ink truncate">{label}</span>
                  <span className="ml-auto text-small text-ink-4 tabular-nums opacity-0 group-hover/col:opacity-100 transition-opacity duration-150">{fmtLakh(value)}</span>
                  <button onClick={(e) => setMenu(menu?.key === `col-${stage}` ? null : { key: `col-${stage}`, anchor: e.currentTarget, stage })} aria-label={`${stage} options`} className="h-6 w-6 -mr-1 rounded-md flex items-center justify-center text-ink-4 opacity-0 group-hover/col:opacity-100 hover:bg-surface-active hover:text-ink transition-opacity duration-150"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                  <span className="text-small text-ink-2 tabular-nums min-w-[14px] text-right">{all.length}</span>
                </div>
                <div ref={(el) => (listRefs.current[stage] = el)} className="relative flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-2">
                  {(() => {
                    const out = [];
                    cards.forEach((l, i) => {
                      if (showPh && drag.overIndex === i) out.push(<div key="__ph" ref={phRef} data-flip="__ph" data-col={stage} className="cw-ph rounded-xl border border-dashed border-line-strong bg-surface-active/70" style={{ height: drag.h }} />);
                      out.push(
                        <div
                          key={l.id}
                          data-card={l.id}
                          data-flip={l.id}
                          data-flip-inner=""
                          data-col={stage}
                          onPointerDown={(e) => onCardPointerDown(e, l, stage, i)}
                          onDragStart={(e) => e.preventDefault()}
                          onContextMenu={(e) => { if (pressRef.current?.touch) e.preventDefault(); }}
                          draggable={false}
                          tabIndex={0}
                          role="button"
                          aria-describedby="cw-pipe-hint"
                          aria-keyshortcuts="Enter Alt+ArrowLeft Alt+ArrowRight"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPanelId(l.id); return; }
                            if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft") && stage !== "Won") {
                              e.preventDefault();
                              const ci2 = columns.indexOf(stage) + (e.key === "ArrowRight" ? 1 : -1);
                              const to = columns[ci2];
                              if (to && to !== "Won") { move(l.id, to); setTimeout(() => document.querySelector(`[data-card="${l.id}"]`)?.focus(), 60); }
                            }
                          }}
                          className="group/card cw-card-in cursor-grab touch-pan-x touch-pan-y select-none [-webkit-touch-callout:none] rounded-xl focus-visible:outline-offset-2"
                          style={{ animationDelay: `${Math.min(ci * 40 + i * 40, 280)}ms` }}
                        >
                          <PipeCard l={l} consults={consults} now={now} fields={fields} active={panelId === l.id} />
                        </div>
                      );
                    });
                    if (hiddenCards > 0) out.push(
                      <button key="__more" onClick={() => setColLimit((m) => ({ ...m, [stage]: limit + COL_PAGE }))} className="w-full h-8 rounded-lg text-small text-ink-3 hover:bg-surface-active hover:text-ink transition-colors duration-150">
                        Show {Math.min(COL_PAGE, hiddenCards)} more · {hiddenCards} hidden
                      </button>
                    );
                    if (showPh && drag.overIndex >= cards.length) out.push(<div key="__ph" ref={phRef} data-flip="__ph" data-col={stage} className="cw-ph rounded-xl border border-dashed border-line-strong bg-surface-active/70" style={{ height: drag.h }} />);
                    return out;
                  })()}
                  {!isWon && (
                    <button data-flip={`add-${stage}`} data-col={stage} onClick={onAddLead} className="w-full h-9 rounded-lg text-small text-ink-3 inline-flex items-center justify-center gap-1.5 bg-surface-hover/70 hover:bg-surface-active hover:text-ink transition-colors duration-150">
                      <Plus className="h-3.5 w-3.5" /> Add lead
                    </button>
                  )}
                  {isWon && cards.length === 0 && !showPh && <div className="h-20 rounded-xl border border-dashed border-line-strong flex items-center justify-center text-small text-ink-4">Drop here when paid</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating card under the cursor */}
      {drag && draggedLead && (
        <div
          className="fixed z-[90] pointer-events-none"
          style={{
            left: drag.phase === "drop" ? drag.tx : drag.x - drag.offX,
            top: drag.phase === "drop" ? drag.ty : drag.y - drag.offY,
            width: drag.w,
            transform: drag.phase === "drop" ? "rotate(0deg) scale(1)" : "rotate(-3deg) scale(1.03)",
            transition: drag.phase === "drop" ? "left 220ms cubic-bezier(0.22,1,0.36,1), top 220ms cubic-bezier(0.22,1,0.36,1), transform 220ms cubic-bezier(0.22,1,0.36,1)" : "transform 160ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <PipeCard l={draggedLead} consults={consults} now={now} fields={fields} lifted={drag.phase === "drag"} />
        </div>
      )}

      {/* Defer / Lost targets appear only while dragging */}
      <div className={`pointer-events-none fixed bottom-6 left-1/2 md:left-[calc(50%+130px)] -translate-x-1/2 z-[85] flex gap-3 transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] ${dragging ? "opacity-100 translate-y-0 duration-[250ms]" : "opacity-0 translate-y-2 duration-150"}`}>
        {[
          { stage: "Deferred", label: "Defer", sub: "pick a return date", Icon: PauseCircle, on: "border-line-heavy bg-surface-active text-ink-2 scale-[1.03]" },
          { stage: "Lost", label: "Lost", sub: "pick a reason", Icon: CircleX, on: "border-red-400 bg-red-50 text-red-700 scale-[1.03]" },
        ].map(({ stage, label, sub, Icon, on }) => (
          <div
            key={stage}
            ref={(el) => (zoneRefs.current[stage] = el)}
            className={`h-14 w-56 rounded-xl border border-dashed px-4 flex items-center gap-3 bg-white shadow-lift transition-[border-color,background-color,color,transform] duration-150 ${drag?.zone === stage ? on : "border-line-strong text-ink-2"}`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <div>
              <div className="text-body font-medium">{label}</div>
              <div className="text-caption text-ink-4">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {menu && (
        <FixedMenu anchor={menu.anchor} onClose={closeMenu} width={menu.key === "fields" ? 220 : 210}>
          {menu.key === "fields" ? (
            <>
              <div className="px-2 pt-1 pb-1.5 text-caption text-ink-4">Show on cards</div>
              {PIPE_FIELDS.map(([k, label]) => (
                <MenuItem key={k} onClick={() => setFields((f) => ({ ...f, [k]: !f[k] }))}>
                  <span className="flex-1">{label}</span>
                  {fields[k] ? <Check className="h-3.5 w-3.5 text-ink" /> : <EyeOff className="h-3.5 w-3.5 text-ink-faint" />}
                </MenuItem>
              ))}
            </>
          ) : menu.key === "sortAll" || menu.key.startsWith("col-") ? (
            <>
              <div className="px-2 pt-1 pb-1.5 text-caption text-ink-4">{menu.key === "sortAll" ? "Sort every column" : "Sort cards"}</div>
              {PIPE_SORTS.map(([k, label]) => {
                const cur = menu.key === "sortAll" ? null : colSort[menu.stage] || "stuck";
                return (
                  <MenuItem key={k} onClick={() => { if (menu.key === "sortAll") setColSort(Object.fromEntries(columns.map((c) => [c, k]))); else setColSort((s) => ({ ...s, [menu.stage]: k })); closeMenu(); }}>
                    <span className="flex-1">{label}</span>
                    {cur === k && <Check className="h-3.5 w-3.5 text-ink-3" />}
                  </MenuItem>
                );
              })}
              {menu.key.startsWith("col-") && (
                <>
                  <div className="my-1 h-px bg-surface-hover" />
                  <MenuItem onClick={() => { setCollapsedCols((c) => ({ ...c, [menu.stage]: true })); closeMenu(); }}><span className="flex-1">Collapse column</span></MenuItem>
                </>
              )}
            </>
          ) : (
            menu.options.map((o) => (
              <MenuItem key={o} onClick={() => { setters[menu.key](o); closeMenu(); }}>
                {menu.key === "source" && o !== "All" && <span className="text-ink-4"><SourceIcon source={o} /></span>}
                <span className="flex-1">{o}</span>
                {values[menu.key] === o && <Check className="h-3.5 w-3.5 text-ink-3" />}
              </MenuItem>
            ))
          )}
        </FixedMenu>
      )}

      {pending && (
        <StageExtraModal
          pending={pending}
          count={1}
          onCancel={() => setPending(null)}
          onConfirm={(extra) => {
            move(pending.ids[0], pending.stage, extra);
            setPending(null);
          }}
        />
      )}

      <LeadPanel
        lead={panelId ? leads.find((l) => l.id === panelId) : null}
        now={now}
        onClose={() => setPanelId(null)}
        onSnooze={(l, d) => setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, nextFollowUp: d, needsReply: false } : x)))}
        onToast={showToast}
        onOpenRecord={(id) => { setPanelId(null); onOpenRecord(id); }}
      />
    </div>
  );
}

/* ==========================================================================
   REPORTS — synthetic sales history (seeded, ~13 months) + aggregations
   ========================================================================== */

const FUNNEL_STAGES = ["New", "Qualified", "Consult booked", "Consult done", "Payment pending", "Won"];
const CHART_INK = "#3A3A3A";
const CHART_TRACK = "#F1EFEA";

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickW = (rng, entries) => {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [v, w] of entries) {
    if ((r -= w) <= 0) return v;
  }
  return entries[entries.length - 1][0];
};

const SOURCE_MULT = { "Meta ad": 0.82, Instagram: 0.75, WhatsApp: 1, Website: 1, "Hospital referral": 1.55, Referral: 1.4 };
const EARLY_LOSS = [["Not responding", 45], ["Not needed", 15], ["Family will manage", 15], ["Price", 10], ["Chose competitor", 5], ["Other", 10]];
const OBJECTION_W = [["Price", 40], ["Family help available", 25], ["Caregiver preference", 15], ["Timing", 20], ["Trust", 10]];
const PKG_PRICE = { Essential: 42000, Together: 126000, Complete: 252000 };

// Report rows built from real leads: one row per lead, with the time it entered each stage
// (from its timeline), its outcome, consult and revenue. The app root sets REPORT_INPUT.
const REPORT_INPUT = { leads: [], consults: [], timelines: {}, version: 0 };
function buildReportData() {
  const { leads, consults, timelines } = REPORT_INPUT;
  const consultsBy = {};
  consults.forEach((c) => (consultsBy[c.leadId] ||= []).push(c));
  return leads.map((l) => {
    const created = l.createdAt.getTime();
    const evs = timelines[l.id] || SEED_TIMELINES[l.id] || [];
    const at = { New: created };
    // Earliest time the lead entered each stage
    evs.filter((e) => e.type === "stage" && e.to && e.at).forEach((e) => {
      const t = e.at.getTime();
      if (at[e.to] == null || t < at[e.to]) at[e.to] = t;
    });
    const since = (l.stageSince || l.createdAt).getTime();
    if (at[l.stage] == null) at[l.stage] = since;
    // A lead that reached a later stage has passed the earlier ones: back-fill missing steps
    const reached = l.stage === "Lost" || l.stage === "Deferred" ? l.prevStage : l.stage;
    const ri = FUNNEL_STAGES.indexOf(reached);
    for (let i = ri - 1; i >= 1; i--) if (at[FUNNEL_STAGES[i]] == null) at[FUNNEL_STAGES[i]] = at[FUNNEL_STAGES[i + 1]] ?? since;

    const babyDays = l.babyDob ? Math.floor((created - l.babyDob.getTime()) / DAY) : null;
    const hour = l.createdAt.getHours();
    const mine = (consultsBy[l.id] || []).filter((c) => c.status !== "cancelled").sort((a, b) => b.start - a.start);
    const c = mine[0];
    const r = {
      id: l.id,
      created,
      source: l.source || "Other",
      zone: l.zone || "Unknown",
      hospital: l.hospital || "Unknown",
      careKind: l.careKind,
      ageBand: l.careKind === "P" ? "Expecting" : babyDays == null ? "Unknown" : babyDays < 8 ? "0–7 days" : babyDays <= 30 ? "8–30 days" : babyDays <= 90 ? "1–3 months" : "3+ months",
      shift: l.shiftType || "Unknown",
      arrival: hour >= 20 || hour < 8 ? "Night (8 pm–8 am)" : "Day (8 am–8 pm)",
      pkg: l.package || "None",
      at,
      outcome: null,
      outcomeAt: null,
      consult: c ? { at: c.start.getTime(), show: c.status === "done", noShow: c.status === "noshow", objections: c.objections || [], paid: l.stage === "Won" } : undefined,
    };
    if (l.stage === "Won") {
      const wonAt = at.Won ?? (l.customerSince ? l.customerSince.getTime() : since);
      r.outcome = "won";
      r.outcomeAt = wonAt;
      r.daysToPaid = Math.max(0, (wonAt - created) / DAY);
      r.deferredBefore = 0;
      r.revenue = packageValue(l) || l.amountPaid || 0;
    } else if (l.stage === "Lost") {
      r.outcome = "lost";
      r.outcomeAt = since;
      r.lostReason = l.lostReason || "Other";
      r.lostStage = l.prevStage || "Qualified";
    } else if (l.stage === "Deferred") {
      r.outcome = "deferred";
      r.outcomeAt = since;
      r.lostStage = l.prevStage || "Qualified";
      r.deferDays = l.deferredUntil ? Math.max(0, Math.round((l.deferredUntil - since) / DAY)) : 30;
    }
    return r;
  });
}

let REPORT_DATA = null;
let REPORT_VERSION = -1;
const reportData = () => {
  if (!REPORT_DATA || REPORT_VERSION !== REPORT_INPUT.version) {
    REPORT_DATA = buildReportData();
    REPORT_VERSION = REPORT_INPUT.version;
  }
  return REPORT_DATA;
};

/* ---------- Aggregations ---------- */

const PERIODS = [
  { id: "today", label: "Today", days: 1 },
  { id: "week", label: "Week", days: 7 },
  { id: "month", label: "Month", days: 30 },
  { id: "quarter", label: "Quarter", days: 90 },
  { id: "year", label: "Year", days: 365 },
  { id: "custom", label: "Custom" },
];

const periodRange = (period, custom) => {
  const end = Date.now();
  if (period === "custom" && custom.from && custom.to) {
    const s = new Date(`${custom.from}T00:00:00`).getTime();
    const e = Math.min(end, new Date(`${custom.to}T23:59:59`).getTime());
    return { start: s, end: e };
  }
  const p = PERIODS.find((x) => x.id === period) || PERIODS[2];
  const start = period === "today" ? startOfDay(new Date()).getTime() : startOfDay(new Date(end - (p.days - 1) * DAY)).getTime();
  return { start, end };
};
const prevRange = ({ start, end }) => ({ start: start - (end - start), end: start });
const inRange = (t, r) => t != null && t >= r.start && t < r.end;

function kpis(rows, range) {
  const created = rows.filter((r) => inRange(r.created, range));
  const won = rows.filter((r) => r.outcome === "won" && inRange(r.outcomeAt, range));
  const revenue = won.reduce((s, r) => s + r.revenue, 0);
  // Flow-based: payments in the period ÷ leads in the period (a cohort measure undercounts recent periods)
  const bornWon = won.filter((r) => r.careKind === "B" && !(r.deferredBefore > 30));
  const avgDays = bornWon.length ? bornWon.reduce((s, r) => s + r.daysToPaid, 0) / bornWon.length : null;
  return { leads: created.length, won: won.length, revenue, conv: created.length ? (won.length / created.length) * 100 : 0, avgDays };
}

const fmtMoneyShort = (n) => fmtShortINR(n);
const pct = (n) => `${Math.round(n)}%`;

/* ---------- Small pieces ---------- */

function ChartTip({ active, payload, label, fmt, extra }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const more = extra ? extra(p.payload) : null;
  return (
    <div className="rounded-md bg-ink px-2.5 py-1.5 text-small text-white shadow-lg">
      <div className="text-white/60">{p.payload.name || label}</div>
      <div className="tabular-nums">{fmt ? fmt(p.value, p.payload) : p.value}</div>
      {more && <div className="mt-0.5 text-white/70 tabular-nums">{more}</div>}
    </div>
  );
}

// Bars sit a step back from the numbers; only the stage that matters is in the accent
const CHART_BAR = "#8A8680";

// Horizontal bars, one series. Bars are a quiet grey; one row can be picked out in the accent
// (with bold text too, so it never relies on colour alone).
// track: draw the 0–100% rail behind each bar. Only for percentages, where the rail means "the whole".
// avg: a hairline at the average, labelled, so each row reads as above or below it.
const CHART_TEXT = "#5C5C5C"; // ink-3
const CHART_VALUE = "#3A3A3A"; // ink-2
const CHART_GRID = "#C9C6C0"; // line-heavy
function HBars({ data, valueKey = "value", fmt, onClick, height, highlight, track = false, avg, avgLabel, tip }) {
  const h = height || Math.max(120, data.length * 34 + 10) + (avg != null ? 18 : 0);
  const isHi = (d) => !!(highlight && highlight(d));
  const Tick = ({ x, y, payload }) => {
    const d = data.find((r) => r.name === payload.value);
    const hi = d && isHi(d);
    return (
      <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill={hi ? "#1F1F1F" : CHART_TEXT} fontWeight={hi ? 600 : 400}>
        {payload.value}
      </text>
    );
  };
  const ValueLabel = ({ x, y, width, height: bh, value, index }) => {
    const hi = isHi(data[index]);
    return (
      <text x={x + width + 6} y={y + bh / 2} dy={4} fontSize={12} fill={hi ? "#1F1F1F" : CHART_VALUE} fontWeight={hi ? 600 : 400} style={{ fontVariantNumeric: "tabular-nums" }}>
        {fmt ? fmt(value) : value}
      </text>
    );
  };
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: avg != null ? 18 : 0, right: 48, bottom: 0, left: 0 }} barCategoryGap={10}>
          <XAxis type="number" hide domain={track ? [0, 100] : [0, "dataMax"]} />
          <YAxis type="category" dataKey="name" width={156} interval={0} tickLine={false} axisLine={false} tick={<Tick />} />
          <Tooltip cursor={{ fill: "#FAFAF8" }} content={<ChartTip fmt={fmt} extra={tip} />} />
          <Bar
            dataKey={valueKey}
            radius={[0, 4, 4, 0]}
            barSize={14}
            background={track ? { fill: CHART_TRACK, radius: 4 } : undefined}
            onClick={onClick ? (d) => onClick(d) : undefined}
            cursor={onClick ? "pointer" : undefined}
            label={<ValueLabel />}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={isHi(d) ? "#B4436C" : CHART_BAR} />
            ))}
          </Bar>
          {avg != null && (
            <ReferenceLine x={avg} stroke={CHART_GRID} strokeWidth={1} ifOverflow="extendDomain"
              label={{ value: avgLabel || `Avg ${fmt ? fmt(avg) : avg}`, position: "top", fontSize: 11, fill: CHART_TEXT }} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({ label, value, cur, prev, goodWhenUp = true, fmtDelta, first }) {
  let delta = null;
  if (prev != null && cur != null && prev !== 0) {
    let d = fmtDelta ? cur - prev : ((cur - prev) / prev) * 100;
    if (Math.abs(d) < (fmtDelta ? 0.05 : 0.5)) d = 0;
    const up = d > 0;
    const good = d === 0 ? null : up === goodWhenUp;
    delta = (
      <span className={good == null ? "text-ink-4" : good ? "text-emerald-700" : "text-red-700"}>
        {d === 0 ? "No change" : `${up ? "↑" : "↓"} ${fmtDelta ? fmtDelta(Math.abs(d)) : `${Math.abs(Math.round(d))}%`}`}
      </span>
    );
  }
  return (
    <div className={first ? "" : "md:border-l border-line md:pl-5"}>
      <div className="text-small leading-4 text-ink-4">{label}</div>
      <div className="mt-1.5 text-stat leading-none font-medium tracking-[-0.02em] tabular-nums">{value}</div>
      <div className="mt-2 text-small leading-4 tabular-nums">
        {delta || <span className="text-ink-4">—</span>} <span className="text-ink-4">vs previous</span>
      </div>
    </div>
  );
}

const Card = ({ title, right, children, className = "" }) => (
  <section className={className}>
    <div className="flex items-baseline gap-2 mb-3">
      <h2 className="text-body font-medium">{title}</h2>
      {right && <div className="ml-auto text-small text-ink-4">{right}</div>}
    </div>
    {children}
  </section>
);

function SimpleTable({ cols, rows, foot }) {
  return (
    <table className="w-full text-body border-separate border-spacing-0">
      <thead>
        <tr>
          {cols.map((c, i) => (
            <th key={c.key} className={`h-8 border-b border-line text-small leading-4 font-medium text-ink-4 ${i ? "text-right" : "text-left"} ${c.w || ""}`}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className="hover:bg-surface-subtle transition-colors duration-150">
            {cols.map((c, i) => (
              <td key={c.key} className={`h-9 border-b border-line-subtle tabular-nums ${i ? "text-right" : "text-left"} ${c.cls ? c.cls(r) : ""}`}>{c.render ? c.render(r) : r[c.key]}</td>
            ))}
          </tr>
        ))}
        {foot && (
          <tr>
            {cols.map((c, i) => (
              <td key={c.key} className={`h-9 tabular-nums font-medium ${i ? "text-right" : "text-left"}`}>{c.render ? c.render(foot) : foot[c.key]}</td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ---------- Page ---------- */

const SEGMENT_DIMS = [
  { id: "zone", label: "Zone" },
  { id: "hospital", label: "Hospital" },
  { id: "care", label: "Care stage", get: (r) => (r.careKind === "B" ? "Born" : "Expecting") },
  { id: "ageBand", label: "Baby age band" },
  { id: "shift", label: "Shift type" },
  { id: "arrival", label: "Day / night arrival" },
];

function ReportsPage({ onOpenLeads, followups }) {
  const [period, setPeriod] = useState("month");
  const [custom, setCustom] = useState(() => ({ from: toLocalInput(new Date(Date.now() - 13 * DAY)).slice(0, 10), to: toLocalInput(new Date()).slice(0, 10) }));
  const [tab, setTab] = useState("overview");
  const [dim, setDim] = useState("zone");

  const all = reportData();
  const rows = all;
  const range = useMemo(() => periodRange(period, custom), [period, custom]);
  const prev = prevRange(range);
  const days = Math.max(1, Math.round((range.end - range.start) / DAY));

  const cur = useMemo(() => kpis(rows, range), [rows, range]);
  const before = useMemo(() => kpis(rows, prev), [rows, prev.start]);
  const created = useMemo(() => rows.filter((r) => inRange(r.created, range)), [rows, range]);

  /* ----- funnel ----- */
  // Stage throughput: leads that entered each stage during the period
  const funnel = FUNNEL_STAGES.map((s) => ({ name: s, value: rows.filter((r) => inRange(r.at[s], range)).length }));
  let biggest = null;
  for (let i = 1; i < funnel.length; i++) {
    const a = funnel[i - 1].value;
    const drop = a ? (a - funnel[i].value) / a : 0;
    if (!biggest || drop > biggest.drop) biggest = { i, drop, from: funnel[i - 1].name, to: funnel[i].name };
  }
  const dropReasons = {};
  rows.filter((r) => r.lostStage === biggest?.from && r.outcome === "lost" && inRange(r.outcomeAt, range)).forEach((r) => (dropReasons[r.lostReason] = (dropReasons[r.lostReason] || 0) + 1));
  const topDropReason = Object.entries(dropReasons).sort((a, b) => b[1] - a[1])[0];

  /* ----- lost reasons ----- */
  const lostMap = {};
  rows.filter((r) => r.outcome === "lost" && inRange(r.outcomeAt, range)).forEach((r) => (lostMap[r.lostReason] = (lostMap[r.lostReason] || 0) + 1));
  const lost = Object.entries(lostMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  /* ----- by source ----- */
  const avgConv = cur.conv;
  const bySource = SOURCES.map((s) => {
    const c = created.filter((r) => r.source === s);
    const w = rows.filter((r) => r.source === s && r.outcome === "won" && inRange(r.outcomeAt, range));
    return { name: s, leads: c.length, won: w.length, conv: c.length ? (w.length / c.length) * 100 : 0, revenue: w.reduce((t, r) => t + r.revenue, 0) };
  }).sort((a, b) => b.leads - a.leads);

  /* ----- follow-ups on time (done in the period; late = completed after the day it was due) ----- */
  const fuStats = useMemo(() => {
    const list = followups || [];
    const doneList = list.filter((f) => f.status === "done" && f.completedAt && inRange(f.completedAt.getTime(), range));
    const late = doneList.filter((f) => f.due && dayDiff(f.completedAt, f.due) > 0).length;
    const overdue = list.filter((f) => f.status === "open" && dayDiff(f.due, new Date()) < 0).length;
    return { done: doneList.length, late, overdue, onTime: doneList.length ? ((doneList.length - late) / doneList.length) * 100 : 100 };
  }, [range, followups]);

  /* ----- segments ----- */
  const dimDef = SEGMENT_DIMS.find((d) => d.id === dim);
  const getDim = dimDef.get || ((r) => r[dim]);
  const segRows = useMemo(() => {
    const map = {};
    created.forEach((r) => {
      const k = getDim(r);
      (map[k] ||= { name: k, leads: 0, cohortWon: 0 }).leads++;
      if (r.outcome === "won") map[k].cohortWon++;
    });
    rows.filter((r) => r.outcome === "won" && inRange(r.outcomeAt, range)).forEach((r) => {
      const k = getDim(r);
      const m = (map[k] ||= { name: k, leads: 0, cohortWon: 0 });
      m.won = (m.won || 0) + 1;
      m.revenue = (m.revenue || 0) + r.revenue;
      if (r.careKind === "B" && !(r.deferredBefore > 30)) {
        m.dSum = (m.dSum || 0) + r.daysToPaid;
        m.dN = (m.dN || 0) + 1;
      }
    });
    return Object.values(map)
      .map((m) => ({ ...m, won: m.won || 0, revenue: m.revenue || 0, conv: m.leads ? ((m.won || 0) / m.leads) * 100 : 0, avgDays: m.dN ? m.dSum / m.dN : null }))
      .sort((a, b) => b.leads - a.leads);
  }, [created, rows, range, dim]);

  /* ----- consultations ----- */
  const consultRows = rows.filter((r) => r.consult && inRange(r.consult.at, range));
  const cStats = (list) => {
    const shows = list.filter((r) => r.consult.show).length;
    const noShows = list.filter((r) => r.consult.noShow).length;
    const settled = list.filter((r) => r.consult.show && r.outcome && r.outcomeAt <= Date.now());
    const paid = settled.filter((r) => r.consult.paid).length;
    return { booked: list.length, shows, noShows, showRate: list.length ? (shows / list.length) * 100 : 0, paidRate: settled.length ? (paid / settled.length) * 100 : 0, paid };
  };
  const cAll = cStats(consultRows);
  const cPrev = cStats(rows.filter((r) => r.consult && inRange(r.consult.at, prev)));
  const cBySource = SOURCES.map((s) => ({ name: s, ...cStats(consultRows.filter((r) => r.source === s)) })).filter((r) => r.booked > 0).sort((a, b) => b.booked - a.booked);
  const objMap = {};
  consultRows.forEach((r) => r.consult.objections.forEach((o) => (objMap[o] = (objMap[o] || 0) + 1)));
  const objections = Object.entries(objMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  /* ----- daily ----- */
  const daily = useMemo(() => {
    const out = [];
    const fus = followups || [];
    for (let t = startOfDay(new Date(range.end)).getTime(); t >= range.start - 1; t -= DAY) {
      const end = Math.min(t + DAY, Date.now());
      const newLeads = rows.filter((r) => r.created >= t && r.created < end).length;
      const conversions = rows.filter((r) => r.outcome === "won" && r.outcomeAt >= t && r.outcomeAt < end).length;
      const running = rows.filter((r) => r.created < end && !(r.outcomeAt && r.outcomeAt < end) && end - r.created < 90 * DAY).length;
      const deferred = rows.filter((r) => r.outcome === "deferred" && r.outcomeAt < end && r.outcomeAt + r.deferDays * DAY > end).length;
      const completed = fus.filter((f) => f.status === "done" && f.completedAt && f.completedAt.getTime() >= t && f.completedAt.getTime() < end).length;
      const pending = fus.filter((f) => f.status === "open" && f.due && f.due.getTime() >= t && f.due.getTime() < t + DAY).length;
      out.push({ date: new Date(t), newLeads, completed, pending, ratio: completed + pending ? (completed / (completed + pending)) * 100 : 100, conversions, running, deferred });
      if (out.length >= 400) break;
    }
    return out;
  }, [rows, range, followups]);

  const exportCsv = () => {
    const head = ["Date", "New leads", "Follow-ups completed", "Follow-ups pending", "Completion %", "Conversions", "Running leads", "Deferred leads"];
    const lines = [head.join(",")].concat(
      daily.map((d) => [toLocalInput(d.date).slice(0, 10), d.newLeads, d.completed, d.pending, Math.round(d.ratio), d.conversions, d.running, d.deferred].join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cradlewell-daily-${period}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const rangeLabel = `${fmtShortDate(new Date(range.start))} – ${fmtShortDate(new Date(range.end))}`;

  return (
    <div className="h-[calc(100dvh-48px)] md:h-[100dvh] overflow-y-auto">
      <div className="px-5 md:px-8 pt-8 md:pt-10 pb-16 max-w-[1240px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-baseline gap-3">
            <h1 className="text-h1 font-medium tracking-[-0.01em]">Reports</h1>
            <span className="text-body text-ink-4 tabular-nums">{rangeLabel}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-8 flex items-center rounded-md border border-line-control bg-surface-subtle p-0.5">
              {PERIODS.map((p) => (
                <button key={p.id} onClick={() => setPeriod(p.id)} className={`h-[26px] rounded-md px-2.5 text-small transition-colors duration-150 ${period === p.id ? "bg-white text-ink font-medium shadow-ring-line" : "text-ink-4 hover:text-ink"}`}>{p.label}</button>
              ))}
            </div>
            {period === "custom" && (
              <div className="flex items-center gap-1 text-small">
                <input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="h-8 rounded-md border border-line-control px-2 tabular-nums outline-none focus:border-line-heavy" />
                <span className="text-ink-4">–</span>
                <input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="h-8 rounded-md border border-line-control px-2 tabular-nums outline-none focus:border-line-heavy" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-5 border-b border-line">
          {[["overview", "Overview"], ["segments", "Segments"], ["consults", "Consultations"], ["daily", "Daily"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`relative h-9 text-body transition-colors duration-150 ${tab === id ? "text-ink font-medium" : "text-ink-4 hover:text-ink"}`}>
              {label}
              {tab === id && <span className="absolute -bottom-px left-0 right-0 h-[1.5px] rounded-full bg-ink" />}
            </button>
          ))}
        </div>

        {/* KPI strip (Overview + Segments) */}
        {(tab === "overview" || tab === "segments") && (
          <div className="mt-7 grid grid-cols-2 md:grid-cols-5 gap-y-5">
            <Kpi first label="Leads" value={cur.leads} cur={cur.leads} prev={before.leads} />
            <Kpi label="Won" value={cur.won} cur={cur.won} prev={before.won} />
            <Kpi label="Revenue" value={fmtMoneyShort(cur.revenue)} cur={cur.revenue} prev={before.revenue} />
            <Kpi label="Lead → paid" value={pct(cur.conv)} cur={cur.conv} prev={before.conv} fmtDelta={(d) => `${d.toFixed(1)} pts`} />
            <Kpi label="Avg days to paid · Born" value={cur.avgDays == null ? "—" : cur.avgDays.toFixed(1)} cur={cur.avgDays} prev={before.avgDays} goodWhenUp={false} fmtDelta={(d) => `${d.toFixed(1)} days`} />
          </div>
        )}

        {tab === "overview" && (
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
            <div className="space-y-10 min-w-0">
              <Card title="Funnel" right="Leads entering each stage in this period · click a bar to open the list">
                <HBars data={funnel} onClick={(d) => onOpenLeads(d.name)} highlight={(d) => biggest && d.name === biggest.to} tip={(d) => { const i = funnel.findIndex((f) => f.name === d.name); if (i < 1 || !funnel[0].value) return null; const ofNew = `${Math.round((d.value / funnel[0].value) * 100)}% of New`; return i === 1 ? ofNew : `${ofNew} · ${funnel[i - 1].value ? Math.round((d.value / funnel[i - 1].value) * 100) : 0}% of ${funnel[i - 1].name}`; }} />
                {biggest && biggest.drop > 0 && (
                  <div className="mt-2 text-small">
                    <span className="inline-flex items-center gap-1.5 text-ink-2 tabular-nums"><span className="h-2 w-2 rounded-sm bg-brand" aria-hidden="true" />Biggest drop: <span className="font-medium text-ink">{biggest.from} → {biggest.to}</span> (−{Math.round(biggest.drop * 100)}%)</span>
                    {topDropReason && <span className="text-ink-4"> · top reason: <span className="text-ink-2">{topDropReason[0]}</span></span>}
                  </div>
                )}
              </Card>
              <Card title="Lost reasons" right={`${lost.reduce((s, x) => s + x.value, 0)} lost in this period`}>
                {lost.length ? <HBars data={lost} /> : <div className="text-body text-ink-4">No lost leads in this period</div>}
              </Card>
            </div>
            <div className="space-y-10 min-w-0">
              <Card title="By source" right={`Avg conversion ${pct(avgConv)} · above it in green`}>
                <SimpleTable
                  cols={[
                    { key: "name", label: "Source", render: (r) => r.name === "Total" ? "Total" : <span className="inline-flex items-center gap-1.5"><span className="text-ink-4"><SourceIcon source={r.name} /></span>{r.name}</span> },
                    { key: "leads", label: "Leads" },
                    { key: "won", label: "Won" },
                    { key: "conv", label: "Conv %", render: (r) => pct(r.conv), cls: (r) => (r.leads < 5 ? "text-ink-4" : r.conv >= avgConv ? "text-emerald-700 font-medium" : "text-ink-3") },
                    { key: "revenue", label: "Revenue", render: (r) => fmtMoneyShort(r.revenue) },
                  ]}
                  rows={bySource}
                  foot={{ name: "Total", leads: cur.leads, won: cur.won, conv: cur.conv, revenue: cur.revenue }}
                />
              </Card>
              <Card title="Follow-ups on time" right="Overdue is live, right now">
                <div className="flex items-end gap-8">
                  <div>
                    <div className={`text-display font-semibold tracking-[-0.02em] tabular-nums leading-none ${fuStats.onTime >= 90 ? "text-ink" : "text-red-700"}`}>{pct(fuStats.onTime)}</div>
                    <div className="mt-1.5 text-small text-ink-4">done on or before the due time</div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-body tabular-nums">
                    <div><div className="text-ink-4 text-small">Done</div><div className="mt-0.5 text-ink">{fuStats.done}</div></div>
                    <div><div className="text-ink-4 text-small">Done late</div><div className="mt-0.5 text-ink">{fuStats.late}</div></div>
                    <div><div className="text-ink-4 text-small">Overdue now</div><div className={`mt-0.5 ${fuStats.overdue ? "text-red-700" : "text-ink"}`}>{fuStats.overdue}</div></div>
                  </div>
                </div>
                {/* Meter against the 90% target: the fill turns red only when below it */}
                <div className="relative mt-6" role="img" aria-label={`${pct(fuStats.onTime)} on time, target 90%`}>
                  <div className="h-1.5 rounded-full bg-surface-active overflow-hidden">
                    <div className={`h-full rounded-full ${fuStats.onTime >= 90 ? "bg-ink-2" : "bg-red-600"}`} style={{ width: `${Math.round(fuStats.onTime)}%` }} />
                  </div>
                  <span className="absolute -top-1.5 h-[18px] w-px bg-ink" style={{ left: "90%" }} aria-hidden="true" />
                  <span className="absolute top-3 -translate-x-1/2 whitespace-nowrap text-caption text-ink-3 tabular-nums" style={{ left: "90%" }} aria-hidden="true">Target 90%</span>
                </div>
                <div className="h-4" />
              </Card>
            </div>
          </div>
        )}

        {tab === "segments" && (
          <div className="mt-10">
            <div className="flex items-center gap-1.5 flex-wrap mb-5">
              <span className="text-small text-ink-4 mr-1">Slice by</span>
              {SEGMENT_DIMS.map((d) => (
                <button key={d.id} onClick={() => setDim(d.id)} className={`h-7 rounded-full px-2.5 text-small transition-colors duration-150 ${dim === d.id ? "bg-ink text-white" : "border border-line-control text-ink-3 hover:text-ink"}`}>{d.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-x-12 gap-y-8">
              <Card title={`By ${dimDef.label.toLowerCase()}`}>
                <SimpleTable
                  cols={[
                    { key: "name", label: dimDef.label },
                    { key: "leads", label: "Leads" },
                    { key: "won", label: "Won" },
                    { key: "conv", label: "Lead → paid", render: (r) => pct(r.conv), cls: (r) => (r.leads < 5 ? "text-ink-4" : r.conv >= cur.conv ? "text-emerald-700 font-medium" : "text-ink-3") },
                    { key: "revenue", label: "Revenue", render: (r) => fmtMoneyShort(r.revenue) },
                    { key: "avgDays", label: "Days to paid", render: (r) => (r.avgDays == null ? "—" : r.avgDays.toFixed(1)) },
                  ]}
                  rows={segRows}
                />
              </Card>
              <Card title="Lead → paid %" right="High to low · line marks the average">
                <HBars data={segRows.map((r) => ({ name: r.name, value: Math.round(r.conv) })).sort((a, b) => b.value - a.value)} fmt={(v) => `${v}%`} track avg={Math.round(cur.conv)} />
              </Card>
            </div>
          </div>
        )}

        {tab === "consults" && (
          <div className="mt-7">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5">
              <Kpi first label="Booked" value={cAll.booked} cur={cAll.booked} prev={cPrev.booked} />
              <Kpi label="Show rate" value={pct(cAll.showRate)} cur={cAll.showRate} prev={cPrev.showRate} fmtDelta={(d) => `${d.toFixed(1)} pts`} />
              <Kpi label="Consult → paid" value={pct(cAll.paidRate)} cur={cAll.paidRate} prev={cPrev.paidRate} fmtDelta={(d) => `${d.toFixed(1)} pts`} />
              <Kpi label="No-shows" value={cAll.noShows} cur={cAll.noShows} prev={cPrev.noShows} goodWhenUp={false} />
            </div>
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
              <div className="space-y-10 min-w-0">
                <Card title="By lead source">
                  <SimpleTable
                    cols={[
                      { key: "name", label: "Source" },
                      { key: "booked", label: "Booked" },
                      { key: "showRate", label: "Show rate", render: (r) => pct(r.showRate) },
                      { key: "noShows", label: "No-shows", cls: (r) => (r.noShows ? "text-red-700" : "") },
                      { key: "paid", label: "Paid" },
                      { key: "paidRate", label: "Consult → paid", render: (r) => pct(r.paidRate), cls: (r) => (r.paid + r.shows < 5 ? "text-ink-4" : r.paidRate >= cAll.paidRate ? "text-emerald-700 font-medium" : "text-ink-3") },
                    ]}
                    rows={cBySource}
                  />
                </Card>
                <Card title="Consult → paid by source" right="High to low · line marks the average">
                  <HBars data={cBySource.map((p) => ({ name: p.name, value: Math.round(p.paidRate) })).sort((a, b) => b.value - a.value)} fmt={(v) => `${v}%`} track avg={Math.round(cAll.paidRate)} />
                </Card>
              </div>
              <Card title="Top objections" right="Logged on consults in this period" className="min-w-0">
                {objections.length ? <HBars data={objections} /> : <div className="text-body text-ink-4">No objections logged</div>}
              </Card>
            </div>
          </div>
        )}

        {tab === "daily" && (
          <div className="mt-7">
            <div className="flex items-center mb-3">
              <span className="text-small text-ink-4 tabular-nums">{daily.length} days · newest first</span>
              <SecondaryButton onClick={exportCsv} className="ml-auto flex items-center gap-1.5"><Upload className="h-3.5 w-3.5 rotate-180" /> Export CSV</SecondaryButton>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-body border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    {["Date", "New leads", "Follow-ups done", "Pending", "Completion", "Conversions", "Running leads", "Deferred"].map((h, i) => (
                      <th key={h} className={`h-9 border-b border-line text-small leading-4 font-medium text-ink-4 ${i ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d) => (
                    <tr key={d.date.getTime()} className="hover:bg-surface-subtle transition-colors duration-150">
                      <td className="h-9 border-b border-line-subtle tabular-nums">{dayDiff(d.date, new Date()) === 0 ? "Today" : `${d.date.toLocaleDateString("en-GB", { weekday: "short" })} ${fmtShortDate(d.date)}`}</td>
                      <td className="h-9 border-b border-line-subtle text-right tabular-nums">{d.newLeads}</td>
                      <td className="h-9 border-b border-line-subtle text-right tabular-nums">{d.completed}</td>
                      <td className={`h-9 border-b border-line-subtle text-right tabular-nums ${d.pending > 5 ? "text-red-700" : ""}`}>{d.pending}</td>
                      <td className={`h-9 border-b border-line-subtle text-right tabular-nums ${d.ratio >= 90 ? "text-emerald-700" : d.ratio < 85 ? "text-red-700" : ""}`}>{pct(d.ratio)}</td>
                      <td className="h-9 border-b border-line-subtle text-right tabular-nums">{d.conversions}</td>
                      <td className="h-9 border-b border-line-subtle text-right tabular-nums">{d.running}</td>
                      <td className="h-9 border-b border-line-subtle text-right tabular-nums text-ink-3">{d.deferred}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-12 text-small text-ink-4">Reports are built from your live leads: stage dates come from each lead's history (older leads only have the stage changes the previous CRM recorded). Conversion = payments in the period ÷ leads in the period.</div>
      </div>

    </div>
  );
}

/* ==========================================================================
   SETTINGS
   ========================================================================== */

const SETTINGS_MENU = [
  { group: "Workspace", items: [["notifications", "Notifications", Bell]] },
  {
    group: "Sales setup",
    items: [
      ["stages", "Pipeline stages", CircleDot],
      ["reasons", "Lost and defer reasons", CircleX],
      ["fields", "Lead fields", Rows3],
      ["packages", "Packages and services", Package],
      ["places", "Hospitals and zones", Building2],
    ],
  },
  { group: "Automation", items: [["rules", "Auto follow-ups", Zap], ["templates", "WhatsApp templates", MessageCircle]] },
  { group: "Connections", items: [["wa-api", "WhatsApp API", WhatsAppIcon], ["payments", "Payments", CreditCard], ["n8n", "n8n and webhooks", Webhook]] },
];

const sid = () => Math.random().toString(36).slice(2, 9);
const moveItem = (arr, a, b) => {
  const c = [...arr];
  const [x] = c.splice(a, 1);
  c.splice(b, 0, x);
  return c;
};

/* ---------- Rule vocabulary ---------- */
const RULE_TRIGGERS = {
  "Consult done": ["No payment", "Payment pending", "Any outcome"],
  "Payment link sent": ["Link not opened", "Opened, not paid"],
  "Messages sent": ["2 messages, no reply", "3 messages, no reply"],
  "Deferred date reached": ["Any reason"],
  "Expecting reaches": ["34 weeks", "36 weeks", "38 weeks"],
  "Baby born detected": ["From WhatsApp", "Any source"],
  "Consult no-show": ["Any consult"],
  "Lead stuck in": ["Qualified 3 days", "Consult done 2 days", "Payment pending 2 days"],
  "New lead created": ["Any source", "Hospital referral", "Meta ad"],
};
const RULE_ACTIONS = {
  call: { label: "Call task" },
  whatsapp: { label: "WhatsApp task" },
  autowa: { label: "Send WhatsApp template" },
  payment: { label: "Payment task" },
  notify: { label: "Notify me" },
};
const DELAY_KINDS = [["now", "Immediately"], ["after", "After"], ["within", "Within"], ["sameday", "Same day"]];
const fmtDelay = (d) => (d.kind === "now" ? "immediately" : d.kind === "sameday" ? "that day" : `${d.kind === "within" ? "within " : "+"}${d.n}${d.u === "min" ? " min" : d.u === "days" ? (d.n === 1 ? " day" : " days") : "h"}`);
// Lowercase a condition for sentence flow, but keep stage names capitalised
const condText = (r) => (r.trigger === "Lead stuck in" ? r.condition : r.condition.charAt(0).toLowerCase() + r.condition.slice(1));

/* ---------- Seed ---------- */
function buildSettings() {
  const step = (type, label, delay) => ({ id: sid(), type, label, delay });
  const typeOf = {
    phone: "Phone", dob: "Date", babyAge: "Formula", babies: "Number", birthWeight: "Number", currentWeight: "Number", care: "Select",
    services: "Multi-select", shiftType: "Select", shiftHours: "Select", careStart: "Date", careEnd: "Date", serviceDays: "Formula",
    package: "Select", source: "Select", stage: "Status", interactionAt: "Date & time", interactionType: "Select", next: "Date & time",
    reason: "Text", hospital: "Select", zone: "Select", address: "Long text", payment: "Select", amount: "Currency", booking: "Select",
  };
  const fieldCols = LEAD_COLUMNS.slice(0, LEAD_COLUMNS.findIndex((c) => c.id === "created"));
  return {
    notifications: [
      ["New lead arrives", 1, 1, 0],
      ["New WhatsApp message from a lead", 1, 1, 0],
      ["Follow-up becomes overdue", 1, 0, 0],
      ["Consult starts in 15 minutes", 1, 1, 0],
      ["Payment received", 1, 1, 1],
      ["Payment link opened", 1, 0, 0],
      ["Daily summary at 8 pm", 0, 0, 1],
    ].map(([name, app, wa, mail]) => ({ id: sid(), name, app: !!app, wa: !!wa, mail: !!mail })),
    stages: [
      ["New", "#A8A29E", null], ["Qualified", "#14B8A6", 3], ["Consult booked", "#3B82F6", 1], ["Consult done", "#F59E0B", 2],
      ["Payment pending", "#10B981", 2], ["Won", "#065F46", null], ["Deferred", "#A8A29E", null], ["Lost", "#EF4444", null],
    ].map(([name, color, stuck]) => ({ id: sid(), name, color, stuck })),
    lostReasons: LOST_REASONS.map((name) => ({ id: sid(), name })),
    deferReasons: ["Baby not born yet", "Family visiting for now", "Budget next month", "Travelling", "Still deciding", "Other"].map((name) => ({ id: sid(), name })),
    fields: [
      { id: "customerId", label: "Customer ID", type: "Auto ID", shown: true, required: true, auto: true, icon: IdCard },
      { id: "name", label: "Name", type: "Text", shown: true, required: true, auto: false, icon: UserRound },
      ...fieldCols.map((c) => ({ id: c.id, label: c.label, type: typeOf[c.id] || "Text", shown: true, required: ["phone", "source", "stage"].includes(c.id), auto: !!c.ai, icon: c.icon })),
    ],
    packages: [
      { id: "essential", name: "Essential", desc: "Stage-wise guidance, key expert visits and short in-home support", durations: [3, 6], shifts: [["Day", 8], ["Day", 10]] },
      { id: "together", name: "Together", desc: "Guidance, coordinated experts and regular in-home shifts", durations: [3, 6, 12], shifts: [["Day", 12], ["Night", 10], ["Night", 12]] },
      { id: "complete", name: "Complete", desc: "Full care team with extended in-home support through the first year", durations: [6, 12], shifts: [["Night", 12], ["24 hrs", 24]] },
    ].map((p) => ({ ...p, shifts: p.shifts.map(([type, hours]) => ({ id: sid(), type, hours, price: DAY_RATE[`${type}-${hours}`] || 4000, on: true })) })),
    experts: EXPERTS.map((e) => ({ id: e.id, name: e.name, ...EXPERT_CFG[e.id], included: [...EXPERT_CFG[e.id].included] })),
    hospitals: HOSPITALS.filter((h) => h !== "Other").map((name, i) => ({ id: sid(), name, zone: ["Whitefield", "Hebbal", "Marathahalli", "Koramangala", "Jayanagar"][i], partner: i < 2 })),
    zones: ZONES.map((name, i) => ({ id: sid(), name, serviceable: i !== 10 })),
    rules: [
      { trigger: "Consult done", condition: "No payment", steps: [step("call", "Payment call", { kind: "after", n: 24, u: "h" })], on: true },
      { trigger: "Payment link sent", condition: "Link not opened", steps: [step("whatsapp", "WhatsApp reminder", { kind: "after", n: 24, u: "h" })], on: true },
      { trigger: "Messages sent", condition: "2 messages, no reply", steps: [step("call", "Call", { kind: "after", n: 48, u: "h" })], on: true },
      { trigger: "Deferred date reached", condition: "Any reason", steps: [step("call", "Call", { kind: "sameday" })], on: true },
      { trigger: "Expecting reaches", condition: "36 weeks", steps: [step("call", "Pre-delivery check-in", { kind: "now" })], on: true },
      { trigger: "Baby born detected", condition: "From WhatsApp", steps: [step("call", "Call", { kind: "within", n: 2, u: "h" })], on: true },
      { trigger: "Consult no-show", condition: "Any consult", steps: [step("autowa", "Consult rebook template", { kind: "now" }), step("call", "Call to rebook", { kind: "after", n: 4, u: "h" })], on: true },
      { trigger: "Lead stuck in", condition: "Qualified 3 days", steps: [step("notify", "Notify me", { kind: "now" })], on: false },
    ].map((r) => ({ id: sid(), ...r })),
    templates: [
      ["Welcome and brochure", "welcome", "Marketing", "Approved", "Hi {{1}}, thank you for reaching out to Cradlewell 🌸 Here is how we support you and your baby from discharge through the first year. Would you like a quick call with our care advisor?"],
      ["Consult reminder", "remind", "Utility", "Approved", "Hi {{1}}, a reminder that your consultation with {{2}} is at {{3}} today. Reply 1 to confirm or 2 to reschedule."],
      ["Payment link", "pay", "Utility", "Approved", "Hi {{1}}, here is your secure payment link for the {{2}} plan: {{3}}. Your care team is confirmed as soon as payment is received."],
      ["Payment reminder", "payrem", "Utility", "Approved", "Hi {{1}}, just checking whether you had a chance to look at the payment link for {{2}}. Happy to help if you have any questions."],
      ["Gentle check-in", "checkin", "Marketing", "Approved", "Hi {{1}}, hope you and the baby are doing well. Is there anything we can help you with this week?"],
      ["Consult rebook", "rebook", "Utility", "Approved", "Hi {{1}}, we missed you at today's consultation. Would you like to pick a new time? {{2}}"],
      ["Pre-delivery check-in", "36w", "Marketing", "Pending", "Hi {{1}}, you are close to your due date 💛 Shall we plan your support for the first weeks at home?"],
      ["Congratulations", "congrats", "Marketing", "Pending", "Congratulations {{1}} on the arrival of your little one! 🎉 Our care advisor will call you shortly to plan your first weeks at home."],
    ].map(([name, shortcut, category, status, body]) => ({ id: sid(), name, shortcut, category, status, body })),
    webhooks: [
      { id: sid(), event: "lead.created", url: "https://n8n.cradlewell.com/webhook/lead-created", on: true },
      { id: sid(), event: "lead.stage_changed", url: "https://n8n.cradlewell.com/webhook/stage-changed", on: true },
      { id: sid(), event: "payment.received", url: "https://n8n.cradlewell.com/webhook/payment", on: true },
      { id: sid(), event: "consult.no_show", url: "https://n8n.cradlewell.com/webhook/no-show", on: false },
    ],
    connections: { whatsapp: true, razorpay: true, cashfree: false, n8n: true, calcom: true },
  };
}

/* ---------- Building blocks (all top-level: App ticks every second) ---------- */

function SToggle({ on, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className={`relative h-5 w-8 shrink-0 rounded-full transition-colors duration-150 ${on ? "bg-ink" : "bg-line-strong"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${on ? "translate-x-3" : "translate-x-0"}`} />
    </button>
  );
}

const inlineCls =
  "h-8 rounded-md border border-transparent bg-transparent px-2 -mx-2 text-body outline-none transition-colors duration-150 hover:border-line-control focus:border-line-heavy focus:bg-white";

function InlineInput({ value, onChange, className = "", ...rest }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className={`${inlineCls} ${className}`} {...rest} />;
}
function InlineSelect({ value, onChange, options, className = "" }) {
  return (
    <span className="relative inline-flex items-center">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inlineCls} appearance-none pr-6 cursor-pointer ${className}`}>
        {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
      </select>
      <ChevronDown className="pointer-events-none absolute -right-0.5 h-3 w-3 text-ink-4" />
    </span>
  );
}

function SHeader({ title, desc, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-title font-semibold tracking-[-0.01em]">{title}</h1>
        <p className="mt-1 text-body text-ink-4">{desc}</p>
      </div>
      {action}
    </div>
  );
}
const NewButton = ({ children = "New", ...p }) => (
  <PrimaryButton {...p} className="shrink-0 inline-flex items-center gap-1.5">
    <Plus className="h-3.5 w-3.5" /> {children}
  </PrimaryButton>
);
const STh = ({ children, className = "" }) => <th className={`h-8 px-3 first:pl-0 border-b border-line text-left text-small leading-4 font-medium text-ink-4 whitespace-nowrap ${className}`}>{children}</th>;
const STd = ({ children, className = "" }) => <td className={`h-11 px-3 first:pl-0 border-b border-line-subtle text-body ${className}`}>{children}</td>;
const RowDelete = ({ onClick, label = "Delete" }) => (
  <button onClick={onClick} aria-label={label} className="h-7 w-7 rounded-md flex items-center justify-center text-ink-4 opacity-0 [@media(hover:none)]:opacity-100 group-hover:opacity-100 hover:bg-surface-hover hover:text-red-700 transition">
    <Trash2 className="h-3.5 w-3.5" />
  </button>
);

// Drag-to-reorder: only the grip arms the row, so inputs inside stay editable.
function useReorder(onMove) {
  const [armed, setArmed] = useState(null);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const rowProps = (i) => ({
    draggable: armed === i,
    onDragStart: (e) => {
      setDrag(i);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(i));
    },
    onDragOver: (e) => {
      if (drag == null) return;
      e.preventDefault();
      if (over !== i) setOver(i);
    },
    onDrop: (e) => {
      e.preventDefault();
      if (drag != null && drag !== i) onMove(drag, i);
      setDrag(null);
      setOver(null);
      setArmed(null);
    },
    onDragEnd: () => {
      setDrag(null);
      setOver(null);
      setArmed(null);
    },
  });
  const grip = (i) => (
    <span onMouseDown={() => setArmed(i)} onMouseUp={() => setArmed(null)} className="cursor-grab active:cursor-grabbing text-ink-faint hover:text-ink-3 inline-flex" aria-label="Drag to reorder">
      <GripVertical className="h-4 w-4" />
    </span>
  );
  const rowCls = (i) => `${drag === i ? "opacity-40" : ""} ${over === i && drag !== i ? (drag < i ? "shadow-[inset_0_-2px_0_#B4436C]" : "shadow-[inset_0_2px_0_#B4436C]") : ""}`;
  return { rowProps, grip, rowCls };
}

async function copyText(text, showToast) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  showToast("Copied to clipboard");
}

const STAGE_COLORS = ["#A8A29E", "#14B8A6", "#3B82F6", "#0EA5E9", "#F59E0B", "#10B981", "#065F46", "#B4436C", "#EF4444"];

/* ---------- Pages ---------- */

function NotificationSettings({ s, upd, patch, remove }) {
  const cols = [["app", "In-app"], ["wa", "WhatsApp"], ["mail", "Email"]];
  return (
    <>
      <SHeader title="Notifications" desc="What pings you, and where." action={<NewButton onClick={() => upd("notifications", (n) => [...n, { id: sid(), name: "New notification", app: true, wa: false, mail: false }])} />} />
      <table className="w-full border-separate border-spacing-0">
        <thead><tr><STh>Event</STh>{cols.map(([k, l]) => <STh key={k} className="text-center w-24">{l}</STh>)}<STh className="w-8" /></tr></thead>
        <tbody>
          {s.notifications.map((n) => (
            <tr key={n.id} className="group hover:bg-surface-subtle">
              <STd><InlineInput value={n.name} onChange={(v) => patch("notifications", n.id, { name: v })} className="w-full max-w-[360px]" /></STd>
              {cols.map(([k]) => (
                <STd key={k} className="text-center"><div className="inline-flex"><Checkbox checked={n[k]} onChange={() => patch("notifications", n.id, { [k]: !n[k] })} /></div></STd>
              ))}
              <STd><RowDelete onClick={() => remove("notifications", n.id, "Notification removed")} /></STd>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function StageSettings({ s, upd, patch, remove }) {
  const { rowProps, grip, rowCls } = useReorder((a, b) => upd("stages", (st) => moveItem(st, a, b)));
  const [colorFor, setColorFor] = useState(null);
  const close = useCallback(() => setColorFor(null), []);
  return (
    <>
      <SHeader title="Pipeline stages" desc="Drag to reorder. A lead is flagged as stuck once it sits in a stage longer than the limit." action={<NewButton onClick={() => upd("stages", (st) => { const i = st.findIndex((x) => x.name === "Won"); const c = [...st]; c.splice(i < 0 ? c.length : i, 0, { id: sid(), name: "New stage", color: "#0EA5E9", stuck: 2 }); return c; })} />} />
      <div className="border-t border-line">
        {s.stages.map((st, i) => {
          const terminal = ["Won", "Lost", "Deferred"].includes(st.name);
          return (
            <div key={st.id} {...rowProps(i)} className={`group flex items-center gap-3 h-12 border-b border-line-subtle hover:bg-surface-subtle ${rowCls(i)}`}>
              {grip(i)}
              <button onClick={(e) => setColorFor({ id: st.id, anchor: e.currentTarget })} className="h-5 w-5 rounded-md flex items-center justify-center hover:bg-surface-active" aria-label="Stage colour">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: st.color }} />
              </button>
              <InlineInput value={st.name} onChange={(v) => patch("stages", st.id, { name: v })} className="w-56 font-medium" />
              <div className="ml-auto flex items-center gap-2 text-body text-ink-3">
                {terminal ? (
                  <span className="text-ink-4 text-small leading-4">{st.name === "Won" ? "Closed stage" : "Off-pipeline"}</span>
                ) : st.stuck == null ? (
                  <button onClick={() => patch("stages", st.id, { stuck: 3 })} className="text-small leading-4 text-ink-4 hover:text-ink">+ Stuck limit</button>
                ) : (
                  <>
                    <span>Stuck after</span>
                    <InlineInput type="number" min={1} value={st.stuck} onChange={(v) => patch("stages", st.id, { stuck: Math.max(1, +v || 1) })} className="w-12 text-right tabular-nums" />
                    <span>{st.stuck === 1 ? "day" : "days"}</span>
                    <button onClick={() => patch("stages", st.id, { stuck: null })} className="h-6 w-6 rounded flex items-center justify-center text-ink-4 hover:text-ink" aria-label="Remove limit"><X className="h-3.5 w-3.5" /></button>
                  </>
                )}
              </div>
              <div className="w-8">{!terminal && <RowDelete onClick={() => remove("stages", st.id, `${st.name} stage removed`)} />}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-small leading-4 text-ink-4">For Consult booked, the limit counts days after the consult time. Stuck limits update the Pipeline board right away.</div>
      {colorFor && (
        <FixedMenu anchor={colorFor.anchor} onClose={close} width={196}>
          <div className="p-2 grid grid-cols-9 gap-1">
            {STAGE_COLORS.map((c) => (
              <button key={c} onClick={() => { patch("stages", colorFor.id, { color: c }); close(); }} className="h-4 w-4 rounded-full ring-offset-2 hover:ring-2 hover:ring-line-strong" style={{ background: c }} aria-label={c} />
            ))}
          </div>
        </FixedMenu>
      )}
    </>
  );
}

function ReasonList({ title, keyName, list, upd, patch, remove }) {
  const { rowProps, grip, rowCls } = useReorder((a, b) => upd(keyName, (l) => moveItem(l, a, b)));
  return (
    <section>
      <div className="flex items-center mb-2">
        <h2 className="text-body font-medium">{title}</h2>
        <button onClick={() => upd(keyName, (l) => [...l, { id: sid(), name: "" }])} className="ml-auto text-small text-ink-3 hover:text-ink inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
      <div className="border-t border-line">
        {list.map((r, i) => (
          <div key={r.id} {...rowProps(i)} className={`group flex items-center gap-3 h-11 border-b border-line-subtle hover:bg-surface-subtle ${rowCls(i)}`}>
            {grip(i)}
            <InlineInput autoFocus={!r.name} placeholder="Reason name" value={r.name} onChange={(v) => patch(keyName, r.id, { name: v })} className="flex-1" />
            <RowDelete onClick={() => remove(keyName, r.id, "Reason removed")} />
          </div>
        ))}
      </div>
    </section>
  );
}
function ReasonSettings(props) {
  const { s, upd } = props;
  return (
    <>
      <SHeader title="Lost and defer reasons" desc="The choices shown when someone marks a lead lost or deferred. Order here is the order in the picker." action={<NewButton onClick={() => upd("lostReasons", (l) => [...l, { id: sid(), name: "" }])} />} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
        <ReasonList title="Lost reasons" keyName="lostReasons" list={s.lostReasons} {...props} />
        <ReasonList title="Defer reasons" keyName="deferReasons" list={s.deferReasons} {...props} />
      </div>
    </>
  );
}

const FIELD_TYPES = ["Text", "Long text", "Number", "Currency", "Date", "Date & time", "Phone", "Select", "Multi-select", "Status", "Formula", "Auto ID"];
function FieldSettings({ s, upd, patch, remove }) {
  const { rowProps, grip, rowCls } = useReorder((a, b) => upd("fields", (f) => moveItem(f, a, b)));
  const [adding, setAdding] = useState(null);
  return (
    <>
      <SHeader title="Lead fields" desc={`${s.fields.length} fields on every lead. Drag to set the column order in the Leads table.`} action={<NewButton onClick={() => setAdding({ label: "", type: "Text" })}>New field</NewButton>} />
      <table className="w-full border-separate border-spacing-0">
        <thead><tr><STh className="w-6" /><STh>Field</STh><STh>Type</STh><STh className="text-center">Shown in table</STh><STh className="text-center">Required</STh><STh className="text-center">Auto</STh><STh className="w-8" /></tr></thead>
        <tbody>
          {s.fields.map((f, i) => {
            const Icon = f.icon || Hash;
            const locked = f.id === "customerId" || f.id === "name";
            return (
              <tr key={f.id} {...rowProps(i)} className={`group hover:bg-surface-subtle ${rowCls(i)}`}>
                <STd>{grip(i)}</STd>
                <STd>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-ink-4 shrink-0" />
                    <InlineInput value={f.label} onChange={(v) => patch("fields", f.id, { label: v })} className="w-52" />
                  </div>
                </STd>
                <STd>{f.auto || locked ? <span className="text-ink-3">{f.type}</span> : <InlineSelect value={f.type} onChange={(v) => patch("fields", f.id, { type: v })} options={FIELD_TYPES.filter((t) => t !== "Auto ID" && t !== "Formula")} />}</STd>
                <STd className="text-center"><div className="inline-flex">{locked ? <Check className="h-3.5 w-3.5 text-ink-4" /> : <SToggle on={f.shown} onChange={(v) => patch("fields", f.id, { shown: v })} label={`Show ${f.label}`} />}</div></STd>
                <STd className="text-center"><div className="inline-flex">{f.auto || locked ? <span className="text-ink-4">—</span> : <Checkbox checked={f.required} onChange={() => patch("fields", f.id, { required: !f.required })} />}</div></STd>
                <STd className="text-center">{f.auto ? <span className="text-small text-ink-4">From dates</span> : <span className="text-ink-faint">—</span>}</STd>
                <STd>{!locked && <RowDelete onClick={() => remove("fields", f.id, `${f.label} field removed`)} />}</STd>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-4 text-small leading-4 text-ink-4">Auto fields are calculated from dates on the lead and can't be required.</div>
      {adding && (
        <Modal title="New field" onClose={() => setAdding(null)}>
          <div className="p-5 space-y-4">
            <Field label="Field name" required><input autoFocus className={inputCls} value={adding.label} placeholder="e.g. Preferred caregiver language" onChange={(e) => setAdding({ ...adding, label: e.target.value })} /></Field>
            <Field label="Type"><select className={inputCls} value={adding.type} onChange={(e) => setAdding({ ...adding, type: e.target.value })}>{FIELD_TYPES.slice(0, 9).map((t) => <option key={t}>{t}</option>)}</select></Field>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <SecondaryButton onClick={() => setAdding(null)}>Cancel</SecondaryButton>
            <PrimaryButton disabled={!adding.label.trim()} onClick={() => { upd("fields", (f) => [...f, { id: sid(), label: adding.label.trim(), type: adding.type, shown: true, required: false, auto: false, icon: Hash }]); setAdding(null); }}>Add field</PrimaryButton>
          </div>
        </Modal>
      )}
    </>
  );
}

function PackageSettings({ s, upd, showToast }) {
  const patchPkg = (id, p) => upd("packages", (ps) => ps.map((x) => (x.id === id ? { ...x, ...(typeof p === "function" ? p(x) : p) } : x)));
  const patchShift = (pid, sid2, p) => patchPkg(pid, (x) => ({ shifts: x.shifts.map((sh) => (sh.id === sid2 ? { ...sh, ...p } : sh)) }));
  const shiftOpts = Object.keys(DAY_RATE).map((k) => [k, k.replace("-", " · ") + "h"]);
  return (
    <>
      <SHeader title="Packages and services" desc="Package tiers and shift prices, plus the expert services sold to paid customers." action={<NewButton onClick={() => upd("packages", (ps) => [...ps, { id: sid(), name: "New package", desc: "", durations: [3], shifts: [] }])}>New package</NewButton>} />
      <div className="mb-6 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-small text-amber-800">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Draft prices copied from the mock per-day rates. Replace them with final pricing before quoting.
      </div>
      <div className="space-y-10">
        {s.packages.map((p) => (
          <section key={p.id} className="group/pkg">
            <div className="flex items-center gap-3">
              <InlineInput value={p.name} onChange={(v) => patchPkg(p.id, { name: v })} className="text-title-sm font-semibold w-48" />
              <div className="flex items-center gap-1 ml-2">
                {[3, 6, 12].map((m) => {
                  const on = p.durations.includes(m);
                  return (
                    <button key={m} onClick={() => patchPkg(p.id, { durations: on ? p.durations.filter((d) => d !== m) : [...p.durations, m].sort((a, b) => a - b) })} className={`h-6 rounded-full px-2 text-caption transition-colors duration-150 ${on ? "bg-ink text-white" : "border border-line-control text-ink-4 hover:text-ink"}`}>{m} months</button>
                  );
                })}
              </div>
              <button onClick={() => { upd("packages", (ps) => ps.filter((x) => x.id !== p.id)); showToast(`${p.name} removed`); }} className="ml-auto text-small leading-4 text-ink-4 hover:text-red-700 opacity-0 group-hover/pkg:opacity-100 transition">Delete package</button>
            </div>
            <InlineInput value={p.desc} placeholder="One-line description" onChange={(v) => patchPkg(p.id, { desc: v })} className="w-full text-ink-3 mt-0.5" />
            <table className="mt-3 w-full border-separate border-spacing-0">
              <thead><tr><STh>Shift option</STh><STh className="text-right">Hours</STh><STh className="text-right">Price per day</STh><STh className="text-right">30-day estimate</STh><STh className="text-right">Offered</STh><STh className="w-8" /></tr></thead>
              <tbody>
                {p.shifts.map((sh) => (
                  <tr key={sh.id} className={`group hover:bg-surface-subtle ${sh.on ? "" : "text-ink-4"}`}>
                    <STd><InlineSelect value={sh.type} onChange={(v) => patchShift(p.id, sh.id, { type: v })} options={SHIFT_TYPES} /></STd>
                    <STd className="text-right"><InlineSelect value={String(sh.hours)} onChange={(v) => patchShift(p.id, sh.id, { hours: +v })} options={SHIFT_HOURS.map(String)} className="tabular-nums" /></STd>
                    <STd className="text-right">
                      <span className="inline-flex items-center gap-0.5 tabular-nums">₹<InlineInput type="number" step={100} min={0} value={sh.price} onChange={(v) => patchShift(p.id, sh.id, { price: Math.max(0, +v || 0) })} className="w-20 text-right" /></span>
                    </STd>
                    <STd className="text-right tabular-nums text-ink-3">{fmtINR(sh.price * 30)}</STd>
                    <STd className="text-right"><SToggle on={sh.on} onChange={(v) => patchShift(p.id, sh.id, { on: v })} label="Offered" /></STd>
                    <STd><RowDelete onClick={() => patchPkg(p.id, (x) => ({ shifts: x.shifts.filter((y) => y.id !== sh.id) }))} /></STd>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => patchPkg(p.id, (x) => ({ shifts: [...x.shifts, { id: sid(), type: "Day", hours: 8, price: DAY_RATE["Day-8"], on: true }] }))} className="mt-2 text-small text-ink-3 hover:text-ink inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add shift option</button>
          </section>
        ))}
      </div>
      <ExpertServicesTable s={s} upd={upd} />
    </>
  );
}

function ExpertServicesTable({ s, upd }) {
  const patch = (id, p) => upd("experts", (xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const price = (x, k) => (
    <span className="inline-flex items-center gap-0.5 tabular-nums">₹<InlineInput type="number" step={100} min={0} value={x[k]} onChange={(v) => patch(x.id, { [k]: Math.max(0, +v || 0) })} className="w-[72px] text-right" /></span>
  );
  const chip = (on, label, onClick, disabled) => (
    <button key={label} disabled={disabled} onClick={onClick} className={`h-6 rounded-full px-2 text-caption transition-colors duration-150 ${on ? "bg-ink text-white" : "border border-line-control text-ink-4 hover:text-ink"} disabled:opacity-60`}>{label}</button>
  );
  return (
    <section className="mt-12">
      <div className="flex items-baseline gap-2">
        <h2 className="text-title-sm font-semibold">Expert services</h2>
        <span className="text-small text-ink-4">Sold to paid customers from Sell a service. Included services are suggested at ₹0.</span>
      </div>
      <table className="mt-3 w-full border-separate border-spacing-0">
        <thead><tr><STh>Service</STh><STh className="text-right">Single</STh><STh className="text-right">Pack of 4</STh><STh className="text-right">Pack of 8</STh><STh>Modes</STh><STh>Included in</STh></tr></thead>
        <tbody>
          {s.experts.map((x) => (
            <tr key={x.id} className="hover:bg-surface-subtle">
              <STd>
                <span className="inline-flex items-center gap-2">
                  <span className="h-[18px] w-[18px] rounded-full bg-teal-600 text-white text-micro font-semibold flex items-center justify-center">{x.id}</span>
                  {x.name}
                </span>
              </STd>
              <STd className="text-right">{price(x, "single")}</STd>
              <STd className="text-right">{price(x, "pack4")}</STd>
              <STd className="text-right">{price(x, "pack8")}</STd>
              <STd>
                <div className="flex gap-1">
                  {chip(x.home, "Home visit", () => patch(x.id, { home: !x.home }), x.home && !x.video)}
                  {chip(x.video, "Video", () => patch(x.id, { video: !x.video }), x.video && !x.home)}
                </div>
              </STd>
              <STd>
                <div className="flex gap-1">
                  {s.packages.map((p) => chip(x.included.includes(p.name), p.name, () => patch(x.id, { included: x.included.includes(p.name) ? x.included.filter((n) => n !== p.name) : [...x.included, p.name] })))}
                </div>
              </STd>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function PlaceSettings({ s, upd, patch, remove, leads }) {
  const count = (k, v) => leads.filter((l) => l[k] === v).length;
  return (
    <>
      <SHeader title="Hospitals and zones" desc="Options for the Hospital and Area fields. Unserviceable zones are flagged on new leads." action={<NewButton onClick={() => upd("hospitals", (h) => [...h, { id: sid(), name: "", zone: ZONES[0], partner: false }])}>New hospital</NewButton>} />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-x-10 gap-y-10">
        <section>
          <h2 className="text-body font-medium mb-2">Hospitals</h2>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><STh>Hospital</STh><STh>Zone</STh><STh className="text-center">Referral partner</STh><STh className="text-right">Leads</STh><STh className="w-8" /></tr></thead>
            <tbody>
              {s.hospitals.map((h) => (
                <tr key={h.id} className="group hover:bg-surface-subtle">
                  <STd><InlineInput autoFocus={!h.name} placeholder="Hospital name" value={h.name} onChange={(v) => patch("hospitals", h.id, { name: v })} className="w-40" /></STd>
                  <STd><InlineSelect value={h.zone} onChange={(v) => patch("hospitals", h.id, { zone: v })} options={s.zones.map((z) => z.name)} /></STd>
                  <STd className="text-center"><div className="inline-flex"><SToggle on={h.partner} onChange={(v) => patch("hospitals", h.id, { partner: v })} label="Referral partner" /></div></STd>
                  <STd className="text-right tabular-nums text-ink-3">{count("hospital", h.name)}</STd>
                  <STd><RowDelete onClick={() => remove("hospitals", h.id, "Hospital removed")} /></STd>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <div className="flex items-center mb-2">
            <h2 className="text-body font-medium">Zones</h2>
            <button onClick={() => upd("zones", (z) => [...z, { id: sid(), name: "", serviceable: true }])} className="ml-auto text-small text-ink-3 hover:text-ink inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add zone</button>
          </div>
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><STh>Zone</STh><STh className="text-center">Serviceable</STh><STh className="text-right">Leads</STh><STh className="w-8" /></tr></thead>
            <tbody>
              {s.zones.map((z) => (
                <tr key={z.id} className="group hover:bg-surface-subtle">
                  <STd><InlineInput autoFocus={!z.name} placeholder="Zone name" value={z.name} onChange={(v) => patch("zones", z.id, { name: v })} className="w-40" /></STd>
                  <STd className="text-center"><div className="inline-flex"><SToggle on={z.serviceable} onChange={(v) => patch("zones", z.id, { serviceable: v })} label="Serviceable" /></div></STd>
                  <STd className="text-right tabular-nums text-ink-3">{count("zone", z.name)}</STd>
                  <STd><RowDelete onClick={() => remove("zones", z.id, "Zone removed")} /></STd>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

/* ----- Auto follow-ups ----- */

function StepText({ st }) {
  return (
    <span>
      {st.label}
      <span className="text-ink-4"> {fmtDelay(st.delay)}</span>
    </span>
  );
}

function RuleBuilder({ initial, onSave, onClose, onDelete }) {
  const [r, setR] = useState(initial);
  const conds = RULE_TRIGGERS[r.trigger] || [];
  const setStep = (i, p) => setR((x) => ({ ...x, steps: x.steps.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const selCls = `${inputCls} pr-7`;
  return (
    <Modal title={initial.isNew ? "New rule" : "Edit rule"} onClose={onClose} width={620}>
      <div className="p-5 space-y-5">
        <div>
          <div className="text-small leading-4 font-medium text-ink-4 mb-2">When</div>
          <div className="grid grid-cols-2 gap-2">
            <select className={selCls} value={r.trigger} onChange={(e) => setR({ ...r, trigger: e.target.value, condition: RULE_TRIGGERS[e.target.value][0] })}>
              {Object.keys(RULE_TRIGGERS).map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className={selCls} value={r.condition} onChange={(e) => setR({ ...r, condition: e.target.value })}>
              {conds.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="text-small leading-4 font-medium text-ink-4 mb-2">Then</div>
          <div className="space-y-2">
            {r.steps.map((st, i) => {
              return (
                <div key={st.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-center gap-2 text-small leading-4 text-ink-4 mb-2">
                    <span>{i === 0 ? "Step 1" : `Then, step ${i + 1}`}</span>
                    {r.steps.length > 1 && <button onClick={() => setR({ ...r, steps: r.steps.filter((_, j) => j !== i) })} className="ml-auto hover:text-red-700">Remove</button>}
                  </div>
                  <div className="grid grid-cols-[1fr_1.3fr] gap-2">
                    <select className={selCls} value={st.type} onChange={(e) => { const t = e.target.value; setStep(i, { type: t, label: RULE_ACTIONS[t].label }); }}>
                      {Object.entries(RULE_ACTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <input className={inputCls} value={st.label} onChange={(e) => setStep(i, { label: e.target.value })} placeholder="Task name" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <select className={`${selCls} w-36`} value={st.delay.kind} onChange={(e) => setStep(i, { delay: { ...st.delay, kind: e.target.value, n: st.delay.n || 24, u: st.delay.u || "h" } })}>
                      {DELAY_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    {(st.delay.kind === "after" || st.delay.kind === "within") && (
                      <>
                        <input type="number" min={1} className={`${inputCls} w-20 tabular-nums`} value={st.delay.n} onChange={(e) => setStep(i, { delay: { ...st.delay, n: Math.max(1, +e.target.value || 1) } })} />
                        <select className={`${selCls} w-28`} value={st.delay.u} onChange={(e) => setStep(i, { delay: { ...st.delay, u: e.target.value } })}>
                          <option value="min">minutes</option><option value="h">hours</option><option value="days">days</option>
                        </select>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {r.steps.length < 3 && (
              <button onClick={() => setR({ ...r, steps: [...r.steps, { id: sid(), type: "call", label: "Call task", delay: { kind: "after", n: 24, u: "h" } }] })} className="text-small text-ink-3 hover:text-ink inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add a next step</button>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-surface-subtle px-3 py-2.5 text-body leading-relaxed">
          <span className="text-ink-4">When </span>{r.trigger.charAt(0).toLowerCase() + r.trigger.slice(1)} {condText(r)}<span className="text-ink-4"> → </span>
          {r.steps.map((st, i) => (
            <span key={st.id}>{i > 0 && <span className="text-ink-4">, then </span>}<StepText st={st} /></span>
          ))}
        </div>
        <div className="text-small leading-4 text-ink-4">Tasks landing after 8 pm move to 10 am the next day.</div>
      </div>
      <div className="flex items-center gap-2 px-5 pb-5">
        {onDelete && <button onClick={onDelete} className="text-body text-ink-4 hover:text-red-700">Delete rule</button>}
        <SecondaryButton className="ml-auto" onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton disabled={r.steps.some((s) => !s.label.trim())} onClick={() => onSave(r)}>{initial.isNew ? "Create rule" : "Save rule"}</PrimaryButton>
      </div>
    </Modal>
  );
}

function RuleSettings({ s, upd, patch, remove }) {
  const [editing, setEditing] = useState(null);
  const active = s.rules.filter((r) => r.on).length;
  return (
    <>
      <SHeader
        title="Auto follow-ups"
        desc="Rules that create follow-ups for you automatically, so no lead goes quiet."
        action={<NewButton onClick={() => setEditing({ isNew: true, id: sid(), trigger: "Consult done", condition: "No payment", on: true, steps: [{ id: sid(), type: "call", label: "Call task", delay: { kind: "after", n: 24, u: "h" } }] })}>New rule</NewButton>}
      />
      <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1.25fr)_44px] items-center gap-3 h-8 border-b border-line text-small leading-4 font-medium text-ink-4">
        <span>When</span><span /><span>Then</span><span className="text-right tabular-nums">{active} on</span>
      </div>
      {s.rules.map((r) => (
        <div key={r.id} onClick={() => setEditing(r)} className={`group grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1.25fr)_44px] items-center gap-3 min-h-[52px] py-2 border-b border-line-subtle cursor-pointer hover:bg-surface-subtle transition-colors duration-150 ${r.on ? "" : "[&_span]:text-ink-4 [&_div]:text-ink-4"}`}>
          <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(r); }} className="text-body text-left rounded-sm">
            <span className="font-medium">{r.trigger}</span> <span className="text-ink-3">{condText(r)}</span>{!r.on && <span className="sr-only"> (paused)</span>}
          </button>
          <ArrowRight className="h-3.5 w-3.5 text-ink-faint" />
          <div className="text-body flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            {r.steps.map((st, i) => (
              <React.Fragment key={st.id}>
                {i > 0 && <span className="text-ink-4">then</span>}
                <StepText st={st} />
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-end"><SToggle on={r.on} onChange={(v) => patch("rules", r.id, { on: v })} label="Rule on" /></div>
        </div>
      ))}
      <div className="mt-4 text-small leading-4 text-ink-4">Click a rule to edit it</div>
      {editing && (
        <RuleBuilder
          initial={editing}
          onClose={() => setEditing(null)}
          onDelete={editing.isNew ? null : () => { remove("rules", editing.id, "Rule deleted"); setEditing(null); }}
          onSave={(r) => {
            const { isNew, ...clean } = r;
            if (isNew) upd("rules", (rs) => [...rs, clean]);
            else patch("rules", clean.id, clean);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

/* ----- Routing ----- */
/* ----- Templates ----- */
function WaBubble({ body }) {
  const parts = body.split(/(\{\{\d+\}\})/g);
  return (
    <div className="rounded-xl bg-surface-active p-4">
      <div className="max-w-[300px] rounded-lg rounded-tl-none bg-white px-3 py-2 text-body leading-relaxed shadow-sm whitespace-pre-wrap">
        {parts.map((p, i) => (/\{\{\d+\}\}/.test(p) ? <span key={i} className="rounded bg-emerald-50 px-1 text-emerald-700">{p}</span> : p))}
        <div className="mt-1 text-right text-micro text-ink-4">10:42</div>
      </div>
    </div>
  );
}
function TemplateSettings({ s, upd, patch, remove, showToast }) {
  const [edit, setEdit] = useState(null);
  return (
    <>
      <SHeader title="WhatsApp templates" desc="Pre-approved messages for chats older than 24 hours. Type / and the shortcut in Inbox to insert one." action={<NewButton onClick={() => setEdit({ isNew: true, id: sid(), name: "", shortcut: "", category: "Utility", status: "Pending", body: "Hi {{1}}, " })}>New template</NewButton>} />
      <table className="w-full border-separate border-spacing-0 table-fixed">
        <colgroup><col className="w-[190px]" /><col className="w-[100px]" /><col className="w-[96px]" /><col className="w-[110px]" /><col /></colgroup>
        <thead><tr><STh>Name</STh><STh>Shortcut</STh><STh>Category</STh><STh>Status</STh><STh>Preview</STh></tr></thead>
        <tbody>
          {s.templates.map((t) => (
            <tr key={t.id} tabIndex={0} onClick={() => setEdit(t)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setEdit(t); } }} className="cursor-pointer hover:bg-surface-subtle">
              <STd className="font-medium truncate">{t.name}</STd>
              <STd><code className="rounded bg-surface-hover px-1.5 py-0.5 text-small text-ink-3">/{t.shortcut}</code></STd>
              <STd className="text-ink-3">{t.category}</STd>
              <STd><span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${t.status === "Approved" ? "bg-emerald-500" : "bg-amber-500"}`} />{t.status}</span></STd>
              <STd className="text-ink-4 truncate">{t.body}</STd>
            </tr>
          ))}
        </tbody>
      </table>
      {edit && (
        <Modal title={edit.isNew ? "New template" : edit.name} onClose={() => setEdit(null)} width={720}>
          <div className="p-5 grid grid-cols-[minmax(0,1fr)_300px] gap-5">
            <div className="space-y-4">
              <Field label="Name" required><input autoFocus={edit.isNew} className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Shortcut"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 text-body">/</span><input className={`${inputCls} pl-6`} value={edit.shortcut} onChange={(e) => setEdit({ ...edit, shortcut: e.target.value.replace(/[^a-z0-9-]/gi, "").toLowerCase() })} /></div></Field>
                <Field label="Category"><select className={inputCls} value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}><option>Utility</option><option>Marketing</option></select></Field>
              </div>
              <Field label="Message"><textarea rows={6} className={`${inputCls} h-auto py-2 resize-none leading-relaxed`} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
              <div className="text-small leading-4 text-ink-4">Use {"{{1}}"}, {"{{2}}"} for values filled in when sending. Editing an approved template sends it back to Meta for review.</div>
            </div>
            <div>
              <div className="text-small leading-4 text-ink-3 mb-1.5">Preview</div>
              <WaBubble body={edit.body || " "} />
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 pb-5">
            {!edit.isNew && <button onClick={() => { remove("templates", edit.id, "Template deleted"); setEdit(null); }} className="text-body text-ink-4 hover:text-red-700">Delete</button>}
            <SecondaryButton className="ml-auto" onClick={() => setEdit(null)}>Cancel</SecondaryButton>
            <PrimaryButton
              disabled={!edit.name.trim() || !edit.shortcut || !edit.body.trim()}
              onClick={() => {
                const { isNew, ...t } = edit;
                const orig = s.templates.find((x) => x.id === t.id);
                const changed = !orig || orig.body !== t.body || orig.category !== t.category;
                const next = { ...t, status: changed ? "Pending" : t.status };
                if (isNew) upd("templates", (ts) => [...ts, next]);
                else patch("templates", t.id, next);
                if (changed) showToast("Submitted to Meta for approval");
                setEdit(null);
              }}
            >
              {edit.isNew ? "Submit for approval" : "Save"}
            </PrimaryButton>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ----- Connections ----- */
function CopyRow({ label, value, showToast, mask }) {
  return (
    <div className="mt-2">
      <div className="text-small leading-4 text-ink-4 mb-1">{label}</div>
      <div className="flex items-center gap-1 rounded-md border border-line bg-surface-subtle pl-2.5 pr-1 h-8">
        <code className="flex-1 truncate text-small text-ink-2">{mask ? "•".repeat(18) + value.slice(-4) : value}</code>
        <button onClick={() => copyText(value, showToast)} className="h-6 w-6 rounded flex items-center justify-center text-ink-4 hover:bg-white hover:text-ink" aria-label={`Copy ${label}`}><Copy className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
function ConnCard({ icon: Icon, name, sub, connected, onToggle, details = [], children }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg border border-line flex items-center justify-center text-ink-2 shrink-0"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-body font-medium">{name}</div>
          <div className="text-small leading-4 text-ink-4">{sub}</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-small ${connected ? "text-emerald-700" : "text-ink-4"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-line-heavy"}`} />{connected ? "Connected" : "Not connected"}
        </span>
      </div>
      {connected && details.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-small">
          {details.map(([k, v]) => (
            <React.Fragment key={k}><span className="text-ink-4">{k}</span><span className="text-right tabular-nums">{v}</span></React.Fragment>
          ))}
        </div>
      )}
      {connected && children}
      <div className="mt-4 flex justify-end">
        {connected ? <SecondaryButton onClick={onToggle}>Disconnect</SecondaryButton> : <PrimaryButton onClick={onToggle}>Connect</PrimaryButton>}
      </div>
    </div>
  );
}
function ConnectionSettings({ which, s, upd, patch, remove, showToast }) {
  const c = s.connections;
  const toggle = (k, name) => {
    upd("connections", (x) => ({ ...x, [k]: !x[k] }));
    showToast(`${name} ${c[k] ? "disconnected" : "connected"}`);
  };
  if (which === "wa-api")
    return (
      <>
        <SHeader title="WhatsApp API" desc="The WhatsApp Business number you chat from." action={<NewButton onClick={() => showToast("Adding a second number needs Meta Business verification")}>Add number</NewButton>} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConnCard icon={WhatsAppIcon} name="WhatsApp Business · Cloud API" sub="Meta Business Manager" connected={c.whatsapp} onToggle={() => toggle("whatsapp", "WhatsApp")} details={[["Number", "+91 80 4718 2290"], ["Display name", "Cradlewell"], ["Quality rating", "High"], ["Messaging limit", "1K / day"]]}>
            <CopyRow label="Webhook URL" value="https://crm.cradlewell.com/api/webhooks/whatsapp" showToast={showToast} />
            <CopyRow label="Verify token" value="cw_wa_verify_8f3k21" mask showToast={showToast} />
          </ConnCard>
        </div>
      </>
    );
  if (which === "payments")
    return (
      <>
        <SHeader title="Payments" desc="Payment links sent from a lead, and the webhooks that mark it paid." action={<NewButton onClick={() => showToast("Pick a provider below to connect")}>New provider</NewButton>} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConnCard icon={CreditCard} name="Razorpay" sub="Payment links and UPI" connected={c.razorpay} onToggle={() => toggle("razorpay", "Razorpay")} details={[["Mode", "Live"], ["Link expiry", "48 hours"], ["Last payment", "Today, 4:12 pm"]]}>
            <CopyRow label="Webhook URL" value="https://crm.cradlewell.com/api/webhooks/razorpay" showToast={showToast} />
          </ConnCard>
          <ConnCard icon={Wallet} name="Cashfree" sub="Backup payment gateway" connected={c.cashfree} onToggle={() => toggle("cashfree", "Cashfree")} details={[["Mode", "Live"]]}>
            <CopyRow label="Webhook URL" value="https://crm.cradlewell.com/api/webhooks/cashfree" showToast={showToast} />
          </ConnCard>
        </div>
      </>
    );
  return (
    <>
      <SHeader title="n8n and webhooks" desc="Automations running in n8n, the booking service, and events the CRM sends out." action={<NewButton onClick={() => upd("webhooks", (w) => [...w, { id: sid(), event: "lead.created", url: "https://", on: true }])}>New webhook</NewButton>} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConnCard icon={Workflow} name="n8n" sub="Self-hosted automations" connected={c.n8n} onToggle={() => toggle("n8n", "n8n")} details={[["Active workflows", "12"], ["Last run", "2 min ago"]]}>
          <CopyRow label="Incoming webhook" value="https://crm.cradlewell.com/api/webhooks/n8n" showToast={showToast} />
        </ConnCard>
        <ConnCard icon={CalendarCheck} name="Cal.com" sub="Consult availability and booking" connected={c.calcom} onToggle={() => toggle("calcom", "Cal.com")} details={[["Event type", "Care consult · 30 min"]]}>
          <CopyRow label="Booking webhook" value="https://crm.cradlewell.com/api/webhooks/calcom" showToast={showToast} />
        </ConnCard>
      </div>
      <h2 className="mt-10 mb-2 text-body font-medium">Outgoing webhooks</h2>
      <table className="w-full border-separate border-spacing-0">
        <thead><tr><STh>Event</STh><STh>Sends to</STh><STh className="text-right">On</STh><STh className="w-8" /></tr></thead>
        <tbody>
          {s.webhooks.map((w) => (
            <tr key={w.id} className="group hover:bg-surface-subtle">
              <STd><InlineSelect value={w.event} onChange={(v) => patch("webhooks", w.id, { event: v })} options={["lead.created", "lead.stage_changed", "followup.overdue", "consult.booked", "consult.no_show", "payment.received"]} className="font-mono text-small" /></STd>
              <STd><InlineInput value={w.url} onChange={(v) => patch("webhooks", w.id, { url: v })} className="w-full font-mono text-small text-ink-3" /></STd>
              <STd className="text-right"><SToggle on={w.on} onChange={(v) => patch("webhooks", w.id, { on: v })} label="Webhook on" /></STd>
              <STd><RowDelete onClick={() => remove("webhooks", w.id, "Webhook removed")} /></STd>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ---------- Shell ---------- */

function SettingsPage({ settings, setSettings, showToast, leads }) {
  const [page, setPage] = useState("rules");
  const upd = useCallback((key, fn) => setSettings((s) => ({ ...s, [key]: typeof fn === "function" ? fn(s[key]) : fn })), [setSettings]);
  const patch = useCallback((key, id, p) => upd(key, (list) => list.map((x) => (x.id === id ? { ...x, ...p } : x))), [upd]);
  const remove = (key, id, msg) => {
    let snapshot;
    setSettings((s) => {
      snapshot = s[key];
      return { ...s, [key]: s[key].filter((x) => x.id !== id) };
    });
    showToast(msg, () => setSettings((s) => ({ ...s, [key]: snapshot })));
  };
  const props = { s: settings, upd, patch, remove, showToast, leads };
  const all = SETTINGS_MENU.flatMap((g) => g.items);
  return (
    <div className="h-[calc(100dvh-48px)] md:h-[100dvh] flex">
      <nav aria-label="Settings" className="hidden md:block w-[200px] shrink-0 bg-surface-sidebar border-r border-line overflow-y-auto px-1.5 py-6">
        <div className="px-2 mb-4 text-title-sm font-semibold">Settings</div>
        {SETTINGS_MENU.map((g) => (
          <div key={g.group} className="mb-4">
            <div className="px-2 mb-1 text-caption font-medium text-ink-4">{g.group}</div>
            {g.items.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setPage(id)} className={`w-full h-8 rounded-md px-2 flex items-center gap-1.5 text-body transition-colors duration-150 ${page === id ? "bg-white text-ink font-medium shadow-ring-line" : "text-ink-2 hover:bg-surface-active hover:text-ink"}`}>
                <Icon className="h-3.5 w-3.5 shrink-0 text-ink-4" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="md:hidden px-5 pt-5">
          <select value={page} onChange={(e) => setPage(e.target.value)} className={inputCls}>
            {SETTINGS_MENU.map((g) => <optgroup key={g.group} label={g.group}>{g.items.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</optgroup>)}
          </select>
        </div>
        <div className="px-5 md:px-10 pt-8 md:pt-10 pb-16 max-w-[980px]" key={page}>
          {page === "notifications" && <NotificationSettings {...props} />}
          {page === "stages" && <StageSettings {...props} />}
          {page === "reasons" && <ReasonSettings {...props} />}
          {page === "fields" && <FieldSettings {...props} />}
          {page === "packages" && <PackageSettings {...props} />}
          {page === "places" && <PlaceSettings {...props} />}
          {page === "rules" && <RuleSettings {...props} />}
          {page === "templates" && <TemplateSettings {...props} />}
          {(page === "wa-api" || page === "payments" || page === "n8n") && <ConnectionSettings which={page} {...props} />}
          {!all.some(([id]) => id === page) && null}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Saved views (sidebar) — built-ins use live rules, custom views store Leads filters
   ========================================================================== */

const PRICE_RE = /price|cost|how much|₹|rate|charges|fees?\b/i;
function savedViewCtx(leads, chats, now) {
  const priceAsk = new Set();
  const noReply = new Set();
  const withChat = new Set();
  chats.forEach((c) => {
    if (!c.leadId) return;
    withChat.add(c.leadId);
    const talk = c.messages.filter((m) => m.from !== "event");
    if (talk.some((m) => m.from === "lead" && now - m.at < DAY && PRICE_RE.test(m.text || ""))) priceAsk.add(c.leadId);
    const last = talk[talk.length - 1];
    if (last && last.from !== "lead" && now - last.at > 2 * DAY) noReply.add(c.leadId);
  });
  leads.forEach((l) => {
    const la = l.lastActivity;
    if (l.tag === "Price concern" && !la.none && now - la.at < DAY) priceAsk.add(l.id);
    // No chat thread loaded: last activity was our WhatsApp and nothing since
    if (!withChat.has(l.id) && !la.none && la.type === "WhatsApp" && now - la.at > 2 * DAY) noReply.add(l.id);
  });
  return { priceAsk, noReply, now };
}

const BUILTIN_VIEWS = [
  {
    id: "hot", label: "Hot leads", icon: Flame, note: "score ≥ 70, born ≤ 3 days or price ask in 24h",
    desc: "Lead score 70 or more, OR baby born in the last 3 days, OR asked about price in the last 24 hours. Won and lost leads are left out.",
    match: (l, x) => !["Won", "Lost"].includes(l.stage) && (l.score >= 70 || (l.careKind === "B" && l.babyDob && x.now - l.babyDob.getTime() <= 3 * DAY) || x.priceAsk.has(l.id)),
  },
  {
    id: "noreply", label: "No reply 48h", icon: Clock, note: "our last WhatsApp > 48h, no reply",
    desc: "Our last WhatsApp went out more than 48 hours ago and the lead hasn't replied. Won and lost leads are left out.",
    match: (l, x) => !["Won", "Lost"].includes(l.stage) && x.noReply.has(l.id),
  },
  {
    id: "due30", label: "Due in 30 days", icon: Calendar, note: "pregnancy, due date ≤ 30 days",
    desc: "Care stage is Pregnancy and the due date is within the next 30 days.",
    match: (l, x) => l.careKind === "P" && l.dueDate && l.dueDate.getTime() >= startOfDay(new Date(x.now)).getTime() && l.dueDate.getTime() - x.now <= 30 * DAY,
  },
  { id: "payment", label: "Payment pending", icon: IndianRupee, note: "stage is Payment pending", desc: "Sales stage is Payment pending.", match: (l) => l.stage === "Payment pending" },
  {
    id: "deferred", label: "Deferred", icon: PauseCircle, note: "sorted by deferred-until date", desc: "Sales stage is Deferred, soonest deferred-until date first.",
    match: (l) => l.stage === "Deferred", sort: { field: "deferred", dir: "asc" },
  },
];
const BUILTIN_VIEW = Object.fromEntries(BUILTIN_VIEWS.map((v) => [v.id, v]));
// Full match (sidebar counts). Custom views = tab + filters + optional built-in base.
const describeFilters = (tab, filters, base) =>
  [
    base && BUILTIN_VIEW[base]?.label,
    tab !== "all" && `${LEAD_TABS.find((t) => t.id === tab).label} tab`,
    ...Object.entries(filters).filter(([, v]) => v.length).map(([f, v]) => `${FIELD[f].label} ${v.length > 1 ? "is any of" : "is"} ${v.join(", ")}`),
  ].filter(Boolean);

function NewViewModal({ state, customViews, onClose, onSave }) {
  const [name, setName] = useState("");
  const base = state.viewId ? (BUILTIN_VIEW[state.viewId] ? state.viewId : customViews.find((v) => v.id === state.viewId)?.base || null) : null;
  const parts = describeFilters(state.tab, state.filters, base);
  const clash = [...BUILTIN_VIEWS, ...customViews].some((v) => v.label.toLowerCase() === name.trim().toLowerCase());
  const ok = name.trim() && parts.length && !clash;
  return (
    <Modal title="New view" onClose={onClose}>
      <div className="p-5 space-y-4">
        <Field label="View name" required>
          <input autoFocus className={inputCls} value={name} placeholder="e.g. Cloudnine pregnancies" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ok && onSave(name.trim(), base)} />
        </Field>
        {clash && <div className="-mt-2 text-small leading-4 text-red-700">A view with this name already exists.</div>}
        <div>
          <div className="text-small leading-4 text-ink-3 mb-1.5">Saves the current Leads filters</div>
          {parts.length ? (
            <div className="flex flex-wrap gap-1.5">
              {parts.map((p) => <span key={p} className="h-6 inline-flex items-center rounded-md border border-line-strong bg-surface-hover px-2 text-small">{p}</span>)}
            </div>
          ) : (
            <div className="text-body text-ink-4">No filters on the Leads page yet. Add a filter or a tab there first, then save it as a view.</div>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 px-5 pb-5">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton disabled={!ok} onClick={() => onSave(name.trim(), base)}>Save view</PrimaryButton>
      </div>
    </Modal>
  );
}

/* ==========================================================================
   PAID CUSTOMERS — Won leads become customers (same record, full history)
   ========================================================================== */

const EXPERTS = [
  { id: "L", name: "Lactation consultant", short: "Lactation", person: "Kavya Menon, IBCLC" },
  { id: "Y", name: "Yoga", short: "Yoga", person: "Shruti Rao" },
  { id: "N", name: "Nutrition", short: "Nutrition", person: "Dr. Pooja Hegde" },
  { id: "M", name: "Mental health therapist", short: "Mental health", person: "Dr. Rhea Kapoor" },
  { id: "P", name: "Paediatrician", short: "Paediatrician", person: "Dr. Arjun Rao" },
];
const EXPERT = Object.fromEntries(EXPERTS.map((e) => [e.id, e]));
// Live pricing and inclusions — seeded here, kept in sync from Settings → Packages and services (draft prices)
const EXPERT_CFG = {
  L: { single: 2500, pack4: 9000, pack8: 16000, home: true, video: true, included: ["Together", "Complete"] },
  Y: { single: 1500, pack4: 5500, pack8: 10000, home: true, video: true, included: [] },
  N: { single: 1800, pack4: 6500, pack8: 12000, home: false, video: true, included: ["Complete"] },
  M: { single: 2500, pack4: 9000, pack8: 17000, home: false, video: true, included: [] },
  P: { single: 2000, pack4: 7000, pack8: 13000, home: true, video: true, included: ["Complete"] },
};
const expertPrice = (id, pack) => (pack === 1 ? EXPERT_CFG[id].single : EXPERT_CFG[id][`pack${pack}`]);
const expertModes = (id) => [EXPERT_CFG[id].home && "Home visit", EXPERT_CFG[id].video && "Video"].filter(Boolean);

/* ---------- Customer helpers ---------- */
const ageDays = (l, now) => (l.babyDob ? Math.floor((now - l.babyDob) / DAY) : null);
function carePlan(l, now) {
  if (!l.careStart || !l.careEnd) return null;
  const total = serviceDays(l);
  const today = startOfDay(new Date(now));
  const day = dayDiff(today, l.careStart) + 1;
  const left = dayDiff(l.careEnd, today);
  const status = left < 0 ? "completed" : day < 1 ? "upcoming" : "active";
  return { total, day: Math.max(0, Math.min(day, total)), left, status, pct: status === "completed" ? 1 : Math.max(0, Math.min(1, (day - 0.5) / total)) };
}
const liveSessions = (l) => (l.sessions || []).filter((s) => s.status !== "Cancelled");
const isIncluded = (l, id) => !!l.package && EXPERT_CFG[id].included.includes(l.package);
const paidTotal = (l) => (l.payments || []).reduce((s, p) => s + p.amount, 0);
const nextSession = (l, now) => (l.sessions || []).filter((s) => s.status === "Booked" && s.at > now).sort((a, b) => a.at - b.at)[0] || null;
const fmtSessionWhen = (d, now) => `${dayDiff(d, now) === 0 ? "Today" : dayDiff(d, now) === 1 ? "Tomorrow" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(d)}`;

// "Suggested next": simple rules by baby age (days). First rule that isn't used or included wins.
const SUGGEST_RULES = [
  { expert: "L", label: "Lactation consult", test: (a) => a >= 2 && a <= 7 },
  { expert: "P", label: "Paediatrician home check", test: (a) => a > 7 && a <= 14 },
  { expert: "N", label: "Postpartum nutrition", test: (a) => a > 14 && a <= 21 },
  { expert: "M", label: "Mental health check-in", test: (a) => a > 14 && a <= 42 },
  { expert: "Y", label: "Postnatal yoga", test: (a) => a > 42 },
  { expert: "P", label: "Monthly paediatrician check", test: (a) => a >= 30, monthly: true },
];
function suggestFor(l, now) {
  const plan = carePlan(l, now);
  if (plan && plan.status === "active" && plan.left <= 7) return { kind: "renew", label: "Renew + expert bundle", expert: null };
  const a = ageDays(l, now);
  if (a == null) return null;
  let included = null;
  for (const r of SUGGEST_RULES) {
    if (!r.test(a)) continue;
    const used = r.monthly
      ? liveSessions(l).some((s) => s.expert === "P" && (s.status === "Booked" || now - s.at < 30 * DAY))
      : liveSessions(l).some((s) => s.expert === r.expert);
    if (used) continue;
    if (isIncluded(l, r.expert)) {
      included = included || { kind: "included", label: `Included in ${l.package}`, expert: r.expert };
      continue;
    }
    return { kind: "expert", label: r.label, expert: r.expert };
  }
  return included;
}

// Make a Won lead a customer (keeps every existing field and its history)
function asCustomer(l, since) {
  const amount = l.amountPaid || packageValue(l);
  return {
    ...l,
    customerSince: l.customerSince || since || new Date(),
    paymentStatus: "Paid",
    bookingStatus: "Confirmed",
    amountPaid: amount,
    nextFollowUp: null,
    needsReply: false,
    sessions: l.sessions || [],
    payments: l.payments || (amount ? [{ id: uid(), label: [l.package, l.shiftType].filter(Boolean).join(" · ") || "Care plan", amount, at: since || new Date(), method: "Razorpay" }] : []),
    caregiver: l.caregiver || null,
    caregiverNote: l.caregiverNote || "",
  };
}

/* ---------- Mock customers: 64 total = 41 active (6 ending ≤ 7 days) + 23 completed ---------- */

/* ---------- Small pieces ---------- */

function ExpertDot({ expertId, lead, size = 18 }) {
  const e = EXPERT[expertId];
  const ss = liveSessions(lead).filter((s) => s.expert === expertId);
  const booked = ss.filter((s) => s.status === "Booked").length;
  const done = ss.filter((s) => s.status === "Done").length;
  const used = ss.length > 0;
  const inc = isIncluded(lead, expertId);
  return (
    <span className="relative group/x inline-flex">
      <span
        style={{ width: size, height: size }}
        className={`rounded-full text-micro font-semibold flex items-center justify-center transition-colors ${used ? "bg-teal-600 text-white" : "border border-line-strong text-ink-4"}`}
      >
        {expertId}
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 hidden group-hover/x:block whitespace-nowrap rounded-md bg-ink px-2 py-1.5 text-caption leading-snug text-white shadow-lg">
        <span className="block font-medium">{e.name}</span>
        <span className="block text-white/60">{e.person}</span>
        <span className="block text-white/80">
          {used ? [done && `${done} done`, booked && `${booked} booked`].filter(Boolean).join(" · ") : "Not used yet"}
          {inc ? ` · included in ${lead.package}` : ""}
        </span>
      </span>
    </span>
  );
}

function PlanProgress({ plan, compact }) {
  if (!plan) return <span className="text-small text-ink-4">Care plan not set</span>;
  const ending = plan.status === "active" && plan.left <= 7;
  return (
    <div className={compact ? "w-[150px]" : ""}>
      <div className="h-[3px] rounded-full bg-surface-active overflow-hidden">
        <div className={`h-full rounded-full ${plan.status === "completed" ? "bg-line-heavy" : "bg-ink-2"}`} style={{ width: `${Math.round(plan.pct * 100)}%` }} />
      </div>
      <div className={`mt-1 text-small tabular-nums ${ending ? "text-amber-700" : "text-ink-4"}`}>
        {plan.status === "completed" ? "Completed" : plan.status === "upcoming" ? `Starts in ${-plan.day + 1 || 1} days` : ending ? (plan.left === 0 ? "Ends today" : `Ends in ${plan.left} day${plan.left > 1 ? "s" : ""}`) : `Day ${plan.day} of ${plan.total}`}
      </div>
    </div>
  );
}

// quiet: the same suggestion as the row above. It stays clickable but drops back so a run of repeats doesn't read as noise.
function SuggestionChip({ s, onClick, quiet }) {
  if (!s) return <span className="text-ink-faint">—</span>;
  if (s.kind === "included") return <span className="text-small text-ink-4">{s.label}</span>;
  return (
    <button onClick={onClick} className={`h-7 -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 text-small ${quiet ? "text-ink-4" : "text-ink-2"} hover:bg-surface-hover hover:text-ink transition-colors duration-150 max-w-full`}>
      <Plus className="h-3.5 w-3.5 shrink-0 text-ink-placeholder" strokeWidth={1.5} /> <span className="truncate">{s.label}</span>
    </button>
  );
}

const SESSION_STATUS = { Booked: "bg-blue-50 text-blue-700", Done: "bg-emerald-50 text-emerald-700", Cancelled: "bg-surface-hover text-ink-4" };

/* ---------- Record: highlights + Services tab ---------- */

function CustomerServices({ lead, now, onUpdate, onEvent, onSell, showToast }) {
  const plan = carePlan(lead, now);
  const sessions = [...(lead.sessions || [])].sort((a, b) => b.at - a.at);
  const [editNote, setEditNote] = useState(false);
  const markPaid = (s) => {
    const sessionsNext = lead.sessions.map((x) => (x.id === s.id ? { ...x, paid: true } : x));
    const pay = { id: uid(), label: `${EXPERT[s.expert].name}${s.pack ? ` · pack of ${s.pack}` : " · 1 session"}`, amount: s.price, at: new Date(), method: "Razorpay" };
    onUpdate(lead.id, { sessions: sessionsNext, payments: [...(lead.payments || []), pay] });
    onEvent(lead.id, { id: uid(), type: "payment", status: "paid", amount: s.price, by: ME, at: new Date() });
    showToast(`Marked ${fmtINR(s.price)} as paid`);
  };
  const setStatus = (s, status) => onUpdate(lead.id, { sessions: lead.sessions.map((x) => (x.id === s.id ? { ...x, status } : x)) });
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-line p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-small leading-4 text-ink-4">Care plan</div>
            <div className="mt-0.5 text-title-sm font-medium">{[lead.package, lead.shiftType && (lead.shiftType === "24 hrs" ? "24 hrs" : `${lead.shiftType} ${lead.shiftHours}h`)].filter(Boolean).join(" · ") || "Not set"}</div>
            <div className="mt-0.5 text-small text-ink-4 tabular-nums">{lead.careStart && lead.careEnd ? `${fmtShortDate(lead.careStart)} – ${fmtShortDate(lead.careEnd)} · ${serviceDays(lead)} days` : "Dates not set"}</div>
          </div>
          <div className="text-right">
            <div className="text-small leading-4 text-ink-4">Plan value</div>
            <div className="text-title-sm tabular-nums">{fmtINR(lead.amountPaid || packageValue(lead))}</div>
          </div>
        </div>
        <div className="mt-3"><PlanProgress plan={plan} /></div>
        <div className="mt-3 pt-3 border-t border-line-subtle text-body flex items-start gap-2">
          <HandHeart className="h-3.5 w-3.5 mt-0.5 text-ink-4 shrink-0" />
          {editNote ? (
            <input autoFocus defaultValue={lead.caregiverNote} onBlur={(e) => { onUpdate(lead.id, { caregiverNote: e.target.value }); setEditNote(false); }} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className={`${inputCls} h-7`} />
          ) : (
            <button onClick={() => setEditNote(true)} className="text-left text-ink-2 hover:text-ink">
              <span className="text-ink-4">Caregiver {lead.caregiver ? <span className="text-ink-2">{lead.caregiver}</span> : "not assigned"} · </span>
              {lead.caregiverNote || <span className="text-ink-4">Add a note</span>}
            </button>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center mb-2">
          <h3 className="text-body font-medium">Expert sessions <span className="text-ink-4 font-normal tabular-nums">{liveSessions(lead).length}</span></h3>
          <button onClick={() => onSell(null)} className="ml-auto text-small text-ink-3 hover:text-ink inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Sell a service</button>
        </div>
        {sessions.length ? (
          <table className="w-full text-body border-separate border-spacing-0">
            <thead>
              <tr className="text-small leading-4 text-ink-4">
                {["Expert", "Date", "Status", "Mode", "Price", "Paid"].map((h, i) => <th key={h} className={`h-8 font-medium border-b border-line ${i >= 4 ? "text-right" : "text-left"}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-surface-subtle">
                  <td className="h-10 border-b border-line-subtle"><span className="inline-flex items-center gap-2"><ExpertDot expertId={s.expert} lead={{ ...lead, sessions: [s] }} size={16} />{EXPERT[s.expert].name}{s.pack && <span className="text-caption text-ink-4">· pack of {s.pack}</span>}</span></td>
                  <td className="border-b border-line-subtle tabular-nums text-ink-3">{fmtSessionWhen(s.at, now)}</td>
                  <td className="border-b border-line-subtle">
                    <select value={s.status} onChange={(e) => setStatus(s, e.target.value)} className={`h-6 rounded-full px-2 text-small appearance-none cursor-pointer outline-none ${SESSION_STATUS[s.status]}`}>
                      {Object.keys(SESSION_STATUS).map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </td>
                  <td className="border-b border-line-subtle text-ink-3">{s.mode}</td>
                  <td className="border-b border-line-subtle text-right tabular-nums">{s.price ? fmtINR(s.price) : <span className="text-ink-4">Included</span>}</td>
                  <td className="border-b border-line-subtle text-right">
                    {s.price === 0 ? <span className="text-ink-faint">—</span> : s.paid ? <span className="text-emerald-700 text-small">Paid</span> : s.status === "Cancelled" ? <span className="text-ink-faint">—</span> : (
                      <button onClick={() => markPaid(s)} className="h-6 rounded-md border border-amber-200 bg-amber-50 px-2 text-small text-amber-800 hover:bg-amber-100">Unpaid · mark paid</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="rounded-lg border border-dashed border-line-control px-4 py-6 text-center text-body text-ink-4">No expert sessions yet</div>
        )}
      </section>

      <section>
        <h3 className="text-body font-medium mb-2">Payments</h3>
        <table className="w-full text-body border-separate border-spacing-0">
          <tbody>
            {[...(lead.payments || [])].sort((a, b) => b.at - a.at).map((p) => (
              <tr key={p.id} className="hover:bg-surface-subtle">
                <td className="h-10 border-b border-line-subtle">{p.label}</td>
                <td className="border-b border-line-subtle text-ink-4 tabular-nums">{fmtShortDate(p.at)}</td>
                <td className="border-b border-line-subtle text-ink-4">{p.method}</td>
                <td className="border-b border-line-subtle text-right tabular-nums">{fmtINR(p.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className="h-10 font-medium" colSpan={3}>Total paid</td>
              <td className="text-right font-medium tabular-nums">{fmtINR(paidTotal(lead))}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

/* ---------- Sell a service ---------- */

function SellServiceModal({ customers, initial, onClose, onSave, now }) {
  const [leadId, setLeadId] = useState(initial.leadId || null);
  const lead = customers.find((c) => c.id === leadId) || null;
  const [expert, setExpert] = useState(() => initial.expert || (initial.leadId ? suggestFor(customers.find((c) => c.id === initial.leadId), now)?.expert : null) || "L");
  const [pack, setPack] = useState(1);
  const [mode, setMode] = useState(() => expertModes(expert)[0]);
  const [price, setPrice] = useState(() => expertPrice(expert, 1));
  const [when, setWhen] = useState(() => toLocalInput(atTen(1)).slice(0, 16));
  const [sendLink, setSendLink] = useState(true);
  const pickPricing = (e, p) => {
    setPrice(expertPrice(e, p));
    if (!expertModes(e).includes(mode)) setMode(expertModes(e)[0]);
  };
  const names = customers.map((c) => c.name);
  const inc = lead && isIncluded(lead, expert);
  const seg = (on) => `h-8 flex-1 rounded-md text-body transition-colors duration-150 ${on ? "bg-white text-ink font-medium shadow-ring-line" : "text-ink-3 hover:text-ink"}`;
  return (
    <Modal title="Sell a service" onClose={onClose} width={480}>
      <div className="p-5 space-y-4">
        <Field label="Customer" required>
          <SearchSelect value={lead?.name || ""} onChange={(n) => setLeadId(customers.find((c) => c.name === n)?.id)} options={names} placeholder="Search customers" />
          {lead && <div className="mt-1 text-small text-ink-4">{[lead.package, babyAge(lead, now) && `baby ${babyAge(lead, now) || "—"}`, suggestFor(lead, now)?.kind === "expert" && `suggested: ${suggestFor(lead, now).label.toLowerCase()}`].filter(Boolean).join(" · ")}</div>}
        </Field>
        <Field label="Expert type">
          <select className={inputCls} value={expert} onChange={(e) => { setExpert(e.target.value); pickPricing(e.target.value, pack); }}>
            {EXPERTS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          {inc && (
            <div className="mt-1 text-small text-ink-4">
              Included in {lead.package}.{" "}
              {price !== 0 && <button onClick={() => setPrice(0)} className="text-brand hover:underline">Use ₹0</button>}
            </div>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sessions">
            <div className="flex rounded-lg border border-line-control bg-surface-subtle p-0.5">
              {[1, 4, 8].map((p) => <button key={p} onClick={() => { setPack(p); pickPricing(expert, p); }} className={seg(pack === p)}>{p === 1 ? "Single" : `Pack ${p}`}</button>)}
            </div>
          </Field>
          <Field label="Mode">
            <div className="flex rounded-lg border border-line-control bg-surface-subtle p-0.5">
              {expertModes(expert).map((m) => <button key={m} onClick={() => setMode(m)} className={seg(mode === m)}>{m}</button>)}
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₹)">
            <input type="number" min={0} step={100} className={`${inputCls} tabular-nums`} value={price} onChange={(e) => setPrice(Math.max(0, +e.target.value || 0))} />
            <div className="mt-1 text-small text-ink-4 tabular-nums">{pack > 1 ? `${fmtINR(Math.round(price / pack))} per session · ` : ""}from Settings</div>
          </Field>
          <Field label={pack > 1 ? "First session" : "Preferred date and time"}>
            <input type="datetime-local" className={`${inputCls} tabular-nums`} value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2.5 text-body cursor-pointer">
          <SToggle on={sendLink && price > 0} onChange={(v) => setSendLink(v)} label="Send payment link on WhatsApp" />
          <span className={price > 0 ? "" : "text-ink-4"}>Send payment link on WhatsApp</span>
        </label>
      </div>
      <div className="flex items-center gap-2 px-5 pb-5">
        <SecondaryButton className="ml-auto" onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton className="whitespace-nowrap" disabled={!lead || !when} onClick={() => onSave({ leadId: lead.id, expert, pack, mode, price, when: new Date(when), sendLink: sendLink && price > 0 })}>
          Sell {fmtINR(price)}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

/* ---------- Page ---------- */

const CUSTOMER_TABS = [
  { id: "active", label: "Active care" },
  { id: "ready", label: "Ready for experts" },
  { id: "ending", label: "Ending in 7 days" },
  { id: "completed", label: "Completed" },
];

function CustomersPage({ leads, setLeads, now, showToast, dismissToast, timelines, setTimelines, onSell, recordRequest, expertsKey, tabRequest, consults = [], followups = [], setFollowups }) {
  const [tab, setTab] = useState(tabRequest?.tab || "active");
  useEffect(() => {
    if (tabRequest) setTab(tabRequest.tab);
  }, [tabRequest]);
  const [recordId, setRecordId] = useState(null);
  const [recordView, setRecordView] = useState("simple");
  const [recordTab, setRecordTab] = useState(null);
  const [pendingStage, setPendingStage] = useState(null);
  const minute = Math.floor(now / 60000);

  useEffect(() => {
    if (recordRequest) {
      setRecordTab(recordRequest.tab || null);
      setRecordId(recordRequest.id);
    }
  }, [recordRequest]);

  const customers = useMemo(() => leads.filter((l) => l.stage === "Won"), [leads]);
  const info = useMemo(() => {
    const m = {};
    customers.forEach((l) => {
      const plan = carePlan(l, now);
      m[l.id] = { plan, done: plan?.status === "completed", sugg: suggestFor(l, now), next: nextSession(l, now), paid: paidTotal(l), age: ageDays(l, now) };
    });
    return m;
  }, [customers, minute, expertsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const inTab = {
    active: (l) => !info[l.id].done,
    ready: (l) => ["expert", "renew"].includes(info[l.id].sugg?.kind),
    ending: (l) => !info[l.id].done && info[l.id].plan && info[l.id].plan.left <= 7,
    completed: (l) => info[l.id].done,
  };
  const counts = Object.fromEntries(CUSTOMER_TABS.map((t) => [t.id, customers.filter(inTab[t.id]).length]));
  const rows = customers.filter(inTab[tab]).sort((a, b) => {
    const A = info[a.id], B = info[b.id];
    if (tab === "completed") return b.careEnd - a.careEnd;
    if (tab === "ready") return (A.age ?? 999) - (B.age ?? 999);
    return (A.plan?.left ?? 999) - (B.plan?.left ?? 999);
  });

  // KPIs across all customers
  const allSessions = customers.flatMap((l) => (l.sessions || []).filter((s) => s.status !== "Cancelled"));
  const soldSessions = allSessions.filter((s) => s.price > 0);
  const expertRevenue = soldSessions.reduce((s, x) => s + x.price, 0);
  const revenue = customers.reduce((s, l) => s + info[l.id].paid, 0);
  const renewedN = customers.filter((l) => l.renewed).length;
  const endedN = customers.filter((l) => info[l.id].done).length;
  const renewalRate = renewedN + endedN ? (renewedN / (renewedN + endedN)) * 100 : 0;

  const updateLead = (id, patch) => setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const logEvent = (id, ev, transform) =>
    setTimelines((t) => {
      const lead = leads.find((l) => l.id === id);
      const cur = t[id] || (lead ? buildTimeline(lead) : []);
      return { ...t, [id]: transform ? transform(cur) : [ev, ...cur] };
    });

  const recordLead = recordId ? leads.find((l) => l.id === recordId) : null;
  if (recordLead)
    return (
      <>
        <LeadRecord
          key={recordLead.id + (recordTab || "")}
          lead={recordLead}
          leads={leads}
          now={now}
          crumbRoot="Paid customers"
          tabLabel={CUSTOMER_TABS.find((t) => t.id === tab).label}
          initialTab={recordTab}
          timeline={timelines[recordLead.id] || buildTimeline(recordLead)}
          onBack={() => { setRecordId(null); setRecordTab(null); }}
          onUpdate={updateLead}
          onEvent={logEvent}
          showToast={showToast}
          dismissToast={dismissToast}
          onRequestStage={(id, stage) => setPendingStage({ ids: [id], stage })}
          onSell={(expert) => onSell(recordLead.id, expert)}
          consults={consults}
          followups={followups}
          setFollowups={setFollowups}
          onDelete={(id) => {
            const snapshot = leads;
            setRecordId(null);
            setLeads((prev) => prev.filter((x) => x.id !== id));
            showToast(`Deleted ${recordLead.name}`, () => { setLeads(snapshot); dismissToast(); });
          }}
          view={recordView}
          setView={setRecordView}
        />
        {pendingStage && (
          <StageExtraModal
            pending={pendingStage}
            count={1}
            onCancel={() => setPendingStage(null)}
            onConfirm={(extra) => {
              updateLead(pendingStage.ids[0], { stage: pendingStage.stage, prevStage: "Won", ...extra });
              showToast(`${recordLead.name} moved to ${pendingStage.stage}`);
              setPendingStage(null);
              setRecordId(null);
            }}
          />
        )}
      </>
    );

  const kpi = (label, value, sub, first) => (
    <div className={first ? "" : "md:border-l border-line md:pl-5"}>
      <div className="text-small leading-4 text-ink-4">{label}</div>
      <div className="mt-1.5 text-h1 leading-none font-medium tracking-[-0.02em] tabular-nums">{value}</div>
      <div className="mt-2 text-small leading-4 text-ink-4 tabular-nums">{sub}</div>
    </div>
  );

  return (
    <div className="h-[calc(100dvh-48px)] md:h-[100dvh] overflow-y-auto">
      <div className="px-5 md:px-8 pt-8 md:pt-10 pb-16">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-h1 font-medium tracking-[-0.01em]">
            Paid customers <span className="text-title-sm font-normal text-ink-4 tabular-nums">{customers.length}</span>
          </h1>
          <PrimaryButton onClick={() => onSell(null, null)} className="inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Sell a service</PrimaryButton>
        </div>

        <div className="mt-6 flex items-center gap-5 border-b border-line overflow-x-auto">
          {CUSTOMER_TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative h-9 shrink-0 flex items-center gap-1.5 text-body transition-colors duration-150 ${tab === t.id ? "text-ink font-medium" : "text-ink-4 hover:text-ink"}`}>
              {t.label}
              <span className="text-caption text-ink-4 font-normal tabular-nums">{counts[t.id]}</span>
              {tab === t.id && <span className="absolute -bottom-px left-0 right-0 h-[1.5px] bg-ink rounded-full" />}
            </button>
          ))}
        </div>

        <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-y-5">
          {kpi("Customer revenue", fmtMoneyShort(revenue), `${customers.length} customers, all time`, true)}
          {kpi("Expert sessions sold", soldSessions.length, `${allSessions.length - soldSessions.length} more included in packages`)}
          {kpi("Expert revenue", fmtMoneyShort(expertRevenue), `${revenue ? ((expertRevenue / revenue) * 100).toFixed(1) : 0}% of customer revenue`)}
          {kpi("Renewal rate", `${Math.round(renewalRate)}%`, `${renewedN} of ${renewedN + endedN} plans that reached the end`)}
        </div>

        <div className="mt-9 flex items-center gap-x-4 gap-y-2 flex-wrap text-small text-ink-4">
          {EXPERTS.map((e) => (
            <span key={e.id} className="inline-flex items-center gap-1.5"><span className="h-4 w-4 rounded-full border border-line-strong text-micro font-semibold flex items-center justify-center text-ink-4">{e.id}</span>{e.short}</span>
          ))}
          <span className="inline-flex items-center gap-1.5 ml-2"><span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> used or booked</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-line-strong" /> not yet</span>
        </div>
        {/* Phones: one card per customer */}
        {!rows.length && <div className="md:hidden py-16 text-center text-body text-ink-4">No customers match these filters</div>}
        <ul className="md:hidden mt-3 divide-y divide-line-subtle border-y border-line-subtle" aria-label="Paid customers">
          {rows.map((l) => {
            const I = info[l.id];
            return (
              <li key={l.id}>
                <button onClick={() => { setRecordTab(null); setRecordId(l.id); }} className="w-full py-3 flex items-start gap-3 text-left">
                  <Avatar name={l.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-3">
                      <span className="font-medium text-ink truncate">{l.name}</span>
                      <span className="ml-auto shrink-0 text-body tabular-nums text-ink">{fmtINR(I.paid)}</span>
                    </span>
                    <span className="block text-small text-ink-4 truncate">{babyAge(l, now) ? `Baby ${babyAge(l, now) || "—"}` : "—"} · {[l.package, l.shiftType].filter(Boolean).join(" · ") || "No plan"}</span>
                    <span className="mt-1.5 block"><PlanProgress plan={I.plan} compact /></span>
                    {I.next && <span className="mt-1 block text-small text-ink-3 truncate">Next: {EXPERT[I.next.expert].short} · {fmtSessionWhen(I.next.at, now)}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="hidden md:block mt-3 overflow-x-auto">
          <table className="w-full min-w-[1080px] text-body border-separate border-spacing-0">
            <thead>
              <tr className="text-small leading-4 text-ink-4">
                {[["Customer", "w-[220px]"], ["Care plan", "w-[210px]"], ["Experts", "w-[150px]"], ["Next session", "w-[190px]"], ["Suggested next", "w-[210px]"], ["Paid", "text-right w-[110px]"], ["", "w-[118px]"]].map(([h, c]) => (
                  <th key={h || "actions"} className={`h-9 font-medium text-left border-b border-line ${c}`}>{h || <span className="sr-only">Actions</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((l, ri) => {
                const I = info[l.id];
                const sameAsAbove = ri > 0 && I.sugg && info[rows[ri - 1].id]?.sugg?.label === I.sugg.label;
                return (
                  <tr key={l.id} tabIndex={0} onClick={() => { setRecordTab(null); setRecordId(l.id); }} onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === "Enter") { setRecordTab(null); setRecordId(l.id); } }} className="group cursor-pointer hover:bg-surface-subtle transition-colors duration-150">
                    <td className="h-[62px] border-b border-line-subtle pr-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={l.name} />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{l.name}</div>
                          <div className="text-small text-ink-4 tabular-nums truncate">{babyAge(l, now) ? `Baby ${babyAge(l, now) || "—"}` : "—"}{l.babies > 1 ? " · twins" : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-line-subtle pr-4">
                      <div className="text-body truncate">{[l.package, l.shiftType].filter(Boolean).join(" · ") || "—"}</div>
                      <div className="mt-1"><PlanProgress plan={I.plan} compact /></div>
                    </td>
                    <td className="border-b border-line-subtle">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {EXPERTS.map((e) => <ExpertDot key={e.id} expertId={e.id} lead={l} />)}
                      </div>
                    </td>
                    <td className="border-b border-line-subtle pr-3">
                      {I.next ? (
                        <>
                          <div className="truncate">{EXPERT[I.next.expert].short}</div>
                          <div className="text-small text-ink-4 tabular-nums">{fmtSessionWhen(I.next.at, now)}</div>
                        </>
                      ) : <span className="text-ink-faint">—</span>}
                    </td>
                    <td className="border-b border-line-subtle pr-3" onClick={(e) => e.stopPropagation()}>
                      <SuggestionChip s={I.sugg} quiet={sameAsAbove} onClick={() => onSell(l.id, I.sugg?.expert)} />
                    </td>
                    <td className="border-b border-line-subtle text-right tabular-nums">{fmtINR(I.paid)}</td>
                    <td className="border-b border-line-subtle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 [@media(hover:none)]:opacity-100 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                        <button title="WhatsApp" aria-label={`WhatsApp ${l.name}`} onClick={() => { setRecordTab("whatsapp"); setRecordId(l.id); }} className="h-7 w-7 rounded-md flex items-center justify-center text-ink-3 hover:bg-white hover:text-emerald-700 hover:shadow-ring-line"><WhatsAppIcon className="h-3.5 w-3.5" /></button>
                        <button onClick={() => onSell(l.id, I.sugg?.expert)} className="h-7 rounded-md px-2 text-small text-ink-2 hover:bg-white hover:shadow-ring-line">Sell</button>
                        <button title="Open record" aria-label={`Open ${l.name}`} onClick={() => { setRecordTab(null); setRecordId(l.id); }} className="h-7 w-7 rounded-md flex items-center justify-center text-ink-3 hover:bg-white hover:text-ink hover:shadow-ring-line"><ArrowRight className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <div className="py-16 text-center text-body text-ink-4">No customers match these filters</div>}
        </div>

      </div>
    </div>
  );
}

/* ==========================================================================
   App
   ========================================================================== */

export default function CradlewellCRM() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    setError(null);
    loadCRM()
      .then((d) => {
        Object.assign(SEED_TIMELINES, d.seededTimelines);
        setData(d);
      })
      .catch((e) => setError(e.message || "Could not load the CRM"));
  }, []);
  useEffect(load, [load]);
  // Don't lose queued writes when the tab closes
  useEffect(() => {
    const warn = (e) => {
      if (!hasPending()) return;
      flush();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-ink" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
        <div className="text-center">
          <div className="text-body-lg font-medium">Couldn't load the CRM</div>
          <div className="mt-1 text-body text-ink-4">{error}</div>
          <button onClick={load} className={`mt-4 ${btn("primary", "md")}`}>Try again</button>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
        <div className="flex items-center gap-2 text-body text-ink-4">
          <span className="h-6 w-6 rounded-md text-white text-small font-semibold flex items-center justify-center" style={{ backgroundColor: ACCENT }}>C</span>
          Loading your leads…
        </div>
      </div>
    );
  return <CRMApp initial={data} />;
}

// My day "needs your attention" queue, built from live leads and follow-ups
function buildQueueItems(leads, followups, now) {
  const byId = new Map(leads.map((l) => [l.id, l]));
  const shortOf = (l) => (l.careKind === "B" ? "Born" : l.dueDate ? `${Math.min(42, Math.max(4, 40 - Math.ceil((l.dueDate - now) / (7 * DAY))))}w` : "Exp.");
  const base = (l) => ({ leadId: l.id, name: l.name, phone: l.phone, tag: l.tag || l.stage, stage: careStage(l, now), short: shortOf(l), source: l.source || "" });
  const out = [];
  // New leads nobody has contacted yet (last 14 days, so an old backlog doesn't flood the day)
  leads
    .filter((l) => l.stage === "New" && l.lastActivity?.none && now - l.createdAt < 14 * DAY)
    .forEach((l) => out.push({ ...base(l), id: `n:${l.id}`, section: "new", note: l.notes || "", reason: "New lead · not contacted", createdAt: l.createdAt.getTime(), action: "Call" }));
  followups
    .filter((f) => f.status === "open" && byId.has(f.leadId) && dayDiff(f.due, now) <= 0)
    .forEach((f) => {
      const l = byId.get(f.leadId);
      const late = -dayDiff(f.due, now);
      out.push({
        ...base(l),
        id: `f:${f.id}`,
        fuId: f.id,
        section: late > 0 ? "overdue" : "due",
        note: f.action,
        reason: `${late > 0 ? "Follow-up overdue" : "Follow-up due today"} · ${f.action}`,
        late: late > 0 ? `${late}d overdue` : undefined,
        action: f.type === "WhatsApp" ? "Open chat" : f.type === "Payment" ? "Resend link" : "Call",
      });
    });
  leads
    .filter((l) => l.stage === "Payment pending")
    .forEach((l) => out.push({ ...base(l), id: `p:${l.id}`, section: "payment", note: l.package ? `${l.package} plan` : "", reason: "Payment pending", amount: Math.max(0, packageValue(l) - (l.amountPaid || 0)), late: l.paymentStatus || "Link sent", action: "Resend link" }));
  return out;
}

// Snooze labels from SnoozeMenu → a date
function snoozeDate(label) {
  const d = new Date();
  if (label.startsWith("later today")) { d.setHours(d.getHours() + 3, 0, 0, 0); return d; }
  if (label.startsWith("tomorrow")) { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; }
  const parsed = new Date(`${label.replace(/^\w+, /, "")} ${d.getFullYear()} 10:00`);
  if (!isNaN(parsed)) { if (parsed < d) parsed.setFullYear(d.getFullYear() + 1); return parsed; }
  d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0); return d;
}

const telHref = (phone) => `tel:${String(phone || "").replace(/[^\d+]/g, "")}`;
const waHref = (phone) => {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) d = `91${d}`;
  return `https://wa.me/${d}`;
};
const openCall = (phone) => { if (phone) window.location.href = telHref(phone); };
const openWhatsApp = (phone) => { if (phone) window.open(waHref(phone), "_blank", "noopener"); };

function CRMApp({ initial }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // 30s clock: enough for "waiting 4m" / "starts in 10 min", and keeps hundreds of
    // real leads from re-rendering every second.
    const t = setInterval(() => setNow(new Date()), 30000);
    const onFocus = () => setNow(new Date());
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, []);

  // Queue status overlay for My day rows (open | leaving | done | snoozed), keyed by row id
  const [itemState, setItemState] = useState({});

  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(QUEUE_SECTIONS.map((s) => [s.id, !!s.defaultCollapsed]))
  );
  const [activeNav, setActiveNav] = useState("my-day");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerLead, setDrawerLead] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [rowMenu, setRowMenu] = useState(null); // { id, kind: "snooze" | "done" }
  // Close an open row menu (Snooze, Done, outcome) on any press outside it or its own button
  useEffect(() => {
    if (!rowMenu) return;
    const down = (e) => {
      if (e.target.closest?.("[data-row-menu]")) return;
      const row = document.querySelector(`[data-row="${CSS.escape(String(rowMenu.id))}"]`);
      if (row && row.contains(e.target) && e.target.closest("button")) return; // the row's own buttons toggle or act themselves
      setRowMenu(null);
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [rowMenu]);
  const [toast, setToast] = useState(null);
  const [toastRaised, setToastRaised] = useState(false);
  const toastTimer = useRef(null);
  const [leads, setLeads] = useState(() => initial.leads.map((l) => (l.stage === "Won" && !l.customerSince ? asCustomer(l, l.stageSince || l.createdAt) : l)));
  // Rule: the moment a lead is Won (paid) it becomes a customer — same record, history kept
  useEffect(() => {
    if (leads.some((l) => l.stage === "Won" && !l.customerSince)) setLeads((ls) => ls.map((l) => (l.stage === "Won" && !l.customerSince ? asCustomer(l) : l)));
  }, [leads]);
  // Keep the ID prefix in step with the care stage (CW-P → CW-B when the baby is born)
  useEffect(() => {
    const wrong = (l) => l.customerNo && l.customerId !== customerId(l.customerNo, l.careKind);
    if (leads.some(wrong)) setLeads((ls) => ls.map((l) => (wrong(l) ? { ...l, customerId: customerId(l.customerNo, l.careKind) } : l)));
  }, [leads]);
  const [timelines, setTimelines] = useState(() => initial.timelines || {});
  LIVE.timelines = timelines;
  const prevStages = useRef(null);
  useEffect(() => {
    const prev = prevStages.current;
    prevStages.current = Object.fromEntries(leads.map((l) => [l.id, l.stage]));
    if (!prev) return;
    const changed = leads.filter((l) => prev[l.id] && prev[l.id] !== l.stage && (!l.stageSince || Date.now() - l.stageSince > 2000));
    if (changed.length) {
      const ids = new Set(changed.map((l) => l.id));
      setLeads((ls) => ls.map((l) => (ids.has(l.id) ? { ...l, stageSince: new Date() } : l)));
    }
  }, [leads]);
  // WhatsApp inbox isn't connected yet — no chats
  const [chats, setChats] = useState([]);
  const [recordRequest, setRecordRequest] = useState(null);
  const [leadsFilterRequest, setLeadsFilterRequest] = useState(null);
  const [leadsViewRequest, setLeadsViewRequest] = useState(null);
  const [activeViewId, setActiveViewId] = useState(null);
  const [customViews, setCustomViews] = useState(() => (initial.views || []).map((v) => ({ ...v, icon: ListFilter })));
  const [newViewOpen, setNewViewOpen] = useState(false);
  const [inboxResetKey, setInboxResetKey] = useState(0);
  const [newLeadRequest, setNewLeadRequest] = useState(null);
  const leadsStateRef = useRef({ tab: "all", filters: {}, viewId: null });
  const [settings, setSettings] = useState(() => {
    const def = buildSettings();
    const saved = initial.settings;
    if (!saved) return def;
    // Saved settings lose their icon components when stored; take them back from the defaults
    const iconOf = Object.fromEntries(def.fields.map((f) => [f.id, f.icon]));
    return { ...def, ...saved, fields: (saved.fields || def.fields).map((f) => ({ ...f, icon: iconOf[f.id] || Hash })) };
  });
  // Settings that other pages read live: stuck limits (Pipeline) and lost reasons (lost picker)
  useEffect(() => {
    Object.keys(STUCK_LIMITS).forEach((k) => delete STUCK_LIMITS[k]);
    settings.stages.forEach((st) => { if (st.stuck != null && st.name) STUCK_LIMITS[st.name] = st.stuck; });
    const names = settings.lostReasons.map((r) => r.name.trim()).filter(Boolean);
    if (names.length) LOST_REASONS.splice(0, LOST_REASONS.length, ...names);
  }, [settings.stages, settings.lostReasons]);
  // Expert prices, modes and package inclusions (Settings → Packages and services)
  settings.experts.forEach(({ id, single, pack4, pack8, home, video, included }) => Object.assign(EXPERT_CFG[id], { single, pack4, pack8, home, video, included }));
  const expertsKey = JSON.stringify(settings.experts);
  const [sell, setSell] = useState(null); // { leadId, expert }
  const openSell = (leadId, expert) => setSell({ leadId: leadId || null, expert: expert || null });
  const sellService = ({ leadId, expert, pack, mode, price, when, sendLink }) => {
    const lead = leads.find((l) => l.id === leadId);
    const per = Math.round(price / pack);
    const sessions = Array.from({ length: pack }, (_, i) => ({ id: uid(), expert, at: new Date(when.getTime() + i * 7 * DAY), status: "Booked", mode, price: per, paid: price === 0, pack: pack > 1 ? pack : null }));
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, sessions: [...(l.sessions || []), ...sessions] } : l)));
    const evs = [{ id: uid(), type: "service", by: ME, at: new Date(), expert, pack, mode, price, when, sendLink }];
    if (sendLink) evs.unshift({ id: uid(), type: "payment", status: "sent", amount: price, by: ME, at: new Date(Date.now() + 1000), note: `${EXPERT[expert].name}${pack > 1 ? ` · pack of ${pack}` : ""}` });
    setTimelines((t) => ({ ...t, [leadId]: [...evs, ...(t[leadId] || buildTimeline(lead))] }));
    if (price > 0)
      setFollowups((fs) => [
        { id: `fu-s${Date.now()}`, leadId, type: "Payment", action: `Collect payment · ${EXPERT[expert].name}${pack > 1 ? ` pack of ${pack}` : ""} · ${fmtINR(price)}`, due: workHours(roundQuarter(new Date(Date.now() + (sendLink ? 24 : 2) * 3600000))), owner: lead.owner || ME, status: "open", auto: "Service sold", sakhiStatus: null, summary: null, createdAt: new Date() },
        ...fs,
      ]);
    setSell(null);
    showToast(`Sold ${EXPERT[expert].name.toLowerCase()}${pack > 1 ? ` pack of ${pack}` : ""} to ${lead.name}${sendLink ? " · payment link sent" : ""}`);
  };
  const needsReplyCount = chats.filter(needsHumanReply).length;
  const [followups, setFollowups] = useState(() => initial.followups);
  const [consults, setConsults] = useState(() => initial.consults);

  /* ---------- Saving: every change to leads / follow-ups / consults / timelines / settings is diffed and queued ---------- */
  const saved = useRef({ leads, followups, consults, timelines, settings, customViews });
  useEffect(() => {
    const prev = saved.current;
    const ops = [];
    if (prev.leads !== leads) ops.push(...diffById(prev.leads, leads, "leads", (l) => uiLeadToDb(l, { packageValue, serviceDays })));
    if (prev.followups !== followups) ops.push(...diffById(prev.followups, followups, "followups", (f) => (f.leadId ? uiFollowupToDb(f) : null)));
    if (prev.consults !== consults)
      ops.push(...diffById(prev.consults, consults, "consults", (c) => (c.leadId ? { lead_id: c.leadId, data: pack(c) } : null)));
    if (prev.timelines !== timelines) ops.push(...diffTimelines(prev.timelines, timelines, new Set(leads.map((l) => l.id))));
    if (prev.settings !== settings) ops.push({ coll: "settings", op: "upsert", id: "settings", row: { data: pack(settings) } });
    if (prev.customViews !== customViews) ops.push({ coll: "settings", op: "upsert", id: "views", row: { data: pack(customViews) } });
    saved.current = { leads, followups, consults, timelines, settings, customViews };
    // Leads must exist before rows that point at them; deletes go last
    const order = { leads: 0, followups: 1, consults: 1, timelines: 1, settings: 2 };
    ops.sort((a, b) => (a.op === "delete") - (b.op === "delete") || order[a.coll] - order[b.coll]);
    if (ops.length) enqueue(ops);
  }, [leads, followups, consults, timelines, settings, customViews]);

  // Live data → My day queue, today's schedule, this month's revenue, report rows
  const minuteKey = Math.floor(now / 60000);
  const baseItems = useMemo(() => buildQueueItems(leads, followups, new Date()), [leads, followups, minuteKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = useMemo(() => baseItems.map((i) => ({ ...i, status: "open", ...(itemState[i.id] || {}) })), [baseItems, itemState]);
  const setItems = (fn) => {
    const next = fn(items);
    setItemState((st) => {
      const out = { ...st };
      next.forEach((i) => {
        if (i.status === "open") delete out[i.id];
        else out[i.id] = { status: i.status, outcome: i.outcome, snoozedUntil: i.snoozedUntil };
      });
      return out;
    });
  };
  {
    const leadOf = new Map(leads.map((l) => [l.id, l]));
    const today = consults
      .filter((c) => c.status !== "cancelled" && c.start && dayDiff(c.start, now) === 0)
      .sort((a, b) => a.start - b.start)
      .map((c) => {
        const l = leadOf.get(c.leadId);
        const at = c.start;
        return {
          id: c.id, consultId: c.id, leadId: c.leadId, type: "Consult", at,
          time: `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`,
          name: l?.name || "Lead", phone: l?.phone || "", short: l ? (l.careKind === "B" ? "Born" : "Exp.") : "", stage: l ? careStage(l, now) : "",
          note: c.note || "", mode: String(c.mode || "").toLowerCase(), confirm: c.confirmed ? "confirmed" : "awaiting", source: l?.source || "",
          doneOutcome: c.status === "done" ? c.outcome || "Done" : c.status === "noshow" ? "No-show" : null,
        };
      });
    SCHEDULE.splice(0, SCHEDULE.length, ...today);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let care = 0;
    let experts = 0;
    leads.forEach((l) => {
      if (l.stage === "Won" && (l.customerSince || l.stageSince || l.createdAt).getTime() >= monthStart) care += l.amountPaid || 0;
      (l.sessions || []).forEach((x) => { if (x.paid && x.at && new Date(x.at).getTime() >= monthStart) experts += x.price || 0; });
    });
    Object.assign(REVENUE_MONTH, { care, experts, target: Number(settings.revenueTarget) || 500000 });
  }
  if (REPORT_INPUT.leads !== leads || REPORT_INPUT.consults !== consults || REPORT_INPUT.timelines !== timelines)
    Object.assign(REPORT_INPUT, { leads, consults, timelines, version: REPORT_INPUT.version + 1 });
  const consultsToday = consults.filter((c) => dayDiff(c.start, now) === 0).length;
  const fuOverdue = followups.filter((f) => f.status === "open" && dayDiff(f.due, now) < 0).length;

  const showToast = useCallback((message, undo) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const dismissToast = () => {
    clearTimeout(toastTimer.current);
    setToast(null);
  };
  useEffect(() => { setSaveErrorHandler((msg) => showToast(msg)); }, [showToast]);

  // My day: attention filter (from stat cards), customer opportunities, and J/K order across all three sections
  const [attnFilter, setAttnFilter] = useState(null);
  const [daySections, setDaySections] = useState({}); // section id -> collapsed
  const toggleDaySection = (id) => {
    setDaySections((d) => ({ ...d, [id]: !d[id] }));
    setRowMenu(null);
    const prefix = { "sec-attention": null, "sec-consults": "s:", "sec-opps": "o:" }[id];
    if (selectedId && !daySections[id] && (prefix ? selectedId.startsWith(prefix) : !selectedId.includes(":"))) setSelectedId(null);
  };
  const [oppHidden, setOppHidden] = useState(() => new Set());
  const [customersTabRequest, setCustomersTabRequest] = useState(null);
  const oppAll = useMemo(() => {
    const t = Date.now();
    return leads
      .filter((l) => l.stage === "Won")
      .map((lead) => ({ lead, plan: carePlan(lead, t), sugg: suggestFor(lead, t) }))
      .filter((o) => o.plan && o.plan.status !== "completed" && ["expert", "renew"].includes(o.sugg?.kind))
      .sort((a, b) => (a.sugg.kind === "renew") === (b.sugg.kind === "renew") ? (a.sugg.kind === "renew" ? a.plan.left - b.plan.left : ageDays(a.lead, t) - ageDays(b.lead, t)) : a.sugg.kind === "renew" ? -1 : 1);
  }, [leads, Math.floor(now / 60000)]); // eslint-disable-line react-hooks/exhaustive-deps
  const oppVisible = oppAll.filter((o) => !oppHidden.has(o.lead.id));
  // Top 6: the two most urgent renewals, then expert sales for the youngest babies, then the rest
  const opps = (() => {
    const ren = oppVisible.filter((o) => o.sugg.kind === "renew");
    const exp = oppVisible.filter((o) => o.sugg.kind !== "renew");
    return [...ren.slice(0, 2), ...exp, ...ren.slice(2)].slice(0, 6);
  })();
  const attnIds = items
    .filter((i) => i.status === "open" && (!attnFilter || ATTN_FILTERS[attnFilter].sections.includes(i.section)))
    .sort((a, b) => ATTN_ORDER.indexOf(a.section) - ATTN_ORDER.indexOf(b.section) || (a.waitingSince || 0) - (b.waitingSince || 0))
    .map((i) => i.id);
  const navIds = [
    ...(daySections["sec-attention"] ? [] : attnIds),
    ...(daySections["sec-consults"] ? [] : SCHEDULE.map((s) => `s:${s.id}`)),
    ...(daySections["sec-opps"] ? [] : opps.map((o) => `o:${o.lead.id}`)),
  ];
  const dismissOpp = (lead, how) => {
    setOppHidden((h) => new Set([...h, lead.id]));
    const rid = `o:${lead.id}`;
    if (selectedId === rid) {
      const idx = navIds.indexOf(rid);
      setSelectedId(navIds[idx + 1] ?? navIds[idx - 1] ?? null);
    }
    showToast(how === "snooze" ? `Snoozed ${lead.name} until tomorrow` : `Dismissed suggestion for ${lead.name}`, () => {
      setOppHidden((h) => { const n = new Set(h); n.delete(lead.id); return n; });
      dismissToast();
    });
  };

  const openLeadRecord = (id) => {
    setRecordRequest({ id, key: Date.now() });
    setActiveNav("leads");
  };
  const removeItem = (id, finalStatus, extra, message, apply, revert) => {
    if (selectedId === id) {
      const idx = navIds.indexOf(id);
      setSelectedId(navIds[idx + 1] ?? navIds[idx - 1] ?? null);
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "leaving" } : i)));
    setTimeout(() => {
      setItems((prev) => prev.map((i) => (i.id === id && i.status === "leaving" ? { ...i, status: finalStatus, ...extra } : i)));
      apply?.();
    }, 160);
    showToast(message, () => {
      revert?.();
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "open", outcome: undefined, snoozedUntil: undefined } : i)));
      dismissToast();
    });
  };

  // Outcomes logged against past consults in Today's schedule
  const [scheduleOutcomesLocal, setScheduleOutcomes] = useState({});
  const scheduleOutcomes = { ...Object.fromEntries(SCHEDULE.filter((e) => e.doneOutcome).map((e) => [e.id, e.doneOutcome])), ...scheduleOutcomesLocal };
  const logScheduleOutcome = (entry, outcome) => {
    setScheduleOutcomes((o) => ({ ...o, [entry.id]: outcome }));
    if (entry.consultId) setConsults((cs) => cs.map((c) => (c.id === entry.consultId ? { ...c, status: "done", outcome } : c)));
    showToast(`Marked as ${outcome}`, () => {
      setScheduleOutcomes((o) => {
        const { [entry.id]: _, ...rest } = o;
        return rest;
      });
      dismissToast();
    });
  };

  // Stat cards: expand the related sections, scroll to the target and flash it
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);
  const jumpTo = (elementId, sectionIds) => {
    setDaySections((d) => ({ ...d, [elementId]: false }));
    if (sectionIds.length) setCollapsed((c) => ({ ...c, ...Object.fromEntries(sectionIds.map((id) => [id, false])) }));
    setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      clearTimeout(flashTimer.current);
      setFlash(elementId);
      flashTimer.current = setTimeout(() => setFlash(null), 1400);
    }, 30);
  };

  const actions = {
    open: (item) => item.leadId && openLeadRecord(item.leadId),
    whatsapp: (item) => openWhatsApp(item.phone),
    call: (item) => openCall(item.phone),
    primary: (item) => (item.action === "Call" ? openCall(item.phone) : openWhatsApp(item.phone)),
    // Follow-up rows really move / complete the follow-up; other rows are hidden for this session
    snooze: (item, label) => {
      const fu = item.fuId && followups.find((f) => f.id === item.fuId);
      const due = snoozeDate(label);
      removeItem(item.id, "snoozed", { snoozedUntil: label }, `Snoozed until ${label}`,
        fu ? () => {
          setFollowups((fs) => fs.map((f) => (f.id === fu.id ? { ...f, due } : f)));
          setLeads((ls) => ls.map((l) => (l.id === fu.leadId ? { ...l, nextFollowUp: due } : l)));
        } : null,
        fu ? () => setFollowups((fs) => fs.map((f) => (f.id === fu.id ? fu : f))) : null);
    },
    done: (item, outcome) => {
      const fu = item.fuId && followups.find((f) => f.id === item.fuId);
      removeItem(item.id, "done", { outcome }, `Marked as ${outcome}`,
        fu ? () => {
          setFollowups((fs) => fs.map((f) => (f.id === fu.id ? { ...f, status: "done", completedAt: new Date(), completedBy: ME, outcome } : f)));
          setLeads((ls) => ls.map((l) => (l.id === fu.leadId ? { ...l, tag: OUTCOME_TAGS.includes(outcome) ? outcome : l.tag, lastActivity: { type: fu.type || "Call", by: ME, at: new Date() } } : l)));
          setTimelines((t) => {
            const l = leads.find((x) => x.id === fu.leadId);
            if (!l) return t;
            return { ...t, [l.id]: [{ id: uid(), type: "followup", done: true, by: ME, at: new Date(), outcome, action: fu.action }, ...(t[l.id] || buildTimeline(l))] };
          });
        } : null,
        fu ? () => setFollowups((fs) => fs.map((f) => (f.id === fu.id ? fu : f))) : null);
    },
  };

  const rowProps = (item) => ({
    selected: selectedId === item.id,
    menu: rowMenu?.id === item.id ? rowMenu.kind : null,
    setMenu: (kind) => setRowMenu(kind ? { id: item.id, kind } : null),
    onSelect: setSelectedId,
    onOpen: actions.open,
    onAction: actions.primary,
    onWhatsApp: actions.whatsapp,
    onSnooze: actions.snooze,
    onDone: actions.done,
  });

  // Live counts
  const openItems = items.filter((i) => i.status === "open");
  const countIn = (s) => openItems.filter((i) => i.section === s).length;
  const overdueCount = countIn("overdue");
  const dueCount = countIn("due");
  const pendingOutcomes = SCHEDULE.filter((e) => needsOutcome(e, now, scheduleOutcomes)).length;

  // Keyboard: Ctrl/Cmd+K palette, Esc closes, J/K/C/W/S/E/Enter on the queue
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        if (rowMenu) return setRowMenu(null);
        setPaletteOpen(false);
        setDrawerLead(null);
        setSidebarOpen(false);
        return;
      }
      if (activeNav !== "my-day" || paletteOpen || drawerLead) return;
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const idx = navIds.indexOf(selectedId);
      const current = items.find((i) => i.id === selectedId && i.status === "open");

      if (key === "j" || key === "k") {
        e.preventDefault();
        setRowMenu(null);
        if (!navIds.length) return;
        if (idx === -1) return setSelectedId(navIds[0]);
        const next = key === "j" ? Math.min(idx + 1, navIds.length - 1) : Math.max(idx - 1, 0);
        setSelectedId(navIds[next]);
        return;
      }
      // Consultation rows
      if (selectedId?.startsWith("s:")) {
        const c = SCHEDULE.find((s) => `s:${s.id}` === selectedId);
        const needs = needsOutcome(c, now, scheduleOutcomes);
        if (key === "c" || (e.key === "Enter" && !rowMenu && !needs)) (c.mode === "video" ? openWhatsApp(c.phone) : openCall(c.phone));
        else if ((key === "e" || e.key === "Enter") && needs) setRowMenu((m) => (m?.id === selectedId ? null : { id: selectedId, kind: "outcome" }));
        else return;
        e.preventDefault();
        return;
      }
      // Customer opportunity rows
      if (selectedId?.startsWith("o:")) {
        const o = opps.find((x) => `o:${x.lead.id}` === selectedId);
        if (!o) return;
        if (key === "c") openCall(o.lead.phone);
        else if (e.key === "Enter") o.sugg.kind === "renew" ? openCall(o.lead.phone) : openSell(o.lead.id, o.sugg.expert);
        else if (key === "s") dismissOpp(o.lead, "snooze");
        else if (key === "e") dismissOpp(o.lead, "done");
        else return;
        e.preventDefault();
        return;
      }
      if (!current) return;
      if (key === "c") actions.call(current);
      else if (key === "w") actions.whatsapp(current);
      else if (key === "s") setRowMenu((m) => (m?.id === current.id && m.kind === "snooze" ? null : { id: current.id, kind: "snooze" }));
      else if (key === "e") setRowMenu((m) => (m?.id === current.id && m.kind === "done" ? null : { id: current.id, kind: "done" }));
      else if (e.key === "Enter" && !rowMenu) actions.open(current);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Saved views: live counts (recomputed each minute or when leads/chats change)
  const minuteTick = Math.floor(now / 60000);
  const viewCtx = useMemo(() => savedViewCtx(leads, chats, Date.now()), [leads, chats, minuteTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const allViews = [...BUILTIN_VIEWS, ...customViews];
  const viewRowMatch = useCallback(
    // Custom views put their filters into the Leads filter chips, so the row check only adds the built-in base
    (v, l) => (v.custom ? !v.base || BUILTIN_VIEW[v.base].match(l, viewCtx) : v.match(l, viewCtx)),
    [viewCtx]
  );
  const openView = (v) => {
    setActiveViewId(v ? v.id : null);
    setLeadsViewRequest({ view: v, key: Date.now() });
    setActiveNav("leads");
  };
  const navigate = (id) => {
    if (id === "inbox") setInboxResetKey(Date.now());
    if (id === "leads") openView(null);
    else setActiveNav(id);
  };
  const deleteView = (v) => {
    setCustomViews((vs) => vs.filter((x) => x.id !== v.id));
    if (activeViewId === v.id) openView(null);
    showToast(`Deleted view "${v.label}"`, () => {
      setCustomViews((vs) => [...vs, v]);
      dismissToast();
    });
  };

  const navSections = [
    {
      title: "Workspace",
      items: [
        { id: "my-day", label: "My day", icon: Home },
        { id: "leads", label: "Leads", icon: Users, badge: { text: String(openLeadsTotal(leads)), tone: "muted" } },
        { id: "customers", label: "Paid customers", icon: HeartHandshake, badge: { text: String(leads.filter((l) => l.stage === "Won").length), tone: "muted" } },
        { id: "pipeline", label: "Pipeline", icon: Kanban },
        { id: "consultations", label: "Consultations", icon: CalendarDays, badge: { text: consultsToday ? `${consultsToday} today` : "", tone: "muted" } },
        { id: "follow-ups", label: "Follow-ups", icon: ListChecks, badge: { text: fuOverdue ? `${fuOverdue} overdue` : "", tone: "red" } },
        { id: "reports", label: "Reports", icon: BarChart3 },
      ],
    },
  ];

  const allNavItems = [...navSections.flatMap((s) => s.items), { id: "settings", label: "Settings", icon: Settings }];
  const activeItem = allNavItems.find((i) => i.id === activeNav);

  const paletteLeads = leads;

  return (
    <div
      className="min-h-screen bg-white text-ink text-body-lg leading-5 antialiased"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif", fontFeatureSettings: '"cv11", "ss01"' }}
    >
      <style>{`
        /* Browser surfaces themed from the palette */
        ::selection { background: #F2D9E3; color: #1F1F1F; }
        :focus-visible { outline: 2px solid #B4436C; outline-offset: 2px; }
        input:focus-visible, textarea:focus-visible, select:focus-visible { outline-offset: 0; }
        /* Phones: 16px fields so iOS Safari does not zoom in on focus */
        @media (max-width: 767px) { input:not([type="checkbox"]):not([type="radio"]), textarea, select { font-size: 16px; } }
        input[type="checkbox"] { accent-color: #1F1F1F; width: 14px; height: 14px; cursor: pointer; }
        * { scrollbar-width: thin; scrollbar-color: #D6D3CD transparent; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        :root {
          /* Colour tokens: R G B channels, used through Tailwind (text-ink, border-line, bg-surface-hover…) */
          --cw-ink: 31 31 31; --cw-ink-2: 58 58 58; --cw-ink-3: 92 92 92; --cw-ink-4: 112 112 112; --cw-ink-placeholder: 138 134 128; --cw-ink-faint: 201 198 192;
          --cw-line-subtle: 243 242 239; --cw-line: 238 237 234; --cw-line-control: 230 228 223; --cw-line-strong: 217 214 208; --cw-line-heavy: 201 198 192;
          --cw-surface-subtle: 250 250 248; --cw-surface-hover: 244 243 240; --cw-surface-active: 241 239 234; --cw-surface-sidebar: 247 246 243;
          --cw-brand: 180 67 108; --cw-brand-strong: 138 46 82; --cw-brand-tint: 251 244 247; --cw-brand-line: 235 201 215;
        }
        :root { --duration-stagger: 40ms; --duration-micro: 80ms; --duration-quick: 150ms; --duration-fast: 250ms; --duration-medium: 350ms; --duration-slow: 400ms; --duration-very-slow: 500ms; --ease-smooth-out: cubic-bezier(0.22, 1, 0.36, 1); --ease-in-out: ease-in-out; --ease-out: ease-out; --ease-bounce: cubic-bezier(0.34, 1.36, 0.64, 1); --distance-micro: 4px; --distance-base: 8px; --scale-large: 0.96; --blur-small: 2px; --blur-medium: 3px; }
        @keyframes cwToastIn { from { opacity: 0; transform: translateY(var(--distance-base)); } to { opacity: 1; transform: translateY(0); } }
        .cw-toast { animation: cwToastIn var(--duration-fast) var(--ease-smooth-out); }
        @keyframes cwModalIn { from { opacity: 0; transform: scale(var(--scale-large)); } to { opacity: 1; transform: none; } }
        .cw-modal { animation: cwModalIn var(--duration-fast) var(--ease-smooth-out); }
        @keyframes cwCardIn { from { opacity: 0; transform: translateY(var(--distance-base)); } to { opacity: 1; transform: none; } }
        .cw-card-in { animation: cwCardIn var(--duration-slow) var(--ease-smooth-out) backwards; }
        @keyframes cwPhIn { from { opacity: 0; transform: scaleY(0.6); } to { opacity: 1; transform: none; } }
        .cw-ph { animation: cwPhIn var(--duration-fast) var(--ease-smooth-out); transform-origin: top; }
        @keyframes cwRowIn { from { opacity: 0; transform: translateY(var(--distance-base)); } to { opacity: 1; transform: none; } }
        .cw-row-in { animation: cwRowIn var(--duration-fast) var(--ease-smooth-out) backwards; }
        @keyframes cwFadeDown { from { opacity: 0; transform: translateY(var(--distance-base)); filter: blur(var(--blur-medium)); } to { opacity: 1; transform: none; filter: none; } }
        @keyframes cwRise { from { opacity: 0; transform: translateY(var(--distance-base)); filter: blur(var(--blur-small)); } to { opacity: 1; transform: none; filter: none; } }
        .cw-rise { animation: cwRise var(--duration-slow) var(--ease-smooth-out) backwards; }
        @keyframes cwAvatarIn { from { opacity: 0; transform: scale(var(--scale-large)); } to { opacity: 1; transform: none; } }
        .cw-avatar-in { animation: cwAvatarIn var(--duration-slow) var(--ease-smooth-out) backwards; }
        @keyframes cwFieldIn { from { opacity: 0; transform: translateY(var(--distance-micro)); } to { opacity: 1; transform: none; } }
        .cw-field-in { animation: cwFieldIn var(--duration-fast) var(--ease-in-out) backwards; }
        .cw-fade-in { animation: cwFadeDown var(--duration-fast) var(--ease-smooth-out) backwards; }
        @keyframes cwPing { 0% { transform: scale(1); opacity: 0.55; } 80%, 100% { transform: scale(2.6); opacity: 0; } }
        .cw-ping { animation: cwPing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite; }
        @keyframes cwRollUpIn { from { transform: translateY(var(--distance-micro)); opacity: 0; filter: blur(var(--blur-small)); } to { transform: none; opacity: 1; filter: none; } }
        @keyframes cwRollUpOut { from { transform: none; opacity: 1; filter: none; } to { transform: translateY(calc(-1 * var(--distance-micro))); opacity: 0; filter: blur(var(--blur-small)); } }
        @keyframes cwRollDownIn { from { transform: translateY(calc(-1 * var(--distance-micro))); opacity: 0; filter: blur(var(--blur-small)); } to { transform: none; opacity: 1; filter: none; } }
        @keyframes cwRollDownOut { from { transform: none; opacity: 1; filter: none; } to { transform: translateY(var(--distance-micro)); opacity: 0; filter: blur(var(--blur-small)); } }
        .cw-roll-up-in { animation: cwRollUpIn var(--duration-quick) var(--ease-in-out) both; }
        .cw-roll-up-out { animation: cwRollUpOut var(--duration-quick) var(--ease-in-out) both; }
        .cw-roll-down-in { animation: cwRollDownIn var(--duration-quick) var(--ease-in-out) both; }
        .cw-roll-down-out { animation: cwRollDownOut var(--duration-quick) var(--ease-in-out) both; }
        @keyframes cwPop { from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: none; } }
        .cw-pop { animation: cwPop var(--duration-very-slow) var(--ease-bounce) both; transform-box: fill-box; transform-origin: center; }
        @keyframes cwFade { from { opacity: 0; } to { opacity: 1; } }
        .cw-fade { animation: cwFade var(--duration-very-slow) var(--ease-out) both; }
        @keyframes cwDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        .cw-draw { stroke-dasharray: 1; animation: cwDraw var(--duration-very-slow) var(--ease-smooth-out) both; }
        @keyframes cwGrow { from { transform: scaleY(0); } to { transform: none; } }
        .cw-grow { animation: cwGrow var(--duration-very-slow) var(--ease-smooth-out) both; transform-box: fill-box; transform-origin: bottom; }
        @keyframes cwBarGrow { from { transform: scaleX(0); } to { transform: none; } }
        .cw-bar-grow { animation: cwBarGrow var(--duration-very-slow) var(--ease-smooth-out) both; }
        @keyframes cwTick { from { opacity: 0; transform: scaleY(0.4); } to { opacity: 1; transform: none; } }
        .cw-tick { animation: cwTick var(--duration-fast) var(--ease-smooth-out) both; }
        @keyframes cwSheet { from { opacity: 0; transform: translateY(var(--distance-base)) scale(var(--scale-large)); } to { opacity: 1; transform: none; } }
        .cw-sheet { animation: cwSheet var(--duration-slow) var(--ease-smooth-out) both; }
        .cw-backdrop { animation: cwFade var(--duration-fast) var(--ease-smooth-out) both; }
        @media (prefers-reduced-motion: reduce) { .cw-rise, .cw-avatar-in, .cw-field-in, .cw-row-in, .cw-fade-in, .cw-card-in, .cw-ph, .cw-pop, .cw-fade, .cw-draw, .cw-grow, .cw-bar-grow, .cw-tick, .cw-sheet, .cw-backdrop, .cw-ping, .cw-toast, .cw-modal, .cw-roll-up-in, .cw-roll-up-out, .cw-roll-down-in, .cw-roll-down-out { animation: none; } }
      `}</style>

      <Sidebar
        sections={navSections}
        activeNav={activeNav === "leads" && activeViewId ? `view:${activeViewId}` : activeNav}
        setActiveNav={navigate}
        onSearch={() => setPaletteOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="md:pl-[260px]">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-white/90 backdrop-blur px-3 h-12">
          <button onClick={() => setSidebarOpen(true)} className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-surface-hover" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-body font-medium">{activeItem?.label}</span>
          <button onClick={() => setPaletteOpen(true)} className="ml-auto h-9 w-9 rounded-md flex items-center justify-center hover:bg-surface-hover" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
        </div>

        <main id="main" tabIndex={-1} className="outline-none">
          {activeNav === "my-day" ? (
            <MyDay
              now={now}
              items={items}
              leads={leads}
              onOpen={actions.open}
              showToast={showToast}
              md={{
                daySections, toggleDaySection, selectedId, setSelectedId, rowMenu, setRowMenu, actions, scheduleOutcomes, logScheduleOutcome,
                opps, oppTotal: oppVisible.length,
                onSellOpp: (lead, sugg) => openSell(lead.id, sugg.expert),
                onCallOpp: (lead) => openCall(lead.phone),
                dismissOpp, attnFilter, setAttnFilter, jumpTo, flash,
                onViewAllOpps: () => { setCustomersTabRequest({ tab: "ready", key: Date.now() }); setActiveNav("customers"); },
                onCalendar: () => setActiveNav("consultations"),
              }}
            />
          ) : activeNav === "customers" ? (
            <CustomersPage
              leads={leads}
              setLeads={setLeads}
              now={now}
              showToast={showToast}
              dismissToast={dismissToast}
              timelines={timelines}
              setTimelines={setTimelines}
              onSell={openSell}
              expertsKey={expertsKey}
              tabRequest={customersTabRequest}
              consults={consults}
              followups={followups}
              setFollowups={setFollowups}
            />
          ) : activeNav === "settings" ? (
            <SettingsPage settings={settings} setSettings={setSettings} showToast={showToast} leads={leads} />
          ) : activeNav === "reports" ? (
            <ReportsPage
              followups={followups}
              onOpenLeads={(stage) => {
                if (stage === "Won") return setActiveNav("customers");
                setLeadsFilterRequest({ filters: { stage: [stage] }, key: Date.now() });
                setActiveNav("leads");
              }}
            />
          ) : activeNav === "pipeline" ? (
            <PipelinePage
              leads={leads}
              setLeads={setLeads}
              consults={consults}
              now={now}
              showToast={showToast}
              dismissToast={dismissToast}
              setTimelines={setTimelines}
              onOpenRecord={(id) => {
                setRecordRequest({ id, key: Date.now() });
                setActiveNav("leads");
              }}
              onAddLead={() => { setNewLeadRequest(Date.now()); setActiveNav("leads"); }}
              onOpenTable={() => navigate("leads")}
            />
          ) : activeNav === "consultations" ? (
            <ConsultationsPage
              consults={consults}
              setConsults={setConsults}
              leads={leads}
              setLeads={setLeads}
              now={now}
              showToast={showToast}
              dismissToast={dismissToast}
              timelines={timelines}
              setTimelines={setTimelines}
              setFollowups={setFollowups}
              onOpenRecord={(id) => {
                setRecordRequest({ id, key: Date.now() });
                setActiveNav("leads");
              }}
            />
          ) : activeNav === "follow-ups" ? (
            <FollowUpsPage
              followups={followups}
              setFollowups={setFollowups}
              leads={leads}
              setLeads={setLeads}
              now={now}
              showToast={showToast}
              dismissToast={dismissToast}
              setTimelines={setTimelines}
              setToastRaised={setToastRaised}
              onOpenRecord={(id) => {
                setRecordRequest({ id, key: Date.now() });
                setActiveNav("leads");
              }}
            />
          ) : activeNav === "inbox" ? (
            <InboxPage
              chats={chats}
              setChats={setChats}
              leads={leads}
              setLeads={setLeads}
              now={now}
              showToast={showToast}
              dismissToast={dismissToast}
              timelines={timelines}
              setTimelines={setTimelines}
              resetKey={inboxResetKey}
              onOpenRecord={(id) => {
                setRecordRequest({ id, key: Date.now() });
                setActiveNav("leads");
              }}
            />
          ) : activeNav === "leads" ? (
            <LeadsPage
              leads={leads}
              setLeads={setLeads}
              now={now}
              showToast={showToast}
              dismissToast={dismissToast}
              setToastRaised={setToastRaised}
              timelines={timelines}
              setTimelines={setTimelines}
              recordRequest={recordRequest}
              filterRequest={leadsFilterRequest}
              viewRequest={leadsViewRequest}
              viewRowMatch={viewRowMatch}
              onViewChange={setActiveViewId}
              onStateChange={(st) => (leadsStateRef.current = st)}
              onSell={openSell}
              newLeadRequest={newLeadRequest}
              consults={consults}
              followups={followups}
              setFollowups={setFollowups}
            />
          ) : (
            <PlaceholderPage item={activeItem} />
          )}
        </main>
      </div>

      {sell && (
        <SellServiceModal
          customers={leads.filter((l) => l.stage === "Won")}
          initial={sell}
          now={now}
          onClose={() => setSell(null)}
          onSave={sellService}
        />
      )}
      {newViewOpen && (
        <NewViewModal
          state={leadsStateRef.current}
          customViews={customViews}
          onClose={() => setNewViewOpen(false)}
          onSave={(label, base) => {
            const st = leadsStateRef.current;
            const v = { id: `cv-${Date.now()}`, label, custom: true, tab: st.tab, filters: st.filters, base, icon: ListFilter };
            setCustomViews((vs) => [...vs, v]);
            setNewViewOpen(false);
            openView(v);
            showToast(`Saved view "${label}"`);
          }}
        />
      )}
      <LeadDrawer lead={drawerLead} onClose={() => setDrawerLead(null)} onToast={showToast} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        leads={paletteLeads}
        onSelect={(l) => {
          setPaletteOpen(false);
          openLeadRecord(l.id);
        }}
      />
      <Toast toast={toast} onClose={dismissToast} raised={toastRaised} />
    </div>
  );
}
