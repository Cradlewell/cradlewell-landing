"use client";
import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { FaCheckCircle, FaTimesCircle, FaStar } from "react-icons/fa";

const othersPoints = [
  "No travel allowance, training, or benefits provided.",
  "Juggling multiple families with unclear shifts schedules.",
  "No on-ground support when problems arise.",
  "Sent to homes without proper background verification.",
];

const cradlewellPoints = [
  "Fixed salary, travel allowance & optional housing.",
  "Complete home and Family verification before assignment.",
  "Round the clock operations with dedicated doctor support.",
  "Dedicated to one family for 30–90 days focused care.",
];

export default function WhyChooseCradlewell() {
  return (
    <section className="py-5 bg-light" id="whychooseus">
      <Container>
        <div className="text-center mb-5">
          <h2 className="fw-bold">
            Why Choose <span className="text-primary">Cradlewell</span>?
          </h2>
          <p className="text-muted">
            The Premium Difference in Nurse Hiring Platforms
          </p>
        </div>

        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <h4 className="fw-bold mb-4 text-center">Others</h4>
            {othersPoints.map((point, index) => (
              <div
                key={index}
                className="d-flex align-items-start gap-3 p-3 mb-3 bg-white rounded shadow-sm border-start border-4 border-primary-subtle"
              >
                <FaTimesCircle className="text-danger fs-4 mt-1" />
                <span className="text-muted">{point}</span>
              </div>
            ))}
          </Col>

          <Col md={6} lg={5}>
            <div className="d-flex align-items-center justify-content-center mb-4">
              <h4 className="fw-bold mb-0 me-2">Cradlewell</h4>
              <FaStar className="text-warning fs-5" />
            </div>
            {cradlewellPoints.map((point, index) => (
              <div
                key={index}
                className="d-flex align-items-start gap-3 p-3 mb-3 bg-white rounded shadow-sm border-start border-4 border-primary"
              >
                <FaCheckCircle className="text-primary fs-4 mt-1" />
                <span>{point}</span>
              </div>
            ))}
          </Col>
        </Row>
      </Container>
    </section>
  );
}
