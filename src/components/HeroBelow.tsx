"use client";
import React from "react";
import { Container, Row, Col } from "react-bootstrap";

const HeroBelow = () => {
  return (
    <div className="py-5" id="whychoose">
      <Container>
        <Row className="align-items-center">

          {/* Text Section */}
          <Col lg={6} className="mb-4 mt-2 mb-lg-0">
            <h2 className="fw-bold display-6 px-3">
              Designed for New <span className="text-primary">Moms</span><br />
              <span className="text-primary">Who Deserve</span> to Breathe
            </h2>
            <p className="text-muted mt-3 px-3" style={{ fontSize: "17px", lineHeight: "1.7" }}>
              Professional postnatal and newborn care, delivered to your door.
              Our certified nurses provide hospital-grade support right at home —
              so you can focus on bonding with your baby, not worrying about recovery.
            </p>

            {/* Trust Badges */}
            <div className="px-3 mt-4 d-flex flex-wrap gap-2">
              <span style={{
                backgroundColor: "#E8F5E9",
                border: "1px solid #A5D6A7",
                borderRadius: "20px",
                padding: "5px 14px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#2E7D32"
              }}>
                ✅ DPIIT Recognized
              </span>
              <span style={{
                backgroundColor: "#E8F5E9",
                border: "1px solid #A5D6A7",
                borderRadius: "20px",
                padding: "5px 14px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#2E7D32"
              }}>
                ✅ MCA Registered
              </span>
              <span style={{
                backgroundColor: "#E8F5E9",
                border: "1px solid #A5D6A7",
                borderRadius: "20px",
                padding: "5px 14px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#2E7D32"
              }}>
                ✅ ISO Certified
              </span>
              <span style={{
                backgroundColor: "#FFF8E7",
                border: "1px solid #F5C518",
                borderRadius: "20px",
                padding: "5px 14px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#B8860B"
              }}>
                🏆 Entrepreneur India 2026
              </span>
            </div>
          </Col>

          {/* Stats Section */}
          <Col lg={6}>
            <Row className="text-center mt-4">
              <Col xs={4}>
                <div style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  padding: "16px 8px"
                }}>
                  <h2 className="display-5 fw-bold text-primary mb-1">100+</h2>
                  <p className="small text-muted mb-0">Families Served</p>
                </div>
              </Col>
              <Col xs={4}>
                <div style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  padding: "16px 8px"
                }}>
                  <h2 className="display-5 fw-bold text-primary mb-1">40+</h2>
                  <p className="small text-muted mb-0">Years Combined Experience</p>
                </div>
              </Col>
              <Col xs={4}>
                <div style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  padding: "16px 8px"
                }}>
                  <h2 className="display-5 fw-bold text-primary mb-1">
                    4.9 <span style={{ color: "#f1c40f" }}>★</span>
                  </h2>
                  <p className="small text-muted mb-0">Google Rating</p>
                </div>
              </Col>
            </Row>

            {/* Second Stats Row */}
            <Row className="text-center mt-3">
              <Col xs={4}>
                <div style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  padding: "16px 8px"
                }}>
                  <h2 className="display-5 fw-bold text-primary mb-1">25%</h2>
                  <p className="small text-muted mb-0">Reduced Readmissions</p>
                </div>
              </Col>
              <Col xs={4}>
                <div style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  padding: "16px 8px"
                }}>
                  <h2 className="display-5 fw-bold text-primary mb-1">40%</h2>
                  <p className="small text-muted mb-0">Higher Engagement</p>
                </div>
              </Col>
              <Col xs={4}>
                <div style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  padding: "16px 8px"
                }}>
                  <h2 className="display-5 fw-bold text-primary mb-1">9+</h2>
                  <p className="small text-muted mb-0">Months of Impact</p>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Bottom Image */}
        <div className="mt-5">
          <img
            className="img-fluid rounded"
            src="/images/img1.png"
            alt="Professional Nurse Providing Newborn and Postnatal Home Care Services to Mother and Baby in Bangalore"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
          />
        </div>

      </Container>
    </div>
  );
};

export default HeroBelow;
