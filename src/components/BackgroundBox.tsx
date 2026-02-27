"use client";
import React from "react";
import { Container } from "react-bootstrap";
import { useModal } from './ModalContext';

const BackgroundBox = () => {
  const { openModal } = useModal();

  return (
    <>
      <div className="background-box-wrapper">
        <div className="background-box-inner">

          {/* Content */}
          <div className="background-box-content">

            {/* Badge */}
            <div style={{
              display: "inline-block",
              backgroundColor: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "20px",
              padding: "5px 14px",
              fontSize: "12px",
              fontWeight: "600",
              color: "#ffffff",
              marginBottom: "16px",
            }}>
              ✅ Free First Day of Care
            </div>

            {/* Headline */}
            <h2 style={{
              fontSize: "clamp(20px, 4vw, 28px)",
              fontWeight: "700",
              color: "#ffffff",
              lineHeight: "1.4",
              marginBottom: "12px",
            }}>
              Professional Postnatal Care,<br />
              At Your Doorstep
            </h2>

            {/* Subtext */}
            <p style={{
              fontSize: "clamp(13px, 2.5vw, 15px)",
              color: "rgba(255,255,255,0.85)",
              lineHeight: "1.6",
              marginBottom: "24px",
              maxWidth: "480px",
            }}>
              Certified nurses visit your home — when you need it,
              where you need it.
            </p>

            {/* CTA Buttons */}
            <div className="background-box-ctas">
              <button
                onClick={openModal}
                style={{
                  backgroundColor: "#ffffff",
                  color: "#5F47FF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Book Free Consultation
              </button>
              
                href="https://wa.me/919363893639"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: "#25D366",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 24px",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-block",
                  whiteSpace: "nowrap",
                }}
              >
                💬 Chat on WhatsApp
              </a>
            </div>

            {/* Trust Line */}
            <p style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.65)",
              marginTop: "16px",
              marginBottom: 0,
            }}>
              ✅ No hidden charges &nbsp;·&nbsp;
              ✅ Verified nurses &nbsp;·&nbsp;
              ✅ DPIIT Recognized
            </p>

          </div>
        </div>
      </div>

      <style jsx>{`
        .background-box-wrapper {
          margin-bottom: 0;
          padding: 0 16px;
        }

        .background-box-inner {
          background-image: url('/images/img1.png');
          background-size: cover;
          background-position: center top;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          min-height: 280px;
          display: flex;
          align-items: flex-end;
        }

        /* Dark gradient overlay */
        .background-box-inner::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(95,71,255,0.95) 0%,
            rgba(99,136,255,0.7) 50%,
            rgba(0,0,0,0.1) 100%
          );
          border-radius: 20px;
          z-index: 1;
        }

        .background-box-content {
          position: relative;
          z-index: 2;
          padding: 32px 24px;
          width: 100%;
        }

        .background-box-ctas {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .background-box-ctas a,
        .background-box-ctas button {
          width: 100%;
          text-align: center;
        }

        /* Desktop */
        @media (min-width: 768px) {
          .background-box-wrapper {
            padding: 0 24px;
          }

          .background-box-inner {
            min-height: 380px;
            background-position: center center;
          }

          .background-box-content {
            padding: 48px 48px;
            max-width: 600px;
          }

          .background-box-ctas {
            flex-direction: row;
            width: auto;
          }

          .background-box-ctas a,
          .background-box-ctas button {
            width: auto;
          }
        }
      `}</style>
    </>
  );
};

export default BackgroundBox;
