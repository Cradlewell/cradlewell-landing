"use client";
import React from "react";
import { Container, Row, Col } from "react-bootstrap";

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
            style={{
              height: "55px",
              width: "auto",
              objectFit: "contain",
            }}
          />

          {/* Divider */}
          <div style={{ width: "1px", height: "50px", backgroundColor: "#E9ECEF" }} />

          {/* MCA */}
          <img
            src="/images/mca.png"
            alt="MCA Ministry of Corporate Affairs"
            style={{
              height: "55px",
              width: "auto",
              objectFit: "contain",
            }}
          />

          {/* Divider */}
          <div style={{ width: "1px", height: "50px", backgroundColor: "#E9ECEF" }} />

          {/* ISO 9001 */}
          <img
            src="/images/iso_9001.png"
            alt="ISO 9001 Certified Company"
            style={{
              height: "65px",
              width: "auto",
              objectFit: "contain",
            }}
          />

          {/* Divider */}
          <div style={{ width: "1px", height: "50px", backgroundColor: "#E9ECEF" }} />

          {/* ISO 27001 — bigger */}
          <img
            src="/images/iso_27001.png"
            alt="ISO 27001 Certified"
            style={{
              height: "85px",
              width: "auto",
              objectFit: "contain",
            }}
          />

        </div>

        {/* Thin Divider */}
        <div style={{
          width: "60px",
          height: "2px",
          backgroundColor: "#F5C518",
          margin: "0 auto 36px auto",
          borderRadius: "2px",
        }} />

        {/* Award Badges Row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "24px",
        }}>

          {/* Award 1 */}
          <div style={{
            backgroundColor: "#FFF8E7",
            border: "1px solid #F5C518",
            borderRadius: "14px",
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 2px 12px rgba(245,197,24,0.15)",
          }}>
            <span style={{ fontSize: "36px" }}>🏆</span>
            <div>
              <div style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#B8860B",
                lineHeight: "1.3",
              }}>
                Health &amp; Wellness Startup of the Year
              </div>
              <div style={{
                fontSize: "12px",
                color: "#6c757d",
                marginTop: "2px",
              }}>
                Entrepreneur India 2026
              </div>
            </div>
          </div>

          {/* Award 2 */}
          <div style={{
            backgroundColor: "#FFF3E0",
            border: "1px solid #FFCC80",
            borderRadius: "14px",
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 2px 12px rgba(255,152,0,0.15)",
          }}>
            <span style={{ fontSize: "36px" }}>🥇</span>
            <div>
              <div style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#E65100",
                lineHeight: "1.3",
              }}>
                Healthtech Startup of the Year
              </div>
              <div style={{
                fontSize: "12px",
                color: "#6c757d",
                marginTop: "2px",
              }}>
                Entrepreneur India 2026
              </div>
            </div>
          </div>

        </div>

      </Container>
    </div>
  );
};

export default TrustedByStrip;
