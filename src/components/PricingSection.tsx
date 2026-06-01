'use client'
import React from "react";
import { Container, Row, Col, Button, Card } from "react-bootstrap";
import { Stethoscope, Heart, CheckCircle2 } from "lucide-react";
import { useModal } from "./ModalContext";

const nurseFeatures = [
  "Clinical newborn care & monitoring",
  "Feeding support (breastfeeding guidance + schedule setup)",
  "Baby bathing, hygiene & sterilization protocols",
  "Burping cycles, colic observation & comfort care",
  "Mother recovery support (postpartum monitoring)",
  "Basic vitals tracking & health observations",
  "Sleep routine structuring for baby",
  "Escalation support if any concern arises",
  "Daily reporting & structured handover",
  "Trained, verified & hospital-experienced nurses",
];

const mobaFeatures = [
  "Baby feeding assistance (as per parent guidance)",
  "Diapering, cleaning & hygiene care",
  "Gentle baby massage & safe bathing support",
  "Burping & soothing the baby",
  "Sleep routine & calming techniques",
  "Baby laundry & organization",
  "Mother comfort support (rest, positioning, hydration reminders)",
  "Emotional reassurance during recovery phase",
  "Age-appropriate baby engagement",
  "Trained, verified & guided caregivers",
];

const PricingSection = () => {
  const { openModal } = useModal();

  return (
    <div className="pricing-section bg-light py-5" id="ourplans">
      <Container className="text-center text-dark">
        <span className="badge rounded-pill bg-light primary-color px-3">Pricing Plan</span>
        <h1 className="fw-bold mt-2 mb-5">
          Choose the <span className="text-primary">Care Plan</span>
        </h1>

        <Row className="g-4 justify-content-center">

          {/* LEFT: Nurse Care — Recommended / Premium */}
          <Col md={6} lg={5}>
            <Card
              className="h-100 text-dark p-4 price-card shadow-sm position-relative"
              style={{ backgroundColor: "#ffffff", border: "1px solid rgba(95,71,255,0.15)", borderTop: "2.5px solid #5F47FF" }}
            >
              {/* Badge */}
              <div className="position-absolute top-0 start-50 translate-middle">
                <span
                  className="badge px-3 py-2"
                  style={{ backgroundColor: "#5F47FF", color: "#fff", fontSize: "0.75rem", borderRadius: 6 }}
                >
                  Most Trusted
                </span>
              </div>

              <div className="d-flex justify-content-center mb-2 mt-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: "50px", height: "50px", background: "var(--cw-brand-light)" }}
                >
                  <Stethoscope size={22} strokeWidth={1.75} color="#5F47FF" />
                </div>
              </div>

              <h3 className="text-dark text-center mb-2 fw-semibold">Nurse Care</h3>
              <div className="text-center mb-3">
                <span style={{
                  display: "inline-block",
                  background: "rgba(95,71,255,0.07)",
                  border: "1px solid rgba(95,71,255,0.18)",
                  borderRadius: 12,
                  padding: "10px 24px",
                }}>
                  <span style={{ fontSize: "0.78rem", color: "#6B6B6A", letterSpacing: "0.05em", display: "block", fontWeight: 600 }}>STARTING FROM</span>
                  <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#5F47FF", lineHeight: 1.2 }}>₹2,000</span>
                  <span style={{ fontSize: "0.78rem", color: "#6B6B6A" }}> / day</span>
                </span>
              </div>

              <ul className="list-unstyled mt-2 text-start mx-auto" style={{ maxWidth: 420 }}>
                {nurseFeatures.map((item, i) => (
                  <li key={i} className="d-flex align-items-start mb-3">
                    <CheckCircle2 size={18} strokeWidth={1.75} color="#5F47FF" style={{ flexShrink: 0, marginTop: 3, marginRight: 10 }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button variant="primary" className="mt-auto w-100" onClick={() => openModal('Nurse Care')}>
                Get Nurse Care
              </Button>
            </Card>
          </Col>

          {/* RIGHT: MOBA Care — Popular / Budget Friendly */}
          <Col md={6} lg={5}>
            <Card
              className="h-100 text-dark p-4 price-card shadow-sm position-relative"
              style={{ backgroundColor: "#ffffff", border: "1px solid rgba(99,136,255,0.15)", borderTop: "2.5px solid #6388FF" }}
            >
              {/* Badge */}
              <div className="position-absolute top-0 start-50 translate-middle">
                <span
                  className="badge px-3 py-2"
                  style={{ backgroundColor: "#6388FF", color: "#fff", fontSize: "0.75rem", borderRadius: 6 }}
                >
                  Most Chosen by Families
                </span>
              </div>

              <div className="d-flex justify-content-center mb-2 mt-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{ width: "50px", height: "50px", background: "rgba(99,136,255,0.12)" }}
                >
                  <Heart size={22} strokeWidth={1.75} color="#6388FF" />
                </div>
              </div>

              <h3 className="text-dark text-center mb-2 fw-semibold">MOBA Care</h3>
              <div className="text-center mb-3">
                <span style={{
                  display: "inline-block",
                  background: "rgba(99,136,255,0.07)",
                  border: "1px solid rgba(99,136,255,0.18)",
                  borderRadius: 12,
                  padding: "10px 24px",
                }}>
                  <span style={{ fontSize: "0.78rem", color: "#6B6B6A", letterSpacing: "0.05em", display: "block", fontWeight: 600 }}>STARTING FROM</span>
                  <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#6388FF", lineHeight: 1.2 }}>₹1,500</span>
                  <span style={{ fontSize: "0.78rem", color: "#6B6B6A" }}> / day</span>
                </span>
              </div>

              <ul className="list-unstyled mt-2 text-start mx-auto" style={{ maxWidth: 420 }}>
                {mobaFeatures.map((item, i) => (
                  <li key={i} className="d-flex align-items-start mb-3">
                    <CheckCircle2 size={18} strokeWidth={1.75} color="#6388FF" style={{ flexShrink: 0, marginTop: 3, marginRight: 10 }} />
                    <span style={{ color: "#6B6B6A" }}>{item}</span>
                  </li>
                ))}
              </ul>

              <Button variant="primary" className="mt-auto w-100" onClick={() => openModal('MOBA Care')}>
                Get MOBA Care
              </Button>
            </Card>
          </Col>
        </Row>

        <Button variant="primary" className="mt-5" onClick={() => openModal()}>
          Book Free Consultation Call
        </Button>
        <p className="mt-2 text-muted fw-bold">Limited availability — book your preferred time slot now.</p>
      </Container>
    </div>
  );
};

export default PricingSection;
