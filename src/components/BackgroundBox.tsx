"use client";
import React from "react";
import { Button, Container } from "react-bootstrap";
import { useModal } from './ModalContext';

const BackgroundBox = () => {
  const { openModal } = useModal();

  return (
    <div className="container background-box text-white d-flex align-items-end mb-5">
      <Container className="p-4">
        <div className="content">

          {/* Main CTA Text */}
          <p style={{
            fontSize: "20px",
            fontWeight: "500",
            lineHeight: "1.6",
            marginBottom: "16px"
          }}>
            Book professional postnatal care from certified nurses —{" "}
            <br />
            when you need it, where you need it.
          </p>

          {/* CTA Button */}
          <div className="mb-4">
            <Button
              onClick={openModal}
              className="btn btn-primary fs-5"
            >
              Book Free Consultation
            </Button>
          </div>

          {/* Trust Badges Row */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.2)",
            paddingTop: "16px",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center"
          }}>
            <span style={{
              fontSize: "11px",
              fontWeight: "600",
              letterSpacing: "1px",
              textTransform: "uppercase",
              opacity: "0.7",
              marginRight: "4px"
            }}>
              Recognized By:
            </span>

            {/* DPIIT Badge */}
            <span style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: "600",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px"
            }}>
              🏛️ DPIIT Recognized
            </span>

            {/* MCA Badge */}
            <span style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: "600",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px"
            }}>
              🏢 MCA Registered
            </span>

            {/* ISO Badge */}
            <span style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: "600",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px"
            }}>
              📋 ISO Certified
            </span>

            {/* Entrepreneur India Badge */}
            <span style={{
              backgroundColor: "rgba(255,215,0,0.2)",
              border: "1px solid rgba(255,215,0,0.5)",
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: "600",
              color: "#FFD700",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px"
            }}>
              🏆 Entrepreneur India 2026
            </span>

          </div>
        </div>
      </Container>
    </div>
  );
};

export default BackgroundBox;
