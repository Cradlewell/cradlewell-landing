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

        {/* Logos Row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "24px",
          marginBottom: "48px",
        }}>
          <img
            src="/images/DPIIT_logo.png"
            alt="DPIIT Startup India"
            style={{ height: "45px", width: "auto", objectFit: "contain", maxWidth: "120px" }}
          />
          <div className="d-none d-md-block" style={{ width: "1px", height: "40px", backgroundColor: "#E0E0E0" }} />
          <img
            src="/images/mca.png"
            alt="MCA Ministry of Corporate Affairs"
            style={{ height: "45px", width: "auto", objectFit: "contain", maxWidth: "120px" }}
          />
          <div className="d-none d-md-block" style={{ width: "1px", height: "40px", backgroundColor: "#E0E0E0" }} />
          <img
            src="/images/iso_9001.png"
            alt="ISO 9001 Certified"
            style={{ height: "55px", width: "auto", objectFit: "contain", maxWidth: "100px" }}
          />
          <div className="d-none d-md-block" style={{ width: "1px", height: "40px", backgroundColor: "#E0E0E0" }} />
          <img
            src="/images/iso_27001.png"
            alt="ISO 27001 Certified"
            style={{ height: "70px", width: "auto", objectFit: "contain", maxWidth: "100px" }}
          />
        </div>

        {/* Brand Divider */}
        <div style={{
          width: "60px",
          height: "3px",
          background: "linear-gradient(-45deg, #6388FF 25%, #5F47FF 100%)",
          margin: "0 auto 48px auto",
          borderRadius: "4px",
        }} />

        {/* Award Section */}
        <div style={{
          background: "linear-gradient(135deg, #EEF1FF 0%, #E8E4FF 100%)",
          border: "1px solid #C5CEFF",
          borderRadius: "24px",
          padding: "32px 24px",
          boxShadow: "0 4px 32px rgba(99,136,255,0.10)",
          marginBottom: "32px",
        }}>

          {/* EP India Logo Row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "28px",
          }}>
            <img
              src="/images/ep_india.png"
              alt="Entrepreneur India"
              style={{ height: "40px", width: "auto", objectFit: "contain" }}
            />
            <div style={{ width: "1px", height: "32px", backgroundColor: "#C5CEFF" }} />
            <div>
              <div style={{
                fontSize: "13px",
                fontWeight: "800",
                color: "#5F47FF",
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

          {/* Award Cards */}
          <div className="award-grid">

            {/* Award 1 */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 16px rgba(99,136,255,0.08)",
              border: "1px solid #EEF1FF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "10px",
            }}>
              <div style={{ fontSize: "40px" }}>🏆</div>
              <div style={{
                fontSize: "14px",
                fontWeight: "800",
                color: "#5F47FF",
                lineHeight: "1.3",
              }}>
                Health &amp; Wellness
              </div>
              <div style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
              }}>
                Startup of the Year
              </div>
              <div style={{
                backgroundColor: "#EEF1FF",
                color: "#5F47FF",
                fontSize: "11px",
                fontWeight: "700",
                padding: "3px 12px",
                borderRadius: "20px",
              }}>
                2026
              </div>
            </div>

            {/* Award 2 */}
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 16px rgba(99,136,255,0.08)",
              border: "1px solid #EEF1FF",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "10px",
            }}>
              <div style={{ fontSize: "40px" }}>🌟</div>
              <div style={{
                fontSize: "14px",
                fontWeight: "800",
                color: "#5F47FF",
                lineHeight: "1.3",
              }}>
                Healthtech Startup
              </div>
              <div style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
              }}>
                of the Year
              </div>
              <div style={{
                backgroundColor: "#EEF1FF",
                color: "#5F47FF",
                fontSize: "11px",
                fontWeight: "700",
                padding: "3px 12px",
                borderRadius: "20px",
              }}>
                2026
              </div>
            </div>

          </div>
        </div>

        {/* Award Photo Section */}
        <div style={{
          borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(99,136,255,0.15)",
          marginBottom: "0",
        }}>

          {/* Photo — no overlay on mobile */}
          <div style={{ position: "relative" }}>
            <img
              src="/images/award_photo.png"
              alt="Cradlewell CEO Lokesh receiving award at Entrepreneur India Startup Awards 2026"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                objectFit: "cover",
              }}
            />

            {/* Overlay — desktop only */}
            <div className="photo-overlay-desktop" style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(to top, rgba(95,71,255,0.92) 0%, rgba(99,136,255,0.4) 55%, transparent 100%)",
              padding: "48px 32px 28px 32px",
            }}>
              <div style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "16px",
              }}>
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
                <div style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "12px",
                  padding: "12px 20px",
                  border: "1px solid rgba(255,255,255,0.25)",
                  textAlign: "center",
                  flexShrink: 0,
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#ffffff" }}>
                    Entrepreneur India
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", marginTop: "3px" }}>
                    Startup Awards 2026
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "3px" }}>
                    Official Tabulators: EY
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Block — mobile only, below photo */}
          <div className="photo-caption-mobile" style={{
            background: "linear-gradient(-45deg, #6388FF 25%, #5F47FF 100%)",
            padding: "20px 24px",
          }}>
            <p style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#ffffff",
              margin: "0 0 6px 0",
              lineHeight: "1.5",
            }}>
              "Proud to bring professional postnatal care to every family in India"
            </p>
            <p style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.75)",
              margin: "0 0 12px 0",
            }}>
              — Lokesh, CEO &amp; Co-Founder, Cradlewell
            </p>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: "8px",
              padding: "8px 14px",
              border: "1px solid rgba(255,255,255,0.25)",
            }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#ffffff" }}>
                Entrepreneur India Startup Awards 2026
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                | Tabulators: EY
              </span>
            </div>
          </div>

        </div>

      </Container>

      <style jsx>{`
        .award-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* Mobile — show caption below photo, hide overlay */
        .photo-overlay-desktop {
          display: none;
        }
        .photo-caption-mobile {
          display: block;
        }

        /* Desktop — show overlay on photo, hide caption below */
        @media (min-width: 768px) {
          .photo-overlay-desktop {
            display: block;
          }
          .photo-caption-mobile {
            display: none;
          }
          .award-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 400px) {
          .award-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
};

export default TrustedByStrip;
