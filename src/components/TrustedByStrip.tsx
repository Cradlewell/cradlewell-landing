"use client";
import React from "react";
import { Container } from "react-bootstrap";

const TrustedByStrip = () => {
  return (
    <div style={{
      backgroundColor: "#ffffff",
      borderTop: "1px solid #F0F0F0",
      borderBottom: "1px solid #F0F0F0",
      padding: "40px 0",
    }}>
      <Container>

        {/* Heading */}
        <p style={{
          textAlign: "center",
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "2.5px",
          color: "#B0B0B0",
          textTransform: "uppercase",
          marginBottom: "36px",
        }}>
          Trusted By &amp; Recognized By
        </p>

        {/* Logos Row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "48px",
          marginBottom: "40px",
        }}>

          {/* DPIIT */}
          <img
            src="/images/DPIIT_logo.png"
            alt="DPIIT Startup India Recognized"
            style={{ height: "55px", width: "auto", objectFit: "contain" }}
          />

          <div style={{ width: "1px", height: "50px", backgroundColor: "#E9ECEF" }} />

          {/* MCA */}
          <img
            src="/images/mca.png"
            alt="MCA Ministry of Corporate Affairs"
            style={{ height: "55px", width: "auto", objectFit: "contain" }}
          />

          <div style={{ width: "1px", height: "50px", backgroundColor: "#E9ECEF" }} />

          {/* ISO 9001 */}
          <img
            src="/images/iso_9001.png"
            alt="ISO 9001 Certified"
            style={{ height: "65px", width: "auto", objectFit: "contain" }}
          />

          <div style={{ width: "1px", height: "50px", backgroundColor: "#E9ECEF" }} />

          {/* ISO 27001 */}
          <img
            src="/images/iso_27001.png"
            alt="ISO 27001 Certified"
            style={{ height: "85px", width: "auto", objectFit: "contain" }}
          />

        </div>

        {/* Gold Accent Divider */}
        <div style={{
          width: "60px",
          height: "2px",
          backgroundColor: "#F5C518",
          margin: "0 auto 36px auto",
          borderRadius: "2px",
        }} />

        {/* Premium Award Banner */}
        <div style={{
          background: "linear-gradient(135deg, #fff8f8 0%, #fff3e0 100%)",
          border: "1px solid #FFE0E0",
          borderRadius: "20px",
          padding: "36px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "32px",
          boxShadow: "0 4px 24px rgba(220,53,69,0.08)",
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
              color: "#9CA3AF",
              textTransform: "uppercase",
            }}>
              Award Winner 2026
            </span>
          </div>

          {/* Vertical Divider */}
          <div style={{
            width: "1px",
            height: "80px",
            backgroundColor: "#FFD0D0",
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
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              flex: "1",
              minWidth: "220px",
            }}>
              <span style={{ fontSize: "40px", flexShrink: 0 }}>🏆</span>
              <div>
                <div style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#B8860B",
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
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              flex: "1",
              minWidth: "220px",
            }}>
              <span style={{ fontSize: "40px", flexShrink: 0 }}>🥇</span>
              <div>
                <div style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#E65100",
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

      </Container>
    </div>
  );
};

export default TrustedByStrip;
