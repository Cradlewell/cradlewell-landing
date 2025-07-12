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
            <Accordion.Header>What kind of services does Cradlewell provide?</Accordion.Header>
            <Accordion.Body>
             We offer certified nursing care at home for newborns and postnatal mothers. Our services include baby bathing, feeding support, sleep training, postpartum recovery, lactation guidance, night care, and hygiene management delivered by trained professionals.           
             </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="1">
            <Accordion.Header>Are your nurses trained and background-verified?</Accordion.Header>
            <Accordion.Body>
              Yes. Every Cradlewell nurse is a certified caregiver with experience in postnatal and newborn care. We conduct thorough background checks, skill assessments, and in-person training before assigning them to any home.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="2">
            <Accordion.Header>How are Cradlewell nurses different from nannies or japa maids?</Accordion.Header>
            <Accordion.Body>
              Cradlewell provides professional nursing care, not babysitting. Our nurses are medically trained to support recovery, hygiene, feeding, and sleep for both mother and baby. They follow protocols and report health updates daily unlike untrained helpers.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="3">
            <Accordion.Header>What areas do you currently serve?</Accordion.Header>
            <Accordion.Body>
              We are currently operational in Bangalore. If you’re located outside this area, you can contact us we’ll inform you as soon as we expand to your location.
            </Accordion.Body>
          </Accordion.Item>

          <Accordion.Item eventKey="4">
            <Accordion.Header>Is there a minimum duration to book a nurse?</Accordion.Header>
            <Accordion.Body>
              Yes. Our minimum care package starts from 7 days, designed to build trust and ensure continuity in care. Longer-term packages (60 or 90 days) are also available and often more cost-effective.
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Container>
    </section>
  );
};

export default FaqSection;
