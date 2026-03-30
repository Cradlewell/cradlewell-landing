'use client';
import { Container } from 'react-bootstrap';
import ScrollReveal from './ScrollReveal';
import { useModal } from './ModalContext';

export default function DarkBreakSection() {
  const { openModal } = useModal();

  const stats = [
    { n: '100+', label: 'Families Trust Us' },
    { n: '4.8★', label: 'Google Rating', orange: true },
    { n: '24hr', label: 'Booking to Care' },
  ];

  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 55%, #0F172A 100%)',
        padding: '88px 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 700,
        height: 500,
        background: 'radial-gradient(ellipse, rgba(95,71,255,0.18) 0%, transparent 68%)',
        pointerEvents: 'none',
      }} />

      {/* Top-left decorative dot grid */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        width: 120,
        height: 120,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
        pointerEvents: 'none',
      }} />

      <Container style={{ position: 'relative', zIndex: 1 }}>
        <ScrollReveal direction="none">
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>

            {/* Eyebrow */}
            <div style={{
              display: 'inline-block',
              background: 'rgba(95,71,255,0.25)',
              border: '1px solid rgba(95,71,255,0.45)',
              borderRadius: 100,
              padding: '5px 18px',
              fontSize: '0.72rem',
              fontFamily: "'Lexend', system-ui, sans-serif",
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
              color: '#A5B4FC',
              marginBottom: 24,
            }}>
              Why the first 40 days matter
            </div>

            {/* Big quote */}
            <p style={{
              fontFamily: "'Lexend', system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(1.35rem, 3.2vw, 2rem)',
              color: '#ffffff',
              lineHeight: 1.45,
              letterSpacing: '-0.025em',
              marginBottom: 16,
            }}>
              The first 40 days after birth are the most critical — for both the mother and the baby.
            </p>

            <p style={{
              color: 'rgba(255,255,255,0.5)',
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              fontSize: '1.05rem',
              marginBottom: 44,
              lineHeight: 1.7,
            }}>
              Cradlewell nurses are trained specifically for this window. Not a maid. Not a helper. A clinical professional who knows exactly what to watch for.
            </p>

            {/* Stats */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 44,
            }}>
              {stats.map((s, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: 18,
                  padding: '22px 36px',
                  textAlign: 'center',
                  minWidth: 130,
                  backdropFilter: 'blur(8px)',
                }}>
                  <div style={{
                    fontFamily: "'Lexend', system-ui, sans-serif",
                    fontWeight: 800,
                    fontSize: 'clamp(1.5rem, 3vw, 2.1rem)',
                    color: s.orange ? '#F97316' : '#ffffff',
                    marginBottom: 5,
                  }}>
                    {s.n}
                  </div>
                  <div style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: '0.75rem',
                    fontFamily: "'Lexend', system-ui, sans-serif",
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={openModal}
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #fb923c 100%)',
                border: 'none',
                color: '#fff',
                fontFamily: "'Lexend', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '1rem',
                padding: '14px 40px',
                borderRadius: 12,
                boxShadow: '0 4px 24px rgba(249,115,22,0.48)',
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              Book Free Consultation
            </button>

            <p style={{
              color: 'rgba(255,255,255,0.28)',
              fontSize: '0.8rem',
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              marginTop: 12,
              marginBottom: 0,
            }}>
              No commitment · Takes less than 5 minutes
            </p>
          </div>
        </ScrollReveal>
      </Container>
    </section>
  );
}
