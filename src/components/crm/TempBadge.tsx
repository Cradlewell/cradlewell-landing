"use client";
import type { LeadTemperature } from "@/lib/crm-types";

const TEMP: Record<LeadTemperature, { bg: string; color: string; dot: string }> = {
  Hot:  { bg: "#FEF2F2", color: "#DC2626", dot: "#EF4444" },
  Warm: { bg: "#FFFBEB", color: "#B45309", dot: "#F59E0B" },
  Cold: { bg: "#EFF6FF", color: "#1D4ED8", dot: "#60A5FA" },
};

export default function TempBadge({ temp }: { temp: LeadTemperature }) {
  const s = TEMP[temp];
  return (
    <span className="crm-badge" style={{ background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
      {temp}
    </span>
  );
}
