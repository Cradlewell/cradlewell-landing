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
      fillOpacity="0.6"
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
        <stop stopColor="#E7F6FD" />
        <stop offset="1" stopColor="#DBEEF8" />
      </linearGradient>
    </defs>
  </svg>
);

const HeroHeader1 = () => {
  const { openModal } = useModal();

  return (
    <section className="ezy__header1 light dark position-relative overflow-hidden">
      <HeroHeaderShape />

      <Container className="position-relative">
        <Row className="align-items-center">

          <Col lg={6} className="pe-xl-5 text-center text-lg-start">

            {/* Award Badge */}
            <div className="mb-3">
              <span
                style={{
                  backgroundColor: "#FFF8E7",
                  border: "1px solid #F5C518",
                  borderRadius: "20px",
                  padding: "6px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#B8860B",
                  display: "inline-block"
                }}
              >
                🏆 Healthtech Startup of the Year 2026 — Entrepreneur India
              </span>
            </div>

            {/* Headline */}
            <h2 className="ezy__header1-heading mb-3">
              <span className="primary-color">Professional Postnatal</span>
              <br />
              Care, At Your Doorstep
            </h2>

            {/* Subheadline */}
            <p className="ezy__header1-sub-heading mb-4">
              Trained and certified nurses visit your home to support your
              newborn and recovery — so you can focus on bonding,
              not worrying.
            </p>

            {/* CTA Buttons */}
            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">

              <button
                type="button"
                onClick={openModal}
                className="btn btn-primary fs-5"
                style={{ cursor: "pointer" }}
              >
                Book Free Consultation
              </button>

              <a
                href="https://wa.me/919363893639"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-success fs-5"
                role="button"
              >
                💬 Chat on WhatsApp
              </a>

            </div>

            {/* Trust Indicators */}
            <p
              className="mt-3 mb-0"
              style={{
                fontSize: "13px",
                color: "#6c757d"
              }}
            >
              ✅ No hidden charges &nbsp;|&nbsp;
              ✅ Background verified nurses &nbsp;|&nbsp;
              ✅ DPIIT Recognized
            </p>

          </Col>

          <Col lg={6} className="mt-5 mt-lg-0">

            {/* Hero Image */}
            <img
              src="/images/bannerimg.png"
              alt="Trusted Nurse-led Newborn and Postnatal Home Care Support Banner for Mothers and Babies by Cradlewell in Bangalore"
              className="rounded img-fluid mt-3"
            />

            {/* Stats */}
            <div className="d-flex justify-content-center gap-4 mt-4 flex-wrap">

              <div
                className="text-center p-3"
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  minWidth: "100px"
                }}
              >
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "#0d6efd"
                  }}
                >
                  100+
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6c757d"
                  }}
                >
                  Families Served
                </div>
              </div>

              <div
                className="text-center p-3"
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  minWidth: "100px"
                }}
              >
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "#0d6efd"
                  }}
                >
                  40+
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6c757d"
                  }}
                >
                  Years Combined Experience
                </div>
              </div>

              <div
                className="text-center p-3"
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                  minWidth: "100px"
                }}
              >
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "700",
                    color: "#0d6efd"
                  }}
                >
                  4.9 ★
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#6c757d"
                  }}
                >
                  Google Rating
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
