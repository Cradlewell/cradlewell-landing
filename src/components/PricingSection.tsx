'use client'
import React from "react";
import { Container } from "react-bootstrap";
import { Stethoscope, Heart, Check, ArrowRight } from "lucide-react";
import { useModal } from "./ModalContext";

type PlanColor = 'violet' | 'indigo';

type Plan = {
  id: 'nurse' | 'moba';
  name: string;
  tagline: string;
  badge: string;
  price: string;
  unit: string;
  perNote: string;
  Icon: typeof Stethoscope;
  features: string[];
  cta: string;
  color: PlanColor;
};

const plans: Plan[] = [
  {
    id: 'nurse',
    name: 'Nurse Care',
    tagline: 'Clinical, hospital-grade',
    badge: 'Most Trusted',
    price: '2,000',
    unit: '/day',
    perNote: 'Per nurse, per shift',
    Icon: Stethoscope,
    color: 'violet',
    cta: 'Get Nurse Care',
    features: [
      'Clinical newborn care & monitoring',
      'Feeding support (breastfeeding guidance + schedule setup)',
      'Baby bathing, hygiene & sterilization protocols',
      'Burping cycles, colic observation & comfort care',
      'Mother recovery support (postpartum monitoring)',
      'Basic vitals tracking & health observations',
      'Sleep routine structuring for baby',
      'Escalation support if any concern arises',
      'Daily reporting & structured handover',
      'Trained, verified & hospital-experienced nurses',
    ],
  },
  {
    id: 'moba',
    name: 'MOBA Care',
    tagline: 'Trained caregiver support',
    badge: 'Most Chosen by Families',
    price: '1,500',
    unit: '/day',
    perNote: 'Per caregiver, per shift',
    Icon: Heart,
    color: 'indigo',
    cta: 'Get MOBA Care',
    features: [
      'Baby feeding assistance (as per parent guidance)',
      'Diapering, cleaning & hygiene care',
      'Gentle baby massage & safe bathing support',
      'Burping & soothing the baby',
      'Sleep routine & calming techniques',
      'Baby laundry & organization',
      'Mother comfort support (rest, positioning, hydration reminders)',
      'Emotional reassurance during recovery phase',
      'Age-appropriate baby engagement',
      'Trained, verified & guided caregivers',
    ],
  },
];

const colorMap: Record<PlanColor, { primary: string; light: string; serviceArg: string }> = {
  violet: { primary: '#5F47FF', light: 'rgba(95,71,255,0.08)', serviceArg: 'Nurse Care' },
  indigo: { primary: '#6388FF', light: 'rgba(99,136,255,0.10)', serviceArg: 'MOBA Care' },
};

const PricingSection = () => {
  const { openModal } = useModal();

  return (
    <section className="pricing-section py-5" id="ourplans">
      <Container>
        <div className="text-center" style={{ marginBottom: 56 }}>
          <span className="section-eyebrow">Pricing</span>
          <h2 className="fw-bold mt-2" style={{ color: 'var(--cw-text-primary)', marginBottom: 12 }}>
            Choose the <span style={{ color: 'var(--cw-brand-primary)' }}>care plan</span> that fits
          </h2>
          <p style={{ color: 'var(--cw-text-secondary)', maxWidth: 480, margin: '0 auto', fontSize: '1rem' }}>
            Transparent pricing. No hidden charges. Longer packages bring the per-day rate down.
          </p>
        </div>

        <div className="cw-pricing-grid">
          {plans.map((plan) => {
            const tone = colorMap[plan.color];
            return (
              <div key={plan.id} className="cw-pricing-card">
                {/* Badge */}
                <div
                  className="cw-pricing-badge"
                  style={{ background: tone.primary }}
                >
                  {plan.badge}
                </div>

                {/* Icon + name + tagline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                  <div
                    className="cw-pricing-icon"
                    style={{ background: tone.light }}
                  >
                    <plan.Icon size={22} strokeWidth={1.75} color={tone.primary} />
                  </div>
                  <div>
                    <h3 style={{
                      fontFamily: "'Lexend', system-ui, sans-serif",
                      fontWeight: 700,
                      fontSize: '1.25rem',
                      color: 'var(--cw-text-primary)',
                      margin: 0,
                      letterSpacing: '-0.015em',
                    }}>
                      {plan.name}
                    </h3>
                    <div style={{
                      fontFamily: "'Source Sans 3', system-ui, sans-serif",
                      fontSize: '0.86rem',
                      color: 'var(--cw-text-secondary)',
                      marginTop: 2,
                    }}>
                      {plan.tagline}
                    </div>
                  </div>
                </div>

                {/* Price block — confident, no pill */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{
                    fontFamily: "'Lexend', system-ui, sans-serif",
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: 'var(--cw-text-muted)',
                    marginBottom: 6,
                  }}>
                    Starting from
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{
                      fontFamily: "'Lexend', system-ui, sans-serif",
                      fontSize: 'clamp(2.4rem, 5vw, 3.25rem)',
                      fontWeight: 800,
                      lineHeight: 1,
                      color: 'var(--cw-text-primary)',
                      letterSpacing: '-0.03em',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      ₹{plan.price}
                    </span>
                    <span style={{
                      fontFamily: "'Lexend', system-ui, sans-serif",
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      color: 'var(--cw-text-secondary)',
                    }}>
                      {plan.unit}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: "'Source Sans 3', system-ui, sans-serif",
                    fontSize: '0.78rem',
                    color: 'var(--cw-text-muted)',
                    marginTop: 6,
                  }}>
                    {plan.perNote}
                  </div>
                </div>

                {/* Feature list */}
                <ul className="cw-pricing-features">
                  {plan.features.map((item, i) => (
                    <li key={i}>
                      <span
                        className="cw-pricing-check"
                        style={{ background: tone.light }}
                      >
                        <Check size={11} strokeWidth={3} color={tone.primary} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  type="button"
                  className="cw-pricing-cta"
                  onClick={() => openModal(tone.serviceArg)}
                  style={{ background: tone.primary }}
                >
                  {plan.cta}
                  <ArrowRight size={15} strokeWidth={2.25} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Secondary CTA */}
        <div className="text-center" style={{ marginTop: 48 }}>
          <button
            type="button"
            onClick={() => openModal()}
            className="cw-pricing-text-cta"
          >
            Not sure? Book a free consultation
            <ArrowRight size={14} strokeWidth={2.25} />
          </button>
          <p style={{
            marginTop: 8,
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            color: 'var(--cw-text-muted)',
            fontSize: '0.84rem',
          }}>
            Limited availability — book your preferred slot.
          </p>
        </div>
      </Container>
    </section>
  );
};

export default PricingSection;
