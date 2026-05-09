"use client";
import type { LeadStage } from "@/lib/crm-types";

const STAGE_STYLES: Record<LeadStage, { bg: string; color: string }> = {
  "New Lead":        { bg: "#EEF1FF", color: "#6388FF" },
  "Not Responding":  { bg: "#F1F5F9", color: "#64748B" },
  "Contacted":       { bg: "#F0FDF4", color: "#16A34A" },
  "Nurse Required":  { bg: "#FFF7ED", color: "#C2410C" },
  "Moba Required":   { bg: "#FFF7ED", color: "#EA580C" },
  "Due date soon":   { bg: "#FFFBEB", color: "#B45309" },
  "Follow-up":       { bg: "#FFFBEB", color: "#92400E" },
  "Negotiation":     { bg: "#F5F3FF", color: "#7C3AED" },
  "Closed Won":      { bg: "#F0FDF4", color: "#15803D" },
  "Closed Lost":     { bg: "#F1F5F9", color: "#64748B" },
  "Invalid Lead":    { bg: "#FEF2F2", color: "#DC2626" },
};

interface Props {
  stage: LeadStage;
  size?: "sm" | "md";
}

export default function StageBadge({ stage, size = "sm" }: Props) {
  const s = STAGE_STYLES[stage] ?? { bg: "#F1F5F9", color: "#64748B" };
  return (
    <span
      className="crm-badge"
      style={{
        background: s.bg,
        color: s.color,
        fontSize: size === "sm" ? "0.7rem" : "0.78rem",
      }}
    >
      {stage}
    </span>
  );
}
