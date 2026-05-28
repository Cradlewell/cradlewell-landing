"use client";

interface PageLoaderProps {
  message?: string;
}

/**
 * Full-content-area loading state with spinner and message.
 * Used as the initial CRM data loading placeholder.
 */
export function PageLoader({ message = "Loading…" }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-label={message}
      aria-busy="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1.25rem",
        height: "60vh",
        width: "100%",
      }}
    >
      {/* Dual-ring spinner using the CRM primary colour */}
      <div style={{ position: "relative", width: 44, height: 44 }}>
        {/* Outer track */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: "3px solid var(--crm-border)",
        }} />
        {/* Spinning arc */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: "3px solid transparent",
          borderTopColor: "var(--crm-primary)",
          animation: "crm-spin 0.7s linear infinite",
        }} />
      </div>
      <p
        aria-live="polite"
        style={{
          margin: 0,
          color: "var(--crm-text-muted)",
          fontSize: "0.875rem",
          fontWeight: 500,
        }}
      >
        {message}
      </p>
    </div>
  );
}
