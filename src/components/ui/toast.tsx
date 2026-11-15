"use client";
import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  description?: string;
  /** ms before auto-dismiss. Default 4000. Pass Infinity to persist. */
  duration?: number;
}

interface ToastItem extends Required<ToastOptions> {
  id: string;
  variant: ToastVariant;
  title: string;
}

// ── Module-level event bus — callers never need Context ────────────────────────
type Listener = (item: ToastItem) => void;
const _listeners = new Set<Listener>();

function emit(variant: ToastVariant, title: string, options?: ToastOptions) {
  const item: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    variant,
    title,
    description: options?.description ?? "",
    duration: options?.duration ?? 4000,
  };
  _listeners.forEach(l => l(item));
}

// ── Public API — import `toast` from anywhere ──────────────────────────────────
export const toast = {
  success: (title: string, opts?: ToastOptions) => emit("success", title, opts),
  error:   (title: string, opts?: ToastOptions) => emit("error",   title, opts),
  warning: (title: string, opts?: ToastOptions) => emit("warning", title, opts),
  info:    (title: string, opts?: ToastOptions) => emit("info",    title, opts),
};

// ── Variant config ─────────────────────────────────────────────────────────────
const VARIANT = {
  // Dark ink toasts (prototype style); the icon carries the semantic colour.
  success: { Icon: CheckCircle2,  iconColor: "#4ADE80", bg: "#1F1F1F", border: "#1F1F1F" },
  error:   { Icon: XCircle,       iconColor: "#F87171", bg: "#1F1F1F", border: "#1F1F1F" },
  warning: { Icon: AlertTriangle, iconColor: "#FBBF24", bg: "#1F1F1F", border: "#1F1F1F" },
  info:    { Icon: Info,          iconColor: "#D4D4D4", bg: "#1F1F1F", border: "#1F1F1F" },
};

// ── Single toast card ──────────────────────────────────────────────────────────
function ToastCard({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  const { Icon, iconColor, bg, border } = VARIANT[item.variant];

  const dismiss = useCallback(() => {
    setMounted(false);
    setTimeout(() => onRemove(item.id), 280);
  }, [item.id, onRemove]);

  useEffect(() => {
    // rAF so CSS transition fires after mount
    const raf = requestAnimationFrame(() => setMounted(true));
    if (item.duration !== Infinity) {
      const t = setTimeout(dismiss, item.duration);
      return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    }
    return () => cancelAnimationFrame(raf);
  }, [item.duration, dismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.625rem",
        padding: "0.75rem 0.875rem 0.75rem 0.875rem",
        borderRadius: 8,
        fontFamily: "'Inter', system-ui, sans-serif",
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: "0 12px 32px rgba(0,0,0,.18)",
        minWidth: 272,
        maxWidth: 380,
        pointerEvents: "auto",
        transition: "opacity 0.28s ease, transform 0.32s cubic-bezier(0.22,1,0.36,1)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(10px)",
        willChange: "transform, opacity",
      }}
    >
      <Icon size={17} color={iconColor} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", lineHeight: 1.4 }}>
          {item.title}
        </div>
        {item.description && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", marginTop: 2, lineHeight: 1.45 }}>
            {item.description}
          </div>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0,
          background: "none", border: "none", cursor: "pointer",
          padding: "2px 2px 2px 4px", borderRadius: 4,
          color: "rgba(255,255,255,.5)", display: "flex", alignItems: "center",
          transition: "color 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ── ToastContainer — mount once in the CRM layout ─────────────────────────────
// Renders a portal-like fixed stack bottom-centre. Zero z-index conflicts.
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (item: ToastItem) => {
      // Keep at most 5 visible; oldest drops silently if queue fills
      setToasts(prev => [...prev.slice(-4), item]);
    };
    _listeners.add(handler);
    return () => { _listeners.delete(handler); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        alignItems: "center",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        pointerEvents: "none",
      }}
    >
      {toasts.map(t => (
        <ToastCard key={t.id} item={t} onRemove={remove} />
      ))}
    </div>
  );
}
