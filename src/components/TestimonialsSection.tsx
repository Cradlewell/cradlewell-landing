'use client';

import React from 'react';
import { Container } from 'react-bootstrap';
import ScrollReveal from './ScrollReveal';
import TestimonialsCoverflow from './TestimonialsCoverflow';

const testimonials = [
  { image: { src: '/images/test1.png', alt: 'Testimonial letter from Sachin Sahu, a Cradlewell parent in Bangalore' } },
  { image: { src: '/images/test2.png', alt: 'Testimonial letter from a Cradlewell parent in Bangalore' } },
  { image: { src: '/images/test3.png', alt: 'Testimonial letter from a Cradlewell parent in Bangalore' } },
  { image: { src: '/images/test4.png', alt: 'Testimonial letter from a Cradlewell parent in Bangalore' } },
  { image: { src: '/images/test5.png', alt: 'Testimonial letter from a Cradlewell parent in Bangalore' } },
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

      {/* 3D coverflow — autoplays until the visitor clicks a card */}
      <TestimonialsCoverflow slides={testimonials} showTitle={false} autoplay />

      <p style={{
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: '0.85rem',
        fontFamily: "'Lexend', system-ui, sans-serif",
        marginTop: 8,
      }}>
        Click a card to read it in full
      </p>
    </Container>
  </section>
);

export default TestimonialsSection;
