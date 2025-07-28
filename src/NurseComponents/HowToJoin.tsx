'use client';

import React from 'react';
import { Container } from 'react-bootstrap';
import Image from 'next/image';

const steps = [
  {
    title: 'Fill Application',
    desc: 'Complete our short application form',
    icon: '/icons/fill-form.png',
  },
  {
    title: 'HR Call',
    desc: 'Our team calls you within 24 hours',
    icon: '/icons/hr-call.png',
  },
  {
    title: 'Training',
    desc: 'Attend onboarding & skills Training',
    icon: '/icons/training.png',
  },
  {
    title: 'Assignment',
    desc: 'Get matched to verified homes',
    icon: '/icons/assignment.png',
  },
  {
    title: 'Start Care',
    desc: 'Begin professional, safe care delivery',
    icon: '/icons/start-care.png',
  },
];

const HowToJoin = () => {
  return (
    <section className="py-5" id='howtoapply'>
      <Container>
        <div className="rounded-4 p-4 p-md-5 shadow-sm" style={{ backgroundColor: '#F6FAFF' }}>
          {/* Heading */}
          <div className="text-center mb-5">
            <h1 className="fw-bold">
              <span style={{ color: '#5B7CFA' }}>How</span> to join <span className="text-dark">?</span>
            </h1>
            <p className="text-muted mb-0">Simple steps to start your Cradlewell Journey</p>
          </div>

          {/* Steps */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">
            {steps.map((step, index) => (
              <div key={index} className="text-center" style={{ flex: 1, minWidth: '120px' }}>
                <div className="mb-3">
                  <Image src={step.icon} alt={step.title} width={40} height={40} />
                </div>
                <h6 className="fw-semibold mb-2" style={{ color: '#5B7CFA' }}>
                  {step.title}
                </h6>
                <p className="small text-muted">{step.desc}</p>
              </div>
            )).reduce((acc: any[], curr, index) => {
              // Add arrows between items
              acc.push(curr);
              if (index < steps.length - 1) {
                acc.push(
                  <div key={`arrow-${index}`} className="d-none d-md-block" style={{ margin: '0 8px' }}>
                    <span style={{ fontSize: '1.5rem', color: '#C4C4C4' }}>→</span>
                  </div>
                );
              }
              return acc;
            }, [])}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default HowToJoin;
