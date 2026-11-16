'use client';
import React from 'react';
import { Accordion, Container } from 'react-bootstrap';
import { FAQS } from '@/content/faqs';

const FaqSection = () => {
  return (
    <section className="py-5" id='faq' style={{ backgroundColor: '#F9F8F6' }}>
      <Container>

        {/* Section Title */}
        <div className="text-center mb-5">
          <h2 className="fw-bold">
            Frequently Asked Questions
          </h2>
          <p className="text-muted mt-2" style={{ fontSize: "16px" }}>
            Everything new parents in Bangalore want to know about postnatal home care
          </p>
        </div>

        <Accordion defaultActiveKey="0" className="custom-accordion">
          {FAQS.map((f, i) => (
            <Accordion.Item eventKey={String(i)} key={f.q}>
              <Accordion.Header>{f.q}</Accordion.Header>
              <Accordion.Body>{f.a}</Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>

      </Container>
    </section>
  );
};

export default FaqSection;
