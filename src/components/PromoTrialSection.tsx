'use client';

import React from 'react';
import { Container, Button } from 'react-bootstrap';
import Image from 'next/image';
import { FaWhatsapp } from "react-icons/fa";
import { useModal } from './ModalContext';

const PromoTrialSection = () => {
  const { openModal } = useModal();

  return (
    <section
      className="position-relative py-5 text-center text-white"
      style={{
        background: 'linear-gradient(135deg, #4535E0 0%, #5F47FF 50%, #6388FF 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Decorative orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          left: '-60px',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          right: '-40px',
          width: '220px',
          height: '220px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Left SVG */}
      <div className="position-absolute top-50 start-0 translate-middle-y" style={{ zIndex: 2, opacity: 0.4 }}>
        <Image src="/images/layer.svg" alt="" width={200} height={200} aria-hidden="true" />
      </div>

      {/* Right SVG */}
      <div className="position-absolute top-50 end-0 translate-middle-y mx-3" style={{ zIndex: 2, opacity: 0.4 }}>
        <Image src="/images/layer.svg" alt="" width={200} height={200} aria-hidden="true" />
      </div>

      <Container style={{ position: 'relative', zIndex: 1 }}>
        {/* Eyebrow */}
        <div className="mb-3">
          <span
            style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '100px',
              padding: '5px 16px',
              fontSize: '0.75rem',
              fontFamily: "'Lexend', system-ui, sans-serif",
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            Ready to Get Started?
          </span>
        </div>

        <h2
          style={{
            fontFamily: "'Lexend', system-ui, sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            marginBottom: '12px',
          }}
        >
          Professional care, delivered to your door.
        </h2>
        <p
          style={{
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            color: 'rgba(255,255,255,0.75)',
            fontSize: '1.05rem',
            marginBottom: '36px',
            maxWidth: 480,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.65,
          }}
        >
          Speak with our care team, understand your options, and book a certified
          nurse — all in under 10 minutes. Start with a free consultation.
        </p>

        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center align-items-center">
          <Button
            onClick={openModal}
            style={{
              background: 'linear-gradient(135deg, #F97316 0%, #fb923c 100%)',
              border: 'none',
              color: '#fff',
              fontFamily: "'Lexend', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: '1rem',
              padding: '14px 36px',
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(249,115,22,0.45)',
            }}
          >
            Book Free Consultation
          </Button>

          <Button
            onClick={() => window.open('https://wa.me/919363893639', '_blank')}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.35)',
              color: '#fff',
              fontFamily: "'Lexend', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: '0.95rem',
              padding: '13px 28px',
              borderRadius: 12,
              backdropFilter: 'blur(8px)',
            }}
          >
            <FaWhatsapp style={{ fontSize: '1.1rem', marginRight: 7, verticalAlign: 'text-top', color: '#4ADE80' }} />
            Chat on WhatsApp
          </Button>
        </div>

        {/* Trust micro-copy */}
        <div
          className="d-flex flex-wrap justify-content-center gap-4 mt-4"
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.82rem',
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
          }}
        >
          <span>· No hidden charges</span>
          <span>· Background-verified nurses</span>
          <span>· Data privacy guaranteed</span>
        </div>
      </Container>
    </section>
  );
};

export default PromoTrialSection;
