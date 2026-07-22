'use client';

import React from 'react';
import { Container } from 'react-bootstrap';
import ScrollReveal from './ScrollReveal';
import TestimonialsCoverflow from './TestimonialsCoverflow';

const testimonials = [
  {
    name: 'Santosh Malpatra',
    text: 'Very professional and excellent home nursing service. Nurses are well-trained and knowledgeable. Excellent quality of medical and personal care for our baby. Proper hygiene was maintained throughout.',
    image: '/images/testimonial2.png',
    location: 'Bangalore',
  },
  {
    name: 'Yashul Srivastava',
    text: 'They provided a genuine and well-trained caregiver for our baby. We opted for a care package and were very satisfied with the service. Would definitely consider them again if needed.',
    image: '/images/testimonial1.png',
    location: 'Bangalore',
  },
  {
    name: 'Snehashis & Anita',
    text: `We chose Cradlewell after our baby girl's birth, and as first-time parents, we were initially unsure. The caregivers were supportive and knowledgeable, guiding us through feeding and early baby care with patience.`,
    image: '/images/testimonial3.png',
    location: 'Bangalore',
  },
];

const TestimonialsSection = () => (
  <section className="py-5" id="testimonials" style={{ backgroundColor: '#F9F8F6' }}>
    <Container>
      <ScrollReveal direction="none">
        <div className="text-center mb-5">
          <span style={{
            display: 'inline-block',
            background: 'rgba(95,71,255,0.08)',
            border: '1px solid rgba(95,71,255,0.18)',
            borderRadius: 6,
            padding: '5px 18px',
            fontSize: '0.72rem',
            fontFamily: "'Lexend', system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: '#5F47FF',
            marginBottom: 14,
          }}>
            What Parents Say
          </span>
          <h2 className="fw-bold mt-2">
            <span style={{ color: '#5F47FF' }}>Real words</span> from real parents
          </h2>
          <p style={{ color: '#64748B', maxWidth: 460, margin: '8px auto 0', fontSize: '1rem' }}>
            Families across Bangalore trust Cradlewell for their most precious moments.
          </p>
        </div>
      </ScrollReveal>

      {/* 3D coverflow gallery */}
      <TestimonialsCoverflow items={testimonials} />
    </Container>
  </section>
);

export default TestimonialsSection;
