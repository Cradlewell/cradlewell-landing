"use client";
import { Container } from "react-bootstrap";

const TrustedByStrip = () => {
  return (
    <div className="trusted-wrap" style={{
      backgroundColor: "#ffffff",
    }}>
      <Container>

        {/* Section label */}
        <p style={{
          textAlign: "center",
          fontSize: "10px",
          fontWeight: "700",
          letterSpacing: "3.5px",
          color: "#B8BCC8",
          textTransform: "uppercase",
          margin: "0 0 40px",
        }}>
          Trusted By &amp; Recognized By
        </p>

        {/* Logos Row */}
        <div className="logos-row" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          <img src="/images/DPIIT_logo.png" alt="DPIIT Startup India"
            style={{ height: "46px", width: "auto", objectFit: "contain", maxWidth: "130px" }} />
          <div className="logo-divider" />
          <img src="/images/mca.png" alt="MCA Ministry of Corporate Affairs"
            style={{ height: "46px", width: "auto", objectFit: "contain", maxWidth: "130px" }} />
          <div className="logo-divider" />
          <img src="/images/iso_9001.png" alt="ISO 9001 Certified"
            style={{ height: "56px", width: "auto", objectFit: "contain", maxWidth: "100px" }} />
          <div className="logo-divider" />
          <img src="/images/iso_27001.png" alt="ISO 27001 Certified"
            style={{ height: "70px", width: "auto", objectFit: "contain", maxWidth: "100px" }} />
        </div>

        {/* Award Banner */}
        <div className="award-banner" style={{
          background: "linear-gradient(135deg, #4535E0 0%, #5F47FF 45%, #7268FF 100%)",
          borderRadius: "28px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 80px rgba(95,71,255,0.30)",
        }}>
          {/* Soft inner highlight */}
          <div style={{
            position: "absolute",
            top: "-80px", left: "50%",
            transform: "translateX(-50%)",
            width: "500px", height: "300px",
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.10) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* EP India Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "18px",
            marginBottom: "14px",
          }}>
            <div style={{
              backgroundColor: "#ffffff",
              borderRadius: "10px",
              padding: "6px 14px",
              display: "inline-flex",
              alignItems: "center",
            }}>
              <img src="/images/ep_india.png" alt="Entrepreneur India"
                style={{ height: "30px", width: "auto", objectFit: "contain" }} />
            </div>
            <div style={{ width: "1px", height: "36px", backgroundColor: "rgba(255,255,255,0.25)" }} />
            <div>
              <div style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff", letterSpacing: "0.3px" }}>
                Startup Awards 2026
              </div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.55)", marginTop: "3px", letterSpacing: "0.5px" }}>
                Official Tabulators: EY
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: "40px", height: "1px",
            background: "rgba(255,255,255,0.25)",
            margin: "0 auto 36px",
          }} />

          {/* Award Cards */}
          <div className="award-grid">

            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "32px 20px 28px",
              textAlign: "center",
              boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                background: "linear-gradient(90deg, #5F47FF, #6388FF)",
              }} />
              <div style={{ fontSize: "38px", marginBottom: "14px" }}>🏆</div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "#1A1A2E", marginBottom: "5px" }}>
                Health &amp; Wellness
              </div>
              <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "20px" }}>
                Startup of the Year
              </div>
              <div style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #5F47FF, #6388FF)",
                color: "#ffffff",
                fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px",
                padding: "5px 18px", borderRadius: "20px",
              }}>
                2026
              </div>
            </div>

            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "32px 20px 28px",
              textAlign: "center",
              boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                background: "linear-gradient(90deg, #5F47FF, #6388FF)",
              }} />
              <div style={{ fontSize: "34px", marginBottom: "14px", color: "#5F47FF", lineHeight: 1 }}>✦</div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "#1A1A2E", marginBottom: "5px" }}>
                Healthtech Startup
              </div>
              <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "20px" }}>
                of the Year
              </div>
              <div style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #5F47FF, #6388FF)",
                color: "#ffffff",
                fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px",
                padding: "5px 18px", borderRadius: "20px",
              }}>
                2026
              </div>
            </div>

          </div>
        </div>

        {/* Award Photo */}
        <div style={{
          borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 12px 56px rgba(95,71,255,0.18)",
        }}>
          <div style={{ position: "relative" }}>
            <img
              src="/images/award_photo.png"
              alt="Cradlewell CEO Lokesh receiving award at Entrepreneur India Startup Awards 2026"
              style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
            />

            {/* Overlay — desktop only */}
            <div className="photo-overlay-desktop" style={{
              position: "absolute",
              bottom: 0, left: 0, right: 0,
              background: "linear-gradient(to top, rgba(69,53,224,0.96) 0%, rgba(95,71,255,0.55) 50%, transparent 100%)",
              padding: "56px 40px 36px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px" }}>
                <div>
                  <div style={{ width: "32px", height: "2px", background: "rgba(255,255,255,0.5)", marginBottom: "16px", borderRadius: "2px" }} />
                  <p style={{ fontSize: "18px", fontWeight: "600", color: "#ffffff", margin: "0 0 10px 0", lineHeight: "1.55", maxWidth: "480px" }}>
                    "Proud to bring professional postnatal care to every family in India"
                  </p>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: 0, letterSpacing: "0.4px" }}>
                    — Lokesh, CEO &amp; Co-Founder, Cradlewell
                  </p>
                </div>
                <div style={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(16px)",
                  borderRadius: "16px",
                  padding: "16px 22px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  textAlign: "center",
                  flexShrink: 0,
                }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#ffffff" }}>Entrepreneur India</div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>Startup Awards 2026</div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", marginTop: "3px" }}>Official Tabulators: EY</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote — mobile only */}
          <div className="photo-caption-mobile" style={{
            background: "linear-gradient(135deg, #4535E0 0%, #5F47FF 100%)",
            padding: "28px 24px",
          }}>
            <div style={{ width: "24px", height: "2px", background: "rgba(255,255,255,0.45)", borderRadius: "2px", marginBottom: "14px" }} />
            <p style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff", margin: "0 0 8px 0", lineHeight: "1.55" }}>
              "Proud to bring professional postnatal care to every family in India"
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)", margin: "0 0 18px 0" }}>
              — Lokesh, CEO &amp; Co-Founder, Cradlewell
            </p>
            <div className="caption-badge" style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: "8px", padding: "8px 14px",
              border: "1px solid rgba(255,255,255,0.2)",
              width: "fit-content",
            }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#ffffff" }}>
                Entrepreneur India Startup Awards 2026
              </span>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)" }}>· Tabulators: EY</span>
            </div>
          </div>
        </div>

      </Container>

      <style jsx>{`
        .trusted-wrap {
          padding: 40px 0 48px;
        }
        .logos-row {
          gap: 20px;
          margin-bottom: 40px;
        }
        .award-banner {
          padding: 36px 20px 32px;
          margin-bottom: 16px;
        }
        .award-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .logo-divider {
          display: none;
          width: 1px;
          height: 40px;
          background-color: #E5E7EB;
        }
        .photo-overlay-desktop { display: none; }
        .photo-caption-mobile { display: block; }
        .caption-badge {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }

        @media (min-width: 576px) {
          .award-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 768px) {
          .trusted-wrap { padding: 64px 0 72px; }
          .logos-row { gap: 32px; margin-bottom: 56px; }
          .award-banner { padding: 48px 28px 40px; margin-bottom: 24px; }
          .logo-divider { display: block; }
          .photo-overlay-desktop { display: block; }
          .photo-caption-mobile { display: none; }
        }
      `}</style>
    </div>
  );
};

export default TrustedByStrip;
