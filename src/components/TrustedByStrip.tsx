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
          <img
            src="/images/DPIIT_logo.png"
            alt="DPIIT Startup India Recognized"
            style={{ height: "55px", width: "auto", objectFit: "contain" }}
          />
          <div style={{ width: "1px", height: "50px", backgroundColor: "#E9ECEF" }} />
          <img
            src="/images/mca.png"
            alt="MCA Ministry of Corporate Affairs"
            style={{ height: "55px", width: "auto", objectFit: "contain" }}
          />
          <div style={{ width: "1px", height: "50px", backgroundColor: "#E9ECEF" }} />
          <img
            src="/images/iso_9001.png"
            alt="ISO 9001 Certified"
            style={{ height: "65px", width: "auto", objectFit: "contain" }}
          />
          <div style={{ width: "1px", height: "50px", backgroundColor: "#E9ECEF" }} />
          <img
            src="/images/iso_27001.png"
            alt="ISO 27001 Certified"
            style={{ height: "85px", width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Brand Color Accent Divider */}
        <div style={{
          width: "60px",
          height: "2px",
          background: "linear-gradient(-45deg, #6388FF 25%, #5F47FF 100%)",
          margin: "0 auto 36px auto",
          borderRadius: "2px",
        }} />

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
          marginBottom: "32px",
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

        {/* Award Photo Section */}
        <div style={{
          borderRadius: "20px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 8px 32px rgba(99,136,255,0.15)",
        }}>
          {/* Photo */}
          <img
            src="/images/award_photo.jpg"
            alt="Cradlewell CEO Lokesh receiving Healthtech Startup of the Year 2026 award at Entrepreneur India Startup Awards"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              objectFit: "cover",
            }}
          />

          {/* Overlay Caption */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to top, rgba(95,71,255,0.85) 0%, transparent 100%)",
            padding: "40px 32px 24px 32px",
          }}>
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}>
              {/* Left — Quote */}
              <div>
                <p style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#ffffff",
                  margin: "0 0 6px 0",
                  lineHeight: "1.4",
                }}>
                  "Proud to bring professional postnatal care
                  <br />to every family in India"
                </p>
                <p style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.8)",
                  margin: 0,
                }}>
                  — Lokesh, CEO & Co-Founder, Cradlewell
                </p>
              </div>

              {/* Right — Event Badge */}
              <div style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                borderRadius: "12px",
                padding: "10px 18px",
                border: "1px solid rgba(255,255,255,0.3)",
                textAlign: "center",
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#ffffff",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}>
                  Entrepreneur India
                </div>
                <div style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.8)",
                  marginTop: "2px",
                }}>
                  Startup Awards 2026
                </div>
                <div style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.7)",
                  marginTop: "2px",
                }}>
                  Tabulators: EY
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
