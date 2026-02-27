"use client";
import React from "react";
import { Container } from "react-bootstrap";

const TrustedByStrip = () => {
  return (
    <div style={{
      backgroundColor: "#ffffff",
      borderTop: "1px solid #F0F0F0",
      borderBottom: "1px solid #F0F0F0",
      padding: "48px 0",
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
          marginBottom: "40px",
        }}>
          Trusted By &amp; Recognized By
        </p>

        {/* ── Logos Row ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "40px",
          marginBottom: "48px",
        }}>
          <img
            src="/images/DPIIT_logo.png"
            alt="DPIIT Startup India"
            style={{ height: "50px", width: "auto", objectFit: "contain" }}
          />
          <div style={{ width: "1px", height: "40px", backgroundColor: "#E0E0E0" }} />
          <img
            src="/images/mca.png"
            alt="MCA Ministry of Corporate Affairs"
            style={{ height: "50px", width: "auto", objectFit: "contain" }}
          />
          <div style={{ width: "1px", height: "40px", backgroundColor: "#E0E0E0" }} />
          <img
            src="/images/iso_9001.png"
            alt="ISO 9001 Certified"
            style={{ height: "60px", width: "auto", objectFit: "contain" }}
          />
          <div style={{ width: "1px", height: "40px", backgroundColor: "#E0E0E0" }} />
          <img
            src="/images/iso_27001.png"
            alt="ISO 27001 Certified"
            style={{ height: "80px", width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* ── Brand Divider ── */}
        <div style={{
          width: "60px",
          height: "3px",
          background: "linear-gradient(-45deg, #6388FF 25%, #5F47FF 100%)",
          margin: "0 auto 48px auto",
          borderRadius: "4px",
        }} />

        {/* ── Award Section ── */}
        <div style={{
          background: "linear-gradient(135deg, #EEF1FF 0%, #E8E4FF 100%)",
          border: "1px solid #C5CEFF",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 4px 32px rgba(99,136,255,0.10)",
          marginBottom: "32px",
        }}>

          {/* Top Row — Logo + Label */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "32px",
          }}>
            <img
              src="/images/ep_india.png"
              alt="Entrepreneur India"
              style={{
                height: "44px",
                width: "auto",
                objectFit: "contain",
              }}
            />
            <div style={{
              width: "1px",
              height: "36px",
              backgroundColor: "#C5CEFF",
            }} />
            <div>
              <div style={{
                fontSize: "13px",
                fontWeight: "800",
                color: "#5F47FF",
                letterSpacing: "0.5px",
              }}>
                Startup Awards 2026
              </div>
              <div style={{
                fontSize: "11px",
                color: "#9CA3AF",
                marginTop: "2px",
              }}>
                Official Tabulators: EY
              </div>
            </div>
          </div>

          {/* Award Cards Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
            className="award-grid"
          >

            {/* Award 1 */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 2px 16px rgba(99,136,255,0.08)",
              border: "1px solid #EEF1FF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "12px",
            }}>
              <div style={{ fontSize: "44px" }}>🏆</div>
              <div>
                <div style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#5F47FF",
                  lineHeight: "1.3",
                  marginBottom: "6px",
                }}>
                  Health &amp; Wellness
                </div>
                <div style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  lineHeight: "1.3",
                  marginBottom: "6px",
                }}>
                  Startup of the Year
                </div>
                <div style={{
                  display: "inline-block",
                  backgroundColor: "#EEF1FF",
                  color: "#5F47FF",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 10px",
                  borderRadius: "20px",
                }}>
                  2026
                </div>
              </div>
            </div>

            {/* Award 2 */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 2px 16px rgba(99,136,255,0.08)",
              border: "1px solid #EEF1FF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "12px",
            }}>
              <div style={{ fontSize: "44px" }}>🌟</div>
              <div>
                <div style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#5F47FF",
                  lineHeight: "1.3",
                  marginBottom: "6px",
                }}>
                  Healthtech Startup
                </div>
                <div style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#374151",
                  lineHeight: "1.3",
                  marginBottom: "6px",
                }}>
                  of the Year
                </div>
                <div style={{
                  display: "inline-block",
                  backgroundColor: "#EEF1FF",
                  color: "#5F47FF",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 10px",
                  borderRadius: "20px",
                }}>
                  2026
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Award Photo ── */}
        <div style={{
          borderRadius: "24px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 8px 40px rgba(99,136,255,0.15)",
        }}>
          <img
            src="/images/award_photo.png"
            alt="Cradlewell CEO Lokesh receiving Healthtech Startup of the Year 2026 at Entrepreneur India Startup Awards"
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
            background: "linear-gradient(to top, rgba(95,71,255,0.92) 0%, rgba(99,136,255,0.4) 55%, transparent 100%)",
            padding: "48px 28px 28px 28px",
          }}>
            <div className="award-photo-overlay">

              {/* Quote */}
              <div>
                <p style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#ffffff",
                  margin: "0 0 6px 0",
                  lineHeight: "1.5",
                }}>
                  "Proud to bring professional postnatal care to every family in India"
                </p>
                <p style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.75)",
                  margin: 0,
                }}>
                  — Lokesh, CEO &amp; Co-Founder, Cradlewell
                </p>
              </div>

              {/* Badge */}
              <div style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                borderRadius: "12px",
                padding: "12px 20px",
                border: "1px solid rgba(255,255,255,0.25)",
                textAlign: "center",
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#ffffff",
                  letterSpacing: "0.5px",
                }}>
                  Entrepreneur India
                </div>
                <div style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.8)",
                  marginTop: "3px",
                }}>
                  Startup Awards 2026
                </div>
                <div style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.6)",
                  marginTop: "3px",
                }}>
                  Official Tabulators: EY
                </div>
              </div>

            </div>
          </div>
        </div>

      </Container>

      {/* Responsive CSS */}
      <style jsx>{`
        .award-grid {
          grid-template-columns: 1fr 1fr;
        }

        .award-photo-overlay {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        @media (max-width: 576px) {
          .award-grid {
            grid-template-columns: 1fr !important;
          }
          .award-photo-overlay {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

    </div>
  );
};

export default TrustedByStrip;
