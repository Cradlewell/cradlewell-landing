"use client";
import type { CSSProperties } from "react";

// ── Base ───────────────────────────────────────────────────────────────────────
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}

function SkeletonBase({ width, height = 16, radius = 6, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className="crm-skeleton"
      style={{ width: width ?? "100%", height, borderRadius: radius, ...style }}
    />
  );
}

// ── Primitives ─────────────────────────────────────────────────────────────────

export function Skeleton(props: SkeletonProps) {
  return <SkeletonBase {...props} />;
}

/** Stacked text lines with the last line shorter (natural paragraph look). */
export function SkeletonText({
  lines = 3,
  lastLineWidth = "55%",
  gap = 8,
}: {
  lines?: number;
  lastLineWidth?: string;
  gap?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          height={13}
          width={i === lines - 1 ? lastLineWidth : "100%"}
          radius={4}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <SkeletonBase width={size} height={size} radius="50%" />;
}

// ── Composite ──────────────────────────────────────────────────────────────────

export function SkeletonStatCard() {
  return (
    <div className="crm-stat-card" style={{ pointerEvents: "none", cursor: "default" }}>
      <SkeletonBase width={36} height={36} radius={8} style={{ marginBottom: 10 }} />
      <SkeletonBase width={72} height={11} radius={4} />
      <SkeletonBase width={52} height={26} radius={6} style={{ marginTop: 6 }} />
    </div>
  );
}

export function SkeletonStatGrid({
  count = 9,
  columns = "repeat(3, 1fr)",
}: {
  count?: number;
  columns?: string;
}) {
  return (
    <div
      className="crm-grid-4"
      style={{ gridTemplateColumns: columns, marginBottom: "1.5rem" }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 8,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  // Vary column widths to look natural
  const colWidths = Array.from({ length: cols }, (_, i) =>
    i === 0 ? "75%" : i % 4 === 0 ? 50 : i % 3 === 0 ? 70 : 90
  );

  return (
    <div className="crm-table-wrap">
      <table className="crm-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <SkeletonBase height={11} width={i === 0 ? 80 : 55} radius={4} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, row) => (
            <tr key={row} style={{ pointerEvents: "none" }}>
              {colWidths.map((w, col) => (
                <td key={col}>
                  <SkeletonBase height={13} width={w} radius={4} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCard({ lines = 3, style }: { lines?: number; style?: CSSProperties }) {
  return (
    <div className="crm-card" style={{ padding: "1.25rem", ...style }}>
      <SkeletonBase height={15} width="55%" radius={6} style={{ marginBottom: 14 }} />
      <SkeletonText lines={lines} />
    </div>
  );
}

/** Matches the 2-column hero card layout on the Dashboard. */
export function SkeletonHeroCard() {
  return (
    <div
      className="crm-hero-card mb-4"
      style={{ opacity: 0.5, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <SkeletonBase height={11} width={120} radius={4} style={{ background: "rgba(255,255,255,0.3)", marginBottom: 10 }} />
      <SkeletonBase height={40} width={200} radius={8} style={{ background: "rgba(255,255,255,0.3)" }} />
    </div>
  );
}
