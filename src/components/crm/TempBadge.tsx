"use client";
import type { LeadTemperature } from "@/lib/crm-types";

const TEMP_DOT: Record<LeadTemperature, string> = {
  Hot:  "#DC2626",
  Warm: "#D97706",
  Cold: "#3B82F6",
};

export default function TempBadge({ temp }: { temp: LeadTemperature }) {
  return (
    <span className="crm-status" style={{ fontSize: 12 }}>
      <span className="crm-status-dot" style={{ background: TEMP_DOT[temp] ?? "#A8A29E" }} />
      {temp}
    </span>
  );
}
