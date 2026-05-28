"use client";
import type { ReactNode, CSSProperties } from "react";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
}

interface EmptyStateProps {
  /** Icon element — render at ~40px. Will be muted automatically. */
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  /** Reduce padding for inline/card contexts. */
  compact?: boolean;
  style?: CSSProperties;
}

/**
 * Production-ready empty state with optional icon, description, and CTA.
 *
 * @example
 * <EmptyState
 *   icon={<FileText size={40} />}
 *   title="No quotations yet"
 *   description="Send a quotation from any lead's drawer."
 *   action={{ label: "Go to Leads", href: "/crm/leads" }}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  style,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "1.75rem 1.25rem" : "3.5rem 2rem",
        gap: "0.375rem",
        ...style,
      }}
    >
      {icon && (
        <div
          aria-hidden="true"
          style={{ color: "#CBD5E1", marginBottom: compact ? "0.375rem" : "0.625rem" }}
        >
          {icon}
        </div>
      )}

      <div
        style={{
          fontSize: compact ? "0.875rem" : "0.9375rem",
          fontWeight: 600,
          color: "#475569",
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>

      {description && (
        <div
          style={{
            fontSize: compact ? "0.775rem" : "0.8125rem",
            color: "#94A3B8",
            maxWidth: 300,
            lineHeight: 1.55,
            marginTop: 2,
          }}
        >
          {description}
        </div>
      )}

      {(action || secondaryAction) && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: compact ? "0.75rem" : "1.25rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {action && <ActionButton {...action} defaultVariant="secondary" />}
          {secondaryAction && <ActionButton {...secondaryAction} defaultVariant="ghost" />}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  href,
  variant,
  defaultVariant,
}: EmptyStateAction & { defaultVariant: string }) {
  const cls = `crm-btn crm-btn-${variant ?? defaultVariant} crm-btn-sm`;
  if (href) {
    return <a href={href} className={cls}>{label}</a>;
  }
  return (
    <button className={cls} onClick={onClick}>
      {label}
    </button>
  );
}
