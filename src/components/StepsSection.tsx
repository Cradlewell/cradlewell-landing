'use client';

import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { useModal } from './ModalContext';
import ScrollReveal from './ScrollReveal';

const steps = [
  {
    number: '01',
    icon: '/images/icon1.png',
    title: 'Choose Day or Night Care',
    desc: 'Select daytime or overnight care based on what you and your baby need most.',
  },
  {
    number: '02',
    icon: '/images/icon2.png',
    title: 'Book Your Slot',
    desc: 'Pick your preferred time, share your baby\'s details, and confirm in under 5 minutes.',
  },
  {
    number: '03',
    icon: '/images/icon3.png',
    title: 'Get Professional Care',
    desc: 'A certified nurse arrives at your home, fully prepared and ready to care.',
  },
];

const StepsSection = () => {
  const { openModal } = useModal();

  return (
    <section className="py-5 bg-white" id="howitworks">
      <Container>
        <ScrollReveal direction="none">
          <div className="text-center mb-5">
            <span className="section-eyebrow">How It Works</span>
            <h2 className="fw-bold mt-2">
              Nurse-Led Newborn &amp; Postnatal{' '}
              <span style={{ color: '#5B7CFA' }}>
                <br className="d-none d-md-block" />
                Home Care in Bangalore
              </span>
            </h2>
            <p style={{ color: '#64748B', maxWidth: 480, margin: '10px auto 0', fontSize: '1rem' }}>
              Simple, fast, and designed around your family.
            </p>
          </div>
        </ScrollReveal>

        {/* Steps grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          position: 'relative',
        }}>
          {steps.map((step, i) => (
            <ScrollReveal key={i} direction="up" delay={i * 110}>
              <div style={{
                background: '#F6F7FF',
                borderRadius: 20,
                padding: '36px 28px 32px',
                position: 'relative',
                height: '100%',
                border: '1px solid rgba(95,71,255,0.08)',
                transition: 'box-shadow 220ms ease, transform 220ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 36px rgba(95,71,255,0.13)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
              >
                {/* Step number — top right */}
                <div style={{
                  position: 'absolute',
                  top: 20,
                  right: 24,
                  fontSize: '2.4rem',
                  fontFamily: "'Lexend', system-ui, sans-serif",
                  fontWeight: 800,
                  color: 'rgba(95,71,255,0.10)',
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                }}>
                  {step.number}
                </div>

                {/* Icon */}
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'rgba(95,71,255,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <img src={step.icon} alt={step.title} width="26" height="26" />
                </div>

                <h3 style={{
                  fontFamily: "'Lexend', system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  color: '#0F172A',
                  marginBottom: 10,
                  letterSpacing: '-0.01em',
                }}>
                  {step.title}
                </h3>
                <p style={{
                  color: '#64748B',
                  fontSize: '0.94rem',
                  lineHeight: 1.65,
                  margin: 0,
                  fontFamily: "'Source Sans 3', system-ui, sans-serif",
                }}>
                  {step.desc}
                </p>

                {/* Bottom accent line */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: 'linear-gradient(90deg, #5F47FF, #6388FF)',
                  borderRadius: '0 0 20px 20px',
                  opacity: 0.5,
                }} />
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* CTA */}
        <ScrollReveal direction="none" delay={200}>
          <div className="text-center mt-5">
            <Button
              onClick={() => openModal()}
              variant="primary"
              style={{ padding: '13px 32px', fontSize: '1rem' }}
            >
              Book Your First Slot
            </Button>
            <p className="mt-2 text-muted" style={{ fontSize: '0.82rem' }}>
              Free consultation · No commitment needed
            </p>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
};

export default StepsSection;
