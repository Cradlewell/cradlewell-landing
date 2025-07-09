'use client';

import React from 'react';
import { Accordion, Container } from 'react-bootstrap';

const FaqSection = () => {
  return (
    <section className="py-5" style={{ backgroundColor: '#F8FAFC' }}>
      <Container>
        {/* Section Title */}
        <div className="text-center mb-5">
          <h1 className="fw-bold">
            Frequently Asked Questions (FAQ)
          </h1>
        </div>

        <Accordion defaultActiveKey="0" className="custom-accordion">
          <Accordion.Item eventKey="0">
            <Accordion.Header>What is this platform about?</Accordion.Header>
            <Accordion.Body>
             Absolutely. Beautiful Homes Service offers personalised solutions for your interior design needs. Our designers talk to you in detail to understand your vision and help you design a space that is in sync.            
             </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1">
            <Accordion.Header>How can I find a caregiver?</Accordion.Header>
            <Accordion.Body>
              You can browse available caregivers in your area, read reviews, and contact them directly through the platform.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="2">
            <Accordion.Header>Is my data secure?</Accordion.Header>
            <Accordion.Body>
              Absolutely. We prioritize privacy and implement strong security measures to keep your data protected.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>Can I cancel my subscription?</Accordion.Header>
            <Accordion.Body>
              Yes, you can cancel anytime from your account settings. There are no cancellation fees.
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Container>
    </section>
  );
};

export default FaqSection;
