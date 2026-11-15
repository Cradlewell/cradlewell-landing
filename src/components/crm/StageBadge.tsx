"use client";
import type { LeadStage } from "@/lib/crm-types";

// Dot colour per stage. Status is shown as a 6px dot + label (no filled pills),
// matching the minimal table style. `variant="pill"` gives a soft outlined pill
// for places that want more emphasis (e.g. a record header).
const STAGE_DOT: Record<LeadStage, string> = {
  "New Lead":          "#2563EB",
  "Not Responding":    "#A8A29E",
  "Contacted":         "#0D9488",
  "Nurse Required":    "#EA580C",
  "Moba Required":     "#F97316",
  "Due date soon":     "#D97706",
  "Deferred Hot Lead": "#B4436C",
  "Follow-up":         "#CA8A04",
  "Negotiation":       "#7C3AED",
  "Closed Won":        "#16A34A",
  "Closed Lost":       "#78716C",
  "Invalid Lead":      "#DC2626",
};

interface Props {
  stage: LeadStage;
  size?: "sm" | "md";
  variant?: "dot" | "pill";
}

export default function StageBadge({ stage, size = "sm", variant = "dot" }: Props) {
  const dot = STAGE_DOT[stage] ?? "#A8A29E";
  const fontSize = size === "sm" ? 12 : 13;
  if (variant === "pill") {
    return (
      <span
        className="crm-badge"
        style={{ fontSize, border: "1px solid var(--cw-line-control)", background: "#fff", color: "var(--cw-ink-2)" }}
      >
        <span className="crm-status-dot" style={{ background: dot }} />
        {stage}
      </span>
    );
  }
  return (
    <span className="crm-status" style={{ fontSize }}>
      <span className="crm-status-dot" style={{ background: dot }} />
      {stage}
    </span>
  );
}
