'use client';

import React from 'react';
import { Container } from 'react-bootstrap';
import Image from 'next/image';
import ScrollReveal from './ScrollReveal';

const teamMembers = [
  {
    name: 'Lokesh',
    role: 'CEO & Co-Founder',
    roleColor: '#EEF2FF',
    roleText: '#5F47FF',
    image: '/founders/lokesh.jpg',
    desc: 'Visionary behind Cradlewell, driving mission-first healthcare.',
  },
  {
    name: 'Dr. Vishnu Vardhan',
    role: 'CMO',
    roleColor: '#F0FDF4',
    roleText: '#16A34A',
    image: '/founders/vishnu.jpg',
    desc: 'Medical expertise ensuring clinical excellence in every home visit.',
  },
  {
    name: 'Dr. Madhu Sudhan',
    role: 'COO',
    roleColor: '#F0FDF4',
    roleText: '#16A34A',
    image: '/founders/madhu.jpg',
    desc: 'Operations leader building scalable, nurse-first care delivery.',
  },
  {
    name: 'Venu Annareddy',
    role: 'CFO',
    roleColor: '#EFF6FF',
    roleText: '#2563EB',
    image: '/founders/venu.jpg',
    desc: 'Financial strategy powering sustainable, accessible care for all.',
  },
];

const FoundersCarousel = () => (
  <section className="py-5" id="ourteam" style={{ backgroundColor: '#F8FAFC' }}>
    <Container>
      <ScrollReveal direction="none">
        <div className="text-center mb-5">
          <span className="section-eyebrow">The Team</span>
          <h2 className="fw-bold mt-2">
            Meet Our <span style={{ color: '#5B7CFA' }}>Founders &amp; Team</span>
          </h2>
          <p style={{ color: '#64748B', maxWidth: 420, margin: '8px auto 0', fontSize: '1rem' }}>
            Healthcare professionals and operators united by one mission — better postnatal care for every family.
          </p>
        </div>
      </ScrollReveal>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 20,
      }}>
        {teamMembers.map((member, i) => (
          <ScrollReveal key={i} direction="up" delay={i * 80}>
            <div style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '28px 20px 24px',
              textAlign: 'center',
              border: '1px solid rgba(15,23,42,0.06)',
              boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
              transition: 'box-shadow 220ms ease, transform 220ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 36px rgba(15,23,42,0.10)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(15,23,42,0.05)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
            >
              {/* Photo */}
              <div style={{
                width: 88,
                height: 88,
                borderRadius: 18,
                overflow: 'hidden',
                margin: '0 auto 16px',
                boxShadow: '0 4px 18px rgba(15,23,42,0.12)',
              }}>
                <Image
                  src={member.image}
                  alt={member.name}
                  width={88}
                  height={88}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Name */}
              <h3 style={{
                fontFamily: "'Lexend', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '1rem',
                color: '#0F172A',
                marginBottom: 6,
                letterSpacing: '-0.01em',
              }}>
                {member.name}
              </h3>

              {/* Role badge */}
              <span style={{
                display: 'inline-block',
                background: member.roleColor,
                color: member.roleText,
                fontSize: '0.72rem',
                fontFamily: "'Lexend', system-ui, sans-serif",
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 20,
                letterSpacing: '0.03em',
                marginBottom: 12,
              }}>
                {member.role}
              </span>

              {/* Description */}
              <p style={{
                color: '#64748B',
                fontSize: '0.84rem',
                lineHeight: 1.6,
                margin: 0,
                fontFamily: "'Source Sans 3', system-ui, sans-serif",
              }}>
                {member.desc}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </Container>
  </section>
);

export default FoundersCarousel;
