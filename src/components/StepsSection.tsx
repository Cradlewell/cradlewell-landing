'use client';

import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { useModal } from './ModalContext'; // adjust path if needed


const StepsSection = () => {
      const { openModal } = useModal();
  return (
    <section className="py-5 bg-white" id='howitworks'>
      <Container>
        {/* Heading */}
        <div className="text-center mb-5">
          <h1 className="fw-bold">
            From Booked to Cared For—In <span style={{ color: '#5B7CFA' }}> <br /> 3 Easy Steps</span>
          </h1>
        </div>

        {/* Steps */}
        <Row className="g-4 justify-content-center">
          {/* Step 1 */}
          <Col xs={12} md={6} lg={4}>
            <div className="p-4 rounded-4 text-center pb-5" style={{ backgroundColor: '#F6F7FF' }}>
              <div
                className="mb-3 mx-auto d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: '60x',
                  height: '60px',
                }}
              >
                <img src="/images/icon1.png" alt="Choose a Care Plan" width="24" height="24" />
              </div>
              <h6 className="fw-bold mb-2">Choose a Care Plan</h6>
              <p className="text-muted mb-0 px-5" style={{ fontSize: '0.95rem' }}>
                Pick from Lite, Plus, or Care 360—no contracts.
              </p>
            </div>
          </Col>

          {/* Step 2 */}
          <Col xs={12} md={6} lg={4}>
            <div className="p-4 rounded-4 text-center pb-5" style={{ backgroundColor: '#F6F7FF' }}>
              <div
                className="mb-3 mx-auto d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: '60px',
                  height: '60px',
                }}
              >
                <img src="/images/icon2.png" alt="Book Your Slot" width="24" height="24" />
              </div>
              <h6 className="fw-bold mb-2">Book Your Slot</h6>
              <p className="text-muted mb-0 px-5" style={{ fontSize: '0.95rem' }}>
                Pick your time, add your baby’s profile, and relax.
              </p>
            </div>
          </Col>

          {/* Step 3 */}
          <Col xs={12} md={6} lg={4}>
            <div className="p-4 rounded-4 text-center pb-5" style={{ backgroundColor: '#F6F7FF' }}>
              <div
                className="mb-3 mx-auto d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: '60px',
                  height: '60px',
                }}
              >
                <img src="/images/icon3.png" alt="Get Professional Care" width="24" height="24" />
              </div>
              <h6 className="fw-bold mb-2">Get Professional Care</h6>
              <p className="text-muted mb-0 px-5" style={{ fontSize: '0.95rem' }}>
                A certified nurse arrives fully <br /> prepared.
              </p>
            </div>
          </Col>
        </Row>

        {/* CTA Button */}
        <div className="text-center mt-5">
          <Button
          onClick={openModal}
            variant="primary"
            style={{
              backgroundColor: '#5B7CFA',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontWeight: 500,
            }}
          >
            Book Your First Slot
          </Button>
        </div>
      </Container>
    </section>
  );
};

export default StepsSection;
