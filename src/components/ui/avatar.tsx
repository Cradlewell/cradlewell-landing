"use client";
import type { CSSProperties } from "react";

// ── Deterministic palette — same name always gets the same colour ──────────────
const PALETTE: Array<{ bg: string; color: string }> = [
  { bg: "#EEF1FF", color: "#6388FF" },
  { bg: "#F0FDF4", color: "#16A34A" },
  { bg: "#FFF7ED", color: "#EA580C" },
  { bg: "#F5F3FF", color: "#7C3AED" },
  { bg: "#FDF2F8", color: "#DB2777" },
  { bg: "#ECFDF5", color: "#059669" },
  { bg: "#FEF3C7", color: "#D97706" },
  { bg: "#EFF6FF", color: "#2563EB" },
  { bg: "#FFF1F2", color: "#E11D48" },
  { bg: "#F0FDFA", color: "#0D9488" },
];

function paletteFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface AvatarProps {
  name: string;
  size?: number;
  /** Default: rounded square for size ≥ 40, circle otherwise */
  shape?: "circle" | "rounded";
  /** Override the auto-generated background */
  bg?: string;
  /** Override the auto-generated text colour */
  color?: string;
  style?: CSSProperties;
  className?: string;
}

/**
 * Renders a coloured initials avatar. Colour is deterministic — the same name
 * always gets the same colour across sessions and page refreshes.
 *
 * @example
 * <Avatar name="Priya Sharma" size={40} />
 * <Avatar name="Admin" size={32} shape="circle" />
 */
export function Avatar({
  name,
  size = 36,
  shape,
  bg: bgOverride,
  color: colorOverride,
  style,
  className,
}: AvatarProps) {
  const { bg, color } = paletteFor(name);
  const resolvedShape = shape ?? (size >= 40 ? "rounded" : "circle");
  const radius = resolvedShape === "circle" ? "50%" : Math.max(6, Math.round(size * 0.22));
  const fontSize = size >= 44 ? "1rem" : size >= 32 ? "0.8125rem" : "0.6875rem";

  return (
    <div
      aria-label={name}
      title={name}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bgOverride ?? bg,
        color: colorOverride ?? color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        fontWeight: 700,
        flexShrink: 0,
        userSelect: "none",
        letterSpacing: "0.01em",
        ...style,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

// ── AvatarGroup — overlapping stack ───────────────────────────────────────────
interface AvatarGroupProps {
  names: string[];
  size?: number;
  max?: number;
}

/**
 * Stacks up to `max` avatars with overflow count.
 * @example
 * <AvatarGroup names={["Priya", "Ravi", "Meena", "Arjun"]} max={3} />
 */
export function AvatarGroup({ names, size = 28, max = 4 }: AvatarGroupProps) {
  const visible = names.slice(0, max);
  const overflow = names.length - max;

  return (
    <div
      style={{ display: "flex", alignItems: "center" }}
      aria-label={`${names.length} people`}
    >
      {visible.map((name, i) => (
        <Avatar
          key={name + i}
          name={name}
          size={size}
          shape="circle"
          style={{
            marginLeft: i === 0 ? 0 : -(size * 0.3),
            boxShadow: "0 0 0 2px white",
            zIndex: visible.length - i,
          }}
        />
      ))}
      {overflow > 0 && (
        <div
          aria-label={`${overflow} more`}
          title={names.slice(max).join(", ")}
          style={{
            width: size, height: size, borderRadius: "50%",
            background: "#E2E8F0", color: "#64748B",
            fontSize: size >= 32 ? "0.75rem" : "0.65rem",
            fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginLeft: -(size * 0.3),
            boxShadow: "0 0 0 2px white",
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
