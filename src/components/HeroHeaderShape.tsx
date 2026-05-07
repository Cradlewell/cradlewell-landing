'use client'

import React from "react";
import { Col, Container, Row } from "react-bootstrap";
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
            <div className="d-flex justify-content-center justify-content-lg-start mb-4">
              <div className="hero-trust-bar">
                <span style={{ color: "#F59E0B" }}>★</span>
                <span>4.8 Rated</span>
                <span className="divider" />
                <span>100+ Families</span>
                <span className="divider" />
                <span>ISO Certified</span>
              </div>
            </div>

            <h1 className="ezy__header1-heading mb-4">
              <span className="primary-color">Expert</span>{" "}
              <br />
              Newborn &amp; Mother Care
            </h1>

            <p className="ezy__header1-sub-heading mb-5">
              Certified postpartum nurses visit your home to support mother
              and baby with feeding, sleep, hygiene, and recovery.
            </p>

            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
              <button
                onClick={() => openModal()}
                className="btn btn-primary fs-6 px-4 py-3"
                style={{ borderRadius: 12 }}
              >
                Book Free Consultation
              </button>
              <a
                href="https://wa.me/919363893639"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-secondary fs-6 px-4 py-3"
                style={{
                  borderRadius: 12,
                  borderColor: "rgba(15,23,42,0.18)",
                  color: "#0F172A",
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(8px)",
                  fontFamily: "'Lexend', system-ui, sans-serif",
                  fontWeight: 600,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="#25D366"
                  style={{ marginRight: 7, verticalAlign: "text-top" }}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat on WhatsApp
              </a>
            </div>

            {/* Micro trust line */}
            <p
              className="mt-3"
              style={{
                fontSize: "0.8rem",
                color: "#94A3B8",
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
              }}
            >
              No hidden charges · Background-verified nurses · Same-day availability
            </p>
          </Col>

          {/* Hero image with floating badges */}
          <Col lg={6} className="mt-5 mt-lg-0">
            <div className="hero-image-wrap">
              <img
                src="/images/website_Hero_Image.png"
                alt="Trusted Nurse-led Newborn and Postnatal Home Care Support Banner for Mothers and Babies by Cradlewell in Bangalore"
                className="rounded img-fluid mt-3"
                fetchPriority="high"
                loading="eager"
                width="600"
                height="500"
                style={{ borderRadius: 20, boxShadow: "0 16px 64px rgba(15,23,42,0.14)", width: "100%", display: "block" }}
              />

              {/* Floating badge — top left */}
              <div className="hero-badge hero-badge-tl">
                <span style={{ fontSize: "1rem" }}>🏆</span>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>Award Winning</div>
                  <div style={{ fontSize: "0.64rem", color: "#64748B", fontWeight: 500 }}>Entrepreneur India 2026</div>
                </div>
              </div>

              {/* Floating badge — bottom right */}
              <div className="hero-badge hero-badge-br">
                <span style={{ fontSize: "1rem" }}>✅</span>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>ISO 9001 Certified</div>
                  <div style={{ fontSize: "0.64rem", color: "#64748B", fontWeight: 500 }}>Background-verified nurses</div>
                </div>
              </div>

              {/* Floating badge — right mid */}
              <div className="hero-badge hero-badge-rm">
                <div style={{ display: "flex", gap: 2 }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ color: "#F59E0B", fontSize: "0.7rem" }}>★</span>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>4.8 / 5.0</div>
                  <div style={{ fontSize: "0.64rem", color: "#64748B", fontWeight: 500 }}>Google Reviews</div>
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
