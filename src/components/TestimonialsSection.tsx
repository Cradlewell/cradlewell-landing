'use client';

import React from 'react';
import { Container } from 'react-bootstrap';
import Image from 'next/image';
import ScrollReveal from './ScrollReveal';

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

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const TestimonialCard = ({ t, delay }: { t: typeof testimonials[0]; delay: number }) => (
  <ScrollReveal direction="up" delay={delay} style={{ height: '100%' }}>
    <div style={{
      background: '#ffffff',
      borderRadius: 20,
      padding: '28px 24px',
      boxShadow: '0 4px 24px rgba(15,23,42,0.07)',
      border: '1px solid rgba(15,23,42,0.06)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 220ms ease, transform 220ms ease',
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(15,23,42,0.12)';
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(15,23,42,0.07)';
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
    }}
    >
      {/* Stars + Google badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ color: '#F59E0B', fontSize: '0.95rem', letterSpacing: 2 }}>★★★★★</div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: '#F8FAFC',
          borderRadius: 8,
          padding: '4px 8px',
        }}>
          <GoogleIcon />
          <span style={{ fontSize: '0.7rem', fontFamily: "'Lexend', system-ui", fontWeight: 600, color: '#64748B' }}>
            Google Review
          </span>
        </div>
      </div>

      {/* Quote */}
      <p style={{
        fontSize: '0.97rem',
        lineHeight: '1.75',
        color: '#1E293B',
        fontFamily: "'Source Sans 3', system-ui, sans-serif",
        fontStyle: 'italic',
        flex: 1,
        marginBottom: 20,
      }}>
        &ldquo;{t.text}&rdquo;
      </p>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 46,
          height: 46,
          borderRadius: 12,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 2px 10px rgba(15,23,42,0.10)',
        }}>
          <Image
            src={t.image}
            alt={t.name}
            width={46}
            height={46}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
          />
        </div>
        <div>
          <div style={{
            fontFamily: "'Lexend', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '0.9rem',
            color: '#0F172A',
          }}>
            {t.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: "'Lexend', system-ui", fontWeight: 500 }}>
            {t.location} · Verified Parent
          </div>
        </div>
      </div>
    </div>
  </ScrollReveal>
);

const TestimonialsSection = () => (
  <section className="py-5" id="testimonials" style={{ backgroundColor: '#EDF3FF' }}>
    <Container>
      <ScrollReveal direction="none">
        <div className="text-center mb-5">
          <span style={{
            display: 'inline-block',
            background: 'rgba(95,71,255,0.08)',
            border: '1px solid rgba(95,71,255,0.18)',
            borderRadius: 100,
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
            <span style={{ color: '#5B7CFA' }}>Real words</span> from real parents
          </h2>
          <p style={{ color: '#64748B', maxWidth: 460, margin: '8px auto 0', fontSize: '1rem' }}>
            Families across Bangalore trust Cradlewell for their most precious moments.
          </p>
        </div>
      </ScrollReveal>

      {/* 3-card grid on desktop, stacked on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        alignItems: 'stretch',
      }}>
        {testimonials.map((t, i) => (
          <TestimonialCard key={i} t={t} delay={i * 100} />
        ))}
      </div>

      {/* Google aggregate rating badge */}
      <ScrollReveal direction="none" delay={300}>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: '#ffffff',
            border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: 100,
            padding: '10px 22px',
            boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
          }}>
            <GoogleIcon />
            <span style={{
              fontSize: '0.85rem',
              fontFamily: "'Lexend', system-ui, sans-serif",
              fontWeight: 700,
              color: '#0F172A',
            }}>
              4.8
            </span>
            <span style={{ color: '#F59E0B', fontSize: '0.85rem', letterSpacing: 1 }}>★★★★★</span>
            <span style={{
              fontSize: '0.8rem',
              color: '#64748B',
              fontFamily: "'Source Sans 3', system-ui",
              fontWeight: 500,
            }}>
              on Google · 28+ reviews
            </span>
          </div>
        </div>
      </ScrollReveal>
    </Container>
  </section>
);

export default TestimonialsSection;
