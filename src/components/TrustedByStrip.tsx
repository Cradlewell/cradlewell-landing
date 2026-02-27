"use client";
import React from "react";
import { Container } from "react-bootstrap";

const TrustedByStrip = () => {
  const logos = [
    {
      id: 1,
      src: "/images/DPIIT_logo.png",
      alt: "DPIIT Startup India Recognized",
      label: "DPIIT Recognized",
      sublabel: "Startup India",
      darkBg: true
    },
    {
      id: 2,
      src: "/images/mca.png",
      alt: "MCA Ministry of Corporate Affairs Registered",
      label: "MCA Registered",
      sublabel: "Govt. of India",
      darkBg: false
    },
    {
      id: 3,
      src: "/images/iso_9001.png",
      alt: "ISO 9001 Certified Company",
      label: "ISO 9001 Certified",
      sublabel: "Quality Management",
      darkBg: true
    },
    {
      id: 4,
      src: "/images/iso_27001.png",
      alt: "ISO 27001 Certified",
      label: "ISO 27001 Certified",
      sublabel: "Information Security",
      darkBg: true
    },
    {
      id: 5,
      src: "/images/DPIIT_logo.png",
      alt: "DPIIT Startup India Recognized",
      label: "DPIIT Recognized",
      sublabel: "Startup India",
      darkBg: true
    },
  ];

  // Award badges using text (no image needed)
  const awards = [
    {
      id: 6,
      icon: "🏆",
      label: "Healthtech Startup of the Year",
      sublabel: "Entrepreneur India 2026",
      bg: "#FFF8E7",
      border: "#F5C518",
      color: "#B8860B"
    },
    {
      id: 7,
      icon: "🥇",
      label: "Health & Wellness Startup",
      sublabel: "of the Year — Entrepreneur India 2026",
      bg: "#FFF3E0",
      border: "#FFCC80",
      color: "#E65100"
    },
  ];

  // Duplicate for seamless loop
  const allLogos = [...logos, ...logos];
  const allAwards = [...awards, ...awards];

  return (
    <div style={{
      backgroundColor: "#F8FAFB",
      borderTop: "1px solid #E9ECEF",
      borderBottom: "1px solid #E9ECEF",
      padding: "36px 0",
      overflow: "hidden",
      marginBottom: "48px"
    }}>

      {/* Heading */}
      <Container>
        <p style={{
          textAlign: "center",
          fontSize: "12px",
          fontWeight: "700",
          letterSpacing: "2px",
          color: "#9CA3AF",
          textTransform: "uppercase",
          marginBottom: "28px"
        }}>
          Trusted By &amp; Recognized By
        </p>
      </Container>

      {/* Row 1 — Certification Logos */}
      <div style={{
        overflow: "hidden",
        position: "relative",
        width: "100%",
        marginBottom: "16px"
      }}>
        {/* Left Fade */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "80px",
          background: "linear-gradient(to right, #F8FAFB, transparent)",
          zIndex: 2,
          pointerEvents: "none"
        }} />

        {/* Right Fade */}
        <div style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "80px",
          background: "linear-gradient(to left, #F8FAFB, transparent)",
          zIndex: 2,
          pointerEvents: "none"
        }} />

        {/* Scrolling Track */}
        <div style={{
          display: "flex",
          gap: "24px",
          animation: "scrollLeft 25s linear infinite",
          width: "max-content",
          paddingLeft: "24px"
        }}>
          {allLogos.map((logo, index) => (
            <div
              key={index}
              style={{
                backgroundColor: logo.darkBg ? "#1a1a2e" : "#ffffff",
                borderRadius: "12px",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                minWidth: "220px",
                flexShrink: 0,
                boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                border: "1px solid #E9ECEF"
              }}
            >
              <img
                src={logo.src}
                alt={logo.alt}
                style={{
                  height: "48px",
                  width: "auto",
                  objectFit: "contain",
                  flexShrink: 0
                }}
              />
              <div>
                <div style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: logo.darkBg ? "#ffffff" : "#1a1a2e",
                  lineHeight: "1.3"
                }}>
                  {logo.label}
                </div>
                <div style={{
                  fontSize: "11px",
                  color: logo.darkBg ? "#9CA3AF" : "#6c757d",
                  lineHeight: "1.3"
                }}>
                  {logo.sublabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 — Award Badges scrolling opposite direction */}
      <div style={{
        overflow: "hidden",
        position: "relative",
        width: "100%"
      }}>
        {/* Left Fade */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "80px",
          background: "linear-gradient(to right, #F8FAFB, transparent)",
          zIndex: 2,
          pointerEvents: "none"
        }} />

        {/* Right Fade */}
        <div style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "80px",
          background: "linear-gradient(to left, #F8FAFB, transparent)",
          zIndex: 2,
          pointerEvents: "none"
        }} />

        {/* Scrolling Track — opposite direction */}
        <div style={{
          display: "flex",
          gap: "24px",
          animation: "scrollRight 20s linear infinite",
          width: "max-content",
          paddingLeft: "24px"
        }}>
          {allAwards.map((award, index) => (
            <div
              key={index}
              style={{
                backgroundColor: award.bg,
                border: `1px solid ${award.border}`,
                borderRadius: "12px",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                minWidth: "280px",
                flexShrink: 0,
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
              }}
            >
              <span style={{ fontSize: "28px" }}>{award.icon}</span>
              <div>
                <div style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: award.color,
                  lineHeight: "1.3"
                }}>
                  {award.label}
                </div>
                <div style={{
                  fontSize: "11px",
                  color: "#6c757d",
                  lineHeight: "1.3"
                }}>
                  {award.sublabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes scrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scrollRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>

    </div>
  );
};

export default TrustedByStrip;
