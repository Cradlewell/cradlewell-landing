{/* Premium Award Banner */}
<div style={{
  background: "linear-gradient(135deg, #EEF1FF 0%, #E8E4FF 100%)",
  border: "1px solid #C5CEFF",
  borderRadius: "20px",
  padding: "36px 40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "32px",
  boxShadow: "0 4px 24px rgba(99,136,255,0.12)",
}}>

  {/* Left — EP India Logo */}
  <div style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    flex: "0 0 auto",
  }}>
    <img
      src="/images/ep_india.png"
      alt="Entrepreneur India"
      style={{
        height: "60px",
        width: "auto",
        objectFit: "contain",
      }}
    />
    <span style={{
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "1.5px",
      color: "#6388FF",
      textTransform: "uppercase",
    }}>
      Award Winner 2026
    </span>
  </div>

  {/* Vertical Divider */}
  <div style={{
    width: "1px",
    height: "80px",
    backgroundColor: "#C5CEFF",
    flexShrink: 0,
  }} />

  {/* Right — Two Awards */}
  <div style={{
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    flex: "1",
    justifyContent: "center",
  }}>

    {/* Award 1 */}
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "14px",
      backgroundColor: "#ffffff",
      borderRadius: "14px",
      padding: "16px 24px",
      boxShadow: "0 2px 12px rgba(99,136,255,0.10)",
      border: "1px solid #EEF1FF",
      flex: "1",
      minWidth: "220px",
    }}>
      <span style={{ fontSize: "40px", flexShrink: 0 }}>🏆</span>
      <div>
        <div style={{
          fontSize: "14px",
          fontWeight: "800",
          color: "#5F47FF",
          lineHeight: "1.3",
          marginBottom: "4px",
        }}>
          Health &amp; Wellness
        </div>
        <div style={{
          fontSize: "13px",
          fontWeight: "600",
          color: "#374151",
          lineHeight: "1.3",
        }}>
          Startup of the Year 2026
        </div>
        <div style={{
          fontSize: "11px",
          color: "#9CA3AF",
          marginTop: "4px",
        }}>
          Entrepreneur India
        </div>
      </div>
    </div>

    {/* Award 2 */}
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "14px",
      backgroundColor: "#ffffff",
      borderRadius: "14px",
      padding: "16px 24px",
      boxShadow: "0 2px 12px rgba(99,136,255,0.10)",
      border: "1px solid #EEF1FF",
      flex: "1",
      minWidth: "220px",
    }}>
      <span style={{ fontSize: "40px", flexShrink: 0 }}>🥇</span>
      <div>
        <div style={{
          fontSize: "14px",
          fontWeight: "800",
          color: "#5F47FF",
          lineHeight: "1.3",
          marginBottom: "4px",
        }}>
          Healthtech Startup
        </div>
        <div style={{
          fontSize: "13px",
          fontWeight: "600",
          color: "#374151",
          lineHeight: "1.3",
        }}>
          of the Year 2026
        </div>
        <div style={{
          fontSize: "11px",
          color: "#9CA3AF",
          marginTop: "4px",
        }}>
          Entrepreneur India
        </div>
      </div>
    </div>

  </div>
</div>
