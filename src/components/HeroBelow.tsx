"use client";

import React from "react";
import { Container, Row, Col } from "react-bootstrap";

const stats = [
  { number: "100+", label: "Families Served" },
  { number: "4.8★", label: "Customer Rating" },
  { number: "40+", label: "Years Experience" },
];

const HeroBelow = () => {
  return (
    <div className="py-5" id="whychoose" style={{ backgroundColor: "#ffffff" }}>
      <Container>
        <Row className="align-items-center">
          {/* Text */}
          <Col lg={6} className="mb-4 mb-lg-0 px-4">
            <span className="section-eyebrow">Why Cradlewell</span>
            <h2 className="fw-bold mb-3">
              Designed for New{" "}
              <span className="primary-color">Moms</span>
              <br />
              <span className="primary-color">Who Deserve</span> to Breathe
            </h2>
            <p style={{ fontSize: "1.08rem", lineHeight: "1.75", maxWidth: 480 }}>
              Certified nurses visit your home so you can rest, recover, and bond
              with your baby — without the overwhelm of doing everything alone.
            </p>
          </Col>

          {/* Stats panel */}
          <Col lg={6} className="px-4">
            <div
              className="d-flex align-items-center justify-content-center"
              style={{
                background: "#F8FAFC",
                borderRadius: 20,
                padding: "32px 16px",
                border: "1px solid rgba(15,23,42,0.07)",
              }}
            >
              {stats.map((s, i) => (
                <React.Fragment key={i}>
                  <div className="text-center flex-fill px-2 px-md-3">
                    <div
                      className="stat-number"
                      style={{
                        fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                        color: i === 1 ? "#F97316" : "#0F172A",
                      }}
                    >
                      {s.number}
                    </div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                  {i < stats.length - 1 && (
                    <div
                      style={{
                        width: 1,
                        height: 52,
                        background: "rgba(15,23,42,0.10)",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </Col>
        </Row>

        {/* Full-width image */}
        <div
          className="mt-5"
          style={{
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 8px 40px rgba(15,23,42,0.09)",
          }}
        >
          <img
            className="img-fluid"
            src="/images/img1.png"
            alt="Professional Nurse Providing Newborn and Postnatal Home Care Services to Mother and Baby in Bangalore"
            style={{ width: "100%", display: "block" }}
          />
        </div>
      </Container>
    </div>
  );
};

export default HeroBelow;
