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

        {/* Logos Row — 2x2 grid on mobile, single row on desktop */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "24px",
          marginBottom: "40px",
          alignItems: "center",
          justifyItems: "center",
        }}
          className="trusted-logos-grid"
        >
          <img
            src="/images/DPIIT_logo.png"
            alt="DPIIT Startup India Recognized"
            style={{ height: "45px", width: "auto", objectFit: "contain", maxWidth: "100%" }}
          />
          <img
            src="/images/mca.png"
            alt="MCA Ministry of Corporate Affairs"
            style={{ height: "45px", width: "auto", objectFit: "contain", maxWidth: "100%" }}
          />
          <img
            src="/images/iso_9001.png"
            alt="ISO 9001 Certified"
            style={{ height: "55px", width: "auto", objectFit: "contain", maxWidth: "100%" }}
          />
          <img
            src="/images/iso_27001.png"
            alt="ISO 27001 Certified"
            style={{ height: "70px", width: "auto", objectFit: "contain", maxWidth: "100%" }}
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
          padding: "24px 20px",
          boxShadow: "0 4px 24px rgba(99,136,255,0.12)",
          marginBottom: "32px",
        }}>

          {/* EP India Logo — centered on mobile */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "20px",
          }}>
            <img
              src="/images/ep_india.png"
              alt="Entrepreneur India"
              style={{
                height: "50px",
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
              marginTop: "8px",
            }}>
              Award Winner 2026
            </span>
          </div>

          {/* Horizontal Divider */}
          <div style={{
            width: "100%",
            height: "1px",
            backgroundColor: "#C5CEFF",
            marginBottom: "20px",
          }} />

          {/* Two Award Cards — stack on mobile */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
            className="award-cards-container"
          >

            {/* Award 1 */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "16px 20px",
              boxShadow: "0 2px 12px rgba(99,136,255,0.10)",
              border: "1px solid #EEF1FF",
            }}>
              <span style={{ fontSize: "36px", flexShrink: 0 }}>🏆</span>
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
              padding: "16px 20px",
              boxShadow: "0 2px 12px rgba(99,136,255,0.10)",
              border: "1px solid #EEF1FF",
            }}>
              <span style={{ fontSize: "36px", flexShrink: 0 }}>🌟</span>
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
            src="/images/award_photo.png"
            alt="Cradlewell CEO Lokesh receiving Healthtech Startup of the Year 2026 award at Entrepreneur India Startup Awards"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              objectFit: "cover",
            }}
          />

          {/* Gradient Overlay */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(to top, rgba(95,71,255,0.92) 0%, rgba(99,136,255,0.5) 60%, transparent 100%)",
            padding: "40px 20px 20px 20px",
          }}>

            {/* Quote */}
            <p style={{
              fontSize: "15px",
              fontWeight: "600",
              color: "#ffffff",
              margin: "0 0 6px 0",
              lineHeight: "1.5",
            }}>
              "Proud to bring professional postnatal care to every family in India"
            </p>
            <p style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.8)",
              margin: "0 0 12px 0",
            }}>
              — Lokesh, CEO &amp; Co-Founder, Cradlewell
            </p>

            {/* Event Badge — full width on mobile */}
            <div style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              borderRadius: "10px",
              padding: "10px 16px",
              border: "1px solid rgba(255,255,255,0.3)",
              display: "inline-flex",
              gap: "16px",
              alignItems: "center",
            }}>
              <div style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "#ffffff",
                letterSpacing: "0.5px",
              }}>
                Entrepreneur India Startup Awards 2026
              </div>
              <div style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.75)",
                borderLeft: "1px solid rgba(255,255,255,0.3)",
                paddingLeft: "16px",
              }}>
                Tabulators: EY
              </div>
            </div>

          </div>
        </div>

      </Container>

      {/* Responsive CSS */}
      <style jsx>{`
        .trusted-logos-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }

        .award-cards-container {
          flex-direction: column !important;
        }

        @media (min-width: 768px) {
          .trusted-logos-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }

          .award-cards-container {
            flex-direction: row !important;
          }
        }
      `}</style>

    </div>
  );
};

export default TrustedByStrip;
