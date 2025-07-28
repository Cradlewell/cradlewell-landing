'use client';

import React from 'react';
import { Accordion, Container } from 'react-bootstrap';

const NurseFaq = () => {
  return (
    <section className="py-5" id='faq' style={{ backgroundColor: '#F8FAFC' }}>
      <Container>
        {/* Section Title */}
        <div className="text-center mb-5">
          <h1 className="fw-bold">
            Frequently Asked Questions (FAQ)
          </h1>
        </div>

        <Accordion defaultActiveKey="0" className="custom-accordion">
          <Accordion.Item eventKey="0">
            <Accordion.Header>Q. What kind of families will I be assigned to?</Accordion.Header>
            <Accordion.Body>
             We assign nurses only to pre-verified, safe, and respectful families. A Cradlewell security person visits every home before your assignment begins.          
             </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1">
            <Accordion.Header>Q. Is this a full-time or part-time role?</Accordion.Header>
            <Accordion.Body>
              Most nurses are assigned to one family full-time for 30–90 days. We offer both day shifts and night shifts, based on your availability.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="2">
            <Accordion.Header>Q. Do I get support if there's a problem at work?</Accordion.Header>
            <Accordion.Body>
              Yes. Cradlewell provides 24x7 team support—you can contact our doctors, care coordinators, or emergency line anytime. You're never alone on the job.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>Q. Will I receive training before starting?</Accordion.Header>
            <Accordion.Body>
              Absolutely. All selected nurses go through a short onboarding session where we cover care protocols, safety standards, and soft skills needed for postnatal care.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="4">
            <Accordion.Header>Q. What are the benefits and salary?</Accordion.Header>
            <Accordion.Body>
              We offer a fixed monthly salary, travel allowance, and optional accommodation. You'll also get certificates, bonuses, and access to our growing nurse community.
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Container>
    </section>
  );
};

export default NurseFaq;
