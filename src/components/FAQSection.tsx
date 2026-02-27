'use client';
import React from 'react';
import { Accordion, Container } from 'react-bootstrap';

const FaqSection = () => {
  return (
    <section className="py-5" id='faq' style={{ backgroundColor: '#F8FAFC' }}>
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

          {/* FAQ 1 — High search volume */}
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              What is postnatal home care and what does Cradlewell provide?
            </Accordion.Header>
            <Accordion.Body>
              Postnatal home care is professional nursing support provided at your home after childbirth. 
              Cradlewell sends certified, background-verified nurses directly to your home in Bangalore to 
              support both mother and newborn. Our services include newborn bathing, breastfeeding guidance, 
              sleep training, postpartum recovery support, lactation consultation, vital signs monitoring, 
              and daily health updates — all delivered by trained nursing professionals following 
              ISO-certified care protocols.
            </Accordion.Body>
          </Accordion.Item>

          {/* FAQ 2 — Safety concern — top search */}
          <Accordion.Item eventKey="1">
            <Accordion.Header>
              Is it safe to have a nurse at home for my newborn in Bangalore?
            </Accordion.Header>
            <Accordion.Body>
              Yes. Safety is our highest priority at Cradlewell. Every nurse undergoes thorough background 
              verification, skill assessments, and in-person clinical training before being assigned to any 
              home. We are ISO 9001 and ISO 27001 certified, DPIIT recognized under Startup India, and 
              registered with MCA — ensuring international quality and safety standards in every home visit. 
              Our nurses follow strict hygiene protocols, wear professional uniforms, and provide daily 
              health reports so you always know your baby is in safe hands.
            </Accordion.Body>
          </Accordion.Item>

          {/* FAQ 3 — Cost concern — very high search */}
          <Accordion.Item eventKey="2">
            <Accordion.Header>
              How much does postnatal home nursing care cost in Bangalore?
            </Accordion.Header>
            <Accordion.Body>
              Cradlewell offers both Day Care (8 hours) and Night Care (9 hours) packages starting 
              from 7 days minimum. Our pricing is transparent with no hidden charges. The cost varies 
              based on duration and care type — longer packages of 30, 60, or 90 days are more 
              cost-effective. We also offer a completely free first day of care so you can experience 
              our service quality before committing. Contact us via WhatsApp or book a free consultation 
              call to get an exact quote based on your specific needs.
            </Accordion.Body>
          </Accordion.Item>

          {/* FAQ 4 — Nurse vs japa maid — very high search in India */}
          <Accordion.Item eventKey="3">
            <Accordion.Header>
              What is the difference between a Cradlewell nurse and a japa maid or nanny?
            </Accordion.Header>
            <Accordion.Body>
              This is one of the most important distinctions for new parents. A japa maid or nanny 
              provides household help and basic baby care but has no medical training. A Cradlewell 
              nurse is a certified healthcare professional trained in postnatal and neonatal care. 
              Our nurses can monitor vital signs, identify early warning signs in both mother and baby, 
              provide clinical breastfeeding support, manage umbilical cord care, and follow medically 
              approved protocols. They report daily health updates and escalate concerns immediately — 
              something an untrained helper cannot do.
            </Accordion.Body>
          </Accordion.Item>

          {/* FAQ 5 — C-section specific — high search */}
          <Accordion.Item eventKey="4">
            <Accordion.Header>
              Can Cradlewell nurses help with C-section recovery at home?
            </Accordion.Header>
            <Accordion.Body>
              Absolutely. C-section recovery requires extra care and attention during the first 4-6 weeks. 
              Our nurses are trained to assist with C-section wound monitoring, postpartum hygiene, 
              safe movement guidance, pain management support, and breastfeeding positions that avoid 
              pressure on the incision area. We also help new mothers track recovery milestones and 
              alert you if any signs of infection or complications appear — ensuring you recover safely 
              and confidently at home.
            </Accordion.Body>
          </Accordion.Item>

          {/* FAQ 6 — Breastfeeding — very high search */}
          <Accordion.Item eventKey="5">
            <Accordion.Header>
              Can your nurses help with breastfeeding problems and lactation support?
            </Accordion.Header>
            <Accordion.Body>
              Yes. Breastfeeding challenges are one of the most common concerns for new mothers. 
              Our nurses provide hands-on lactation guidance including correct latching techniques, 
              feeding schedules, managing low milk supply, relieving engorgement, and identifying 
              signs of mastitis early. We work closely with lactation consultants in our network 
              to ensure every mother gets the feeding support she needs — whether breastfeeding 
              or formula feeding.
            </Accordion.Body>
          </Accordion.Item>

          {/* FAQ 7 — Newborn jaundice — high search in India */}
          <Accordion.Item eventKey="6">
            <Accordion.Header>
              Can Cradlewell nurses monitor newborn jaundice at home?
            </Accordion.Header>
            <Accordion.Body>
              Yes. Newborn jaundice is very common in the first 2 weeks after birth. Our nurses are 
              trained to monitor jaundice levels through daily visual assessments, track feeding 
              patterns and output, and identify when levels may require medical attention. We maintain 
              close coordination with your pediatrician and escalate immediately if we observe any 
              concerning signs — giving you peace of mind during those critical early days.
            </Accordion.Body>
          </Accordion.Item>

          {/* FAQ 8 — Night care — high search */}
          <Accordion.Item eventKey="7">
            <Accordion.Header>
              What does night care include and how does it help new parents sleep?
            </Accordion.Header>
            <Accordion.Body>
              Our Night Care package covers 10 hours of overnight nursing support. The nurse handles 
              all nighttime baby needs including feeding, burping, diaper changes, soothing, and sleep 
              monitoring — so parents can rest and recover. In the morning, you receive a full handover 
              report covering the baby's night observations, feeding times, and any concerns. This is 
              especially beneficial in the first 4-6 weeks when sleep deprivation is at its highest 
              and both mother and baby are adjusting to new routines.
            </Accordion.Body>
          </Accordion.Item>

          {/* FAQ 9 — Areas served — local SEO */}
          <Accordion.Item eventKey="8">
            <Accordion.Header>
              Which areas in Bangalore does Cradlewell currently serve?
            </Accordion.Header>
            <Accordion.Body>
              Cradlewell currently serves families across Bangalore including Koramangala, HSR Layout, 
              Indiranagar, Whitefield, Bannerghatta Road, JP Nagar, Jayanagar, Electronic City, 
              Marathahalli, and surrounding areas. If you are outside our current coverage zone, 
              please contact us — we are expanding rapidly and may be able to accommodate your 
              location. We also encourage you to join our waitlist if we are not yet in your area.
            </Accordion.Body>
          </Accordion.Item>

          {/* FAQ 10 — Booking process */}
          <Accordion.Item eventKey="9">
            <Accordion.Header>
              How do I book a Cradlewell nurse and how quickly can care begin?
            </Accordion.Header>
            <Accordion.Body>
              Booking is simple and takes less than 5 minutes. You can book a free consultation call 
              directly from our website, or chat with us on WhatsApp at +91 9363893639. During the 
              consultation we understand your specific needs, recommend the right care plan, and 
              confirm nurse availability. Care can typically begin within 24-48 hours of booking 
              confirmation. We recommend booking at least 1-2 weeks before your expected delivery 
              date to secure your preferred time slot as nurse availability is limited.
            </Accordion.Body>
          </Accordion.Item>

        </Accordion>


      </Container>
    </section>
  );
};

export default FaqSection;
