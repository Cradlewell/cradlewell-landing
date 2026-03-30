'use client';
import { useEffect, useState } from 'react';
import { useModal } from './ModalContext';

export default function StickyMobileCTA() {
  const { openModal } = useModal();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="d-flex d-lg-none align-items-center gap-3"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 998,
        padding: '12px 16px 16px',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '0 -6px 28px rgba(15,23,42,0.12)',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Nurse icon + text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.72rem',
          color: '#94A3B8',
          fontFamily: "'Lexend', system-ui, sans-serif",
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 2,
        }}>
          Certified Nurses · Bangalore
        </div>
        <div style={{
          fontSize: '0.92rem',
          color: '#0F172A',
          fontFamily: "'Lexend', system-ui, sans-serif",
          fontWeight: 700,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          Book a Free Consultation
        </div>
      </div>

      {/* CTA button */}
      <button
        onClick={openModal}
        style={{
          background: 'linear-gradient(135deg, #5F47FF 0%, #6388FF 100%)',
          border: 'none',
          color: '#fff',
          fontFamily: "'Lexend', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: '0.9rem',
          padding: '12px 22px',
          borderRadius: 12,
          boxShadow: '0 4px 18px rgba(95,71,255,0.38)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          cursor: 'pointer',
          letterSpacing: '0.01em',
        }}
      >
        Book Now →
      </button>
    </div>
  );
}
