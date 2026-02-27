"use client";
import React from "react";
import { Container } from "react-bootstrap";

const TrustedByStrip = () => {
  const logos = [
    {
      id: 1,
      src: "/images/DPIIT_logo.png",
      alt: "DPIIT Startup India Recognized",
    },
    {
      id: 2,
      src: "/images/mca.png",
      alt: "MCA Ministry of Corporate Affairs",
    },
    {
      id: 3,
      src: "/images/iso_9001.png",
      alt: "ISO 9001 Certified Company",
    },
    {
      id: 4,
      src: "/images/iso_27001.png",
      alt: "ISO 27001 Certified",
    },
  ];

  // Duplicate for seamless infinite loop
  const allLogos = [...logos, ...logos, ...logos];

  return (
    <div style={{
      backgroundColor: "#ffffff",
      borderTop: "1px solid #F0F0F0",
      borderBottom: "1px solid #F0F0F0",
      padding: "28px 0",
      overflow: "hidden",
    }}>

      {/* Heading */}
      <p style={{
        textAlign: "center",
        fontSize: "11px",
        fontWeight: "700",
        letterSpacing: "2.5px",
        color: "#B0B0B0",
        textTransform: "uppercase",
        marginBottom: "24px",
      }}>
        Trusted By &amp; Recognized By
      </p>

      {/* Scrolling Strip */}
      <div style={{
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}>

        {/* Left Fade */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "100px",
          background: "linear-gradient(to right, #ffffff, transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }} />

        {/* Right Fade */}
        <div style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "100px",
          background: "linear-gradient(to left, #ffffff, transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }} />

        {/* Scrolling Track */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "60px",
          animation: "scrollLeft 18s linear infinite",
          width: "max-content",
          paddingLeft: "60px",
        }}>
          {allLogos.map((logo, index) => (
            <img
              key={index}
              src={logo.src}
              alt={logo.alt}
              style={{
                height: "50px",
                width: "auto",
                objectFit: "contain",
                flexShrink: 0,
                filter: "grayscale(100%)",
                opacity: 0.6,
                transition: "all 0.3s ease",
              }}
              onMouseEnter={e => {
                (e.target as HTMLImageElement).style.filter = "grayscale(0%)";
                (e.target as HTMLImageElement).style.opacity = "1";
              }}
              onMouseLeave={e => {
                (e.target as HTMLImageElement).style.filter = "grayscale(100%)";
                (e.target as HTMLImageElement).style.opacity = "0.6";
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scrollLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}</style>

    </div>
  );
};

export default TrustedByStrip;
