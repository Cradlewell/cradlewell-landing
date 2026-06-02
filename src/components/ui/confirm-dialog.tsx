"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, Trash2, X, HelpCircle } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
}

type Resolver = (value: boolean) => void;

// ── Module-level imperative API ────────────────────────────────────────────────
// A single `<ConfirmDialogRoot />` in the layout registers the opener.
// Everyone else just calls `confirm({ ... })` — no hooks, no imports of context.
let _open: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

/**
 * Show a modal confirmation dialog. Returns a Promise that resolves to `true`
 * when the user confirms, or `false` on cancel / Escape / overlay click.
 *
 * Requires `<ConfirmDialogRoot />` somewhere above in the tree.
 *
 * @example
 * const ok = await confirm({ title: "Delete lead?", body: "This cannot be undone.", variant: "danger" });
 * if (ok) api.deleteLead(id);
 */
export async function confirm(options: ConfirmOptions): Promise<boolean> {
  if (_open) return _open(options);
  // Fallback: ConfirmDialogRoot not mounted (should not happen in production)
  return window.confirm(`${options.title}\n\n${options.body ?? ""}`);
}

// ── Variant config ─────────────────────────────────────────────────────────────
const VARIANT_CFG = {
  danger:  { Icon: Trash2,        iconColor: "#DC2626", iconBg: "#FEF2F2", btnBg: "#DC2626" },
  warning: { Icon: AlertTriangle, iconColor: "#D97706", iconBg: "#FFFBEB", btnBg: "#D97706" },
  primary: { Icon: HelpCircle,    iconColor: "#5F47FF", iconBg: "#EEF2FF", btnBg: "#5F47FF" },
};

// ── ConfirmDialogRoot — render once in CRM layout ──────────────────────────────
export function ConfirmDialogRoot() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<Resolver | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const open = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setOpts(options);
    // Micro-delay so the element mounts before transition triggers
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return new Promise(resolve => { resolverRef.current = resolve; });
  }, []);

  useEffect(() => {
    _open = open;
    return () => { _open = null; };
  }, [open]);

  const handleResult = useCallback((result: boolean) => {
    setVisible(false);
    setTimeout(() => {
      setOpts(null);
      resolverRef.current?.(result);
      resolverRef.current = null;
    }, 200);
  }, []);

  // Focus confirm button when dialog opens (accessibility)
  useEffect(() => {
    if (visible) confirmBtnRef.current?.focus();
  }, [visible]);

  // Keyboard: Escape = cancel, Enter on confirm button = confirm
  useEffect(() => {
    if (!opts) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleResult(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [opts, handleResult]);

  if (!opts) return null;

  const cfg = VARIANT_CFG[opts.variant ?? "danger"];
  const Icon = cfg.Icon;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => handleResult(false)}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(15,23,42,0.48)",
          backdropFilter: "blur(2px)",
          zIndex: 9000,
          transition: "opacity 0.2s ease",
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cdlg-title"
        aria-describedby={opts.body ? "cdlg-body" : undefined}
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: `translate(-50%, ${visible ? "-50%" : "-44%"})`,
          zIndex: 9001,
          background: "#ffffff",
          borderRadius: 14,
          padding: "1.75rem",
          width: "min(400px, calc(100vw - 2rem))",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.08)",
          transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Close × */}
        <button
          onClick={() => handleResult(false)}
          aria-label="Cancel and close"
          style={{
            position: "absolute", top: "1rem", right: "1rem",
            background: "none", border: "none", cursor: "pointer",
            padding: 4, borderRadius: 6,
            color: "#94A3B8", display: "flex", alignItems: "center",
            transition: "color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#475569"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#94A3B8"; }}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: cfg.iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "1.125rem",
        }}>
          <Icon size={22} color={cfg.iconColor} aria-hidden />
        </div>

        {/* Title */}
        <h3
          id="cdlg-title"
          style={{ margin: "0 0 0.375rem", fontSize: "1rem", fontWeight: 700, color: "#1E293B" }}
        >
          {opts.title}
        </h3>

        {/* Body */}
        {opts.body && (
          <p
            id="cdlg-body"
            style={{ margin: "0 0 1.5rem", fontSize: "0.875rem", color: "#64748B", lineHeight: 1.55 }}
          >
            {opts.body}
          </p>
        )}
        {!opts.body && <div style={{ marginBottom: "1.5rem" }} />}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button
            onClick={() => handleResult(false)}
            className="crm-btn crm-btn-ghost"
            style={{ minWidth: 80 }}
          >
            {opts.cancelText ?? "Cancel"}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={() => handleResult(true)}
            className="crm-btn"
            style={{
              background: cfg.btnBg, color: "white",
              minWidth: 80,
              boxShadow: `0 2px 8px ${cfg.btnBg}44`,
            }}
          >
            {opts.confirmText ?? "Confirm"}
          </button>
        </div>
      </div>
    </>
  );
}
