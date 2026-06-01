'use client'

import React from "react";
import { Col, Container, Row } from "react-bootstrap";
import { Star, ArrowRight, MessageCircle } from "lucide-react";
import { useModal } from './ModalContext';

const HeroHeaderShape = () => (
  <svg
    className="position-absolute start-0 top-0 bottom-0"
    width="602"
    height="742"
    viewBox="0 0 602 742"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M529.67 368.784C488.233 175.629 530.084 75.9263 602 0H0V742C7.22773 740.175 75.4574 695.495 242.852 656.948C584.139 584.605 555.256 488.05 529.67 368.784Z"
      fill="url(#paint0_linear_4_4301)"
      fillOpacity="0.55"
    />
    <defs>
      <linearGradient
        id="paint0_linear_4_4301"
        x1="310.118"
        y1="576.967"
        x2="770.228"
        y2="95.337"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#C7DEFF" />
        <stop offset="1" stopColor="#D8EBFF" />
      </linearGradient>
    </defs>
  </svg>
);

const HeroHeader1 = () => {
  const { openModal } = useModal();

  return (
    <section className="ezy__header1 light dark">
      <HeroHeaderShape />
      <Container className="position-relative">
        <Row className="align-items-center">
          <Col lg={6} className="pe-xl-5 text-center text-lg-start">

            {/* Trust bar — above-fold social proof */}
            <div className="d-flex justify-content-center justify-content-lg-start mb-4 hero-enter hero-enter-d1">
              <div className="hero-trust-bar">
                <Star size={13} strokeWidth={0} fill="#F59E0B" style={{ flexShrink: 0 }} />
                <span>4.8 Rated</span>
                <span className="divider" />
                <span>100+ Families</span>
                <span className="divider" />
                <span>ISO Certified</span>
              </div>
            </div>

            <h1 className="ezy__header1-heading mb-4 hero-enter hero-enter-d2">
              <span className="primary-color">Expert</span>{" "}
              <br />
              Newborn &amp; Mother Care
            </h1>

            <p className="ezy__header1-sub-heading mb-5 hero-enter hero-enter-d3">
              Certified postpartum nurses visit your home to support mother
              and baby with feeding, sleep, hygiene, and recovery.
            </p>

            <div className="d-flex flex-column align-items-center align-items-lg-start hero-enter hero-enter-d4">
              <button
                onClick={() => openModal()}
                className="cw-hero-cta"
              >
                <span>Book Free Consultation</span>
                <span className="cw-hero-cta-arrow"><ArrowRight size={18} strokeWidth={2.25} /></span>
              </button>

              <a
                href="https://wa.me/919363893639"
                target="_blank"
                rel="noopener noreferrer"
                className="cw-hero-secondary"
              >
                <MessageCircle size={15} strokeWidth={2} />
                or chat on WhatsApp
              </a>
            </div>

            {/* Micro trust line */}
            <p
              className="mt-3 hero-enter hero-enter-d5"
              style={{
                fontSize: "0.8rem",
                color: "var(--cw-text-muted)",
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
              }}
            >
              No hidden charges · Background-verified nurses · Same-day availability
            </p>
          </Col>

          {/* Hero image with floating badges */}
          <Col lg={6} className="mt-5 mt-lg-0 hero-enter-img">
            <div className="hero-image-wrap">
              <img
                src="/images/website_Hero_Image.png"
                alt="Trusted Nurse-led Newborn and Postnatal Home Care Support Banner for Mothers and Babies by Cradlewell in Bangalore"
                className="rounded img-fluid mt-3"
                fetchPriority="high"
                loading="eager"
                width="600"
                height="500"
                style={{ borderRadius: 20, boxShadow: "var(--cw-shadow-lg)", width: "100%", display: "block" }}
              />

              {/* Floating badge — Google rating (single anchor) */}
              <div className="hero-badge hero-badge-br">
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={11} strokeWidth={0} fill="#F59E0B" />
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0F172A", lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>4.8 / 5.0</div>
                  <div style={{ fontSize: "0.64rem", color: "#64748B", fontWeight: 500 }}>Google Reviews · 28+</div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export { HeroHeaderShape };
export default HeroHeader1;
