'use client';

import React, { useRef } from 'react';
import { Container, Carousel, Row, Col } from 'react-bootstrap';
import Image from 'next/image';

const teamMembers = [
  {
    name: 'Wade Warren',
    experience: '12 years experience',
    role: 'Founder',
    roleColor: '#E0D8FF',
    image: '/images/founder1.png',
  },
  {
    name: 'Tanzina Zafrin',
    experience: '12 years experience',
    role: 'CEO',
    roleColor: '#D9E7FF',
    image: '/images/founder2.png',
  },
  {
    name: 'Leslie Alexander',
    experience: '12 years experience',
    role: 'Location Specialist',
    roleColor: '#D5F8DD',
    image: '/images/founder3.png',
  },
  {
    name: 'Jacob Jones',
    experience: '12 years experience',
    role: 'Location Specialist',
    roleColor: '#D5F8DD',
    image: '/images/founder4.png',
  },
  {
    name: 'Sarah Malik',
    experience: '10 years experience',
    role: 'COO',
    roleColor: '#FFE7D6',
    image: '/images/founder1.png',
  },
  {
    name: 'Daniel Wu',
    experience: '11 years experience',
    role: 'Marketing Head',
    roleColor: '#F2F3F5',
    image: '/images/founder2.png',
  },
  {
    name: 'Ava Patel',
    experience: '9 years experience',
    role: 'Product Manager',
    roleColor: '#D5F8DD',
    image: '/images/founder3.png',
  },
  {
    name: 'Leo Kim',
    experience: '13 years experience',
    role: 'Founder',
    roleColor: '#E0D8FF',
    image: '/images/founder4.png',
  },
];

const chunkArray = (arr: any[], size: number) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const FoundersCarousel = () => {
  const groupedMembers = chunkArray(teamMembers, 4);
  return (
 <section className="py-5">
      <Container>
        {/* Heading */}
        <div className="text-center mb-4">
          <h1 className="fw-bold">
            Meet Our <span style={{ color: '#5B7CFA' }}>Founders</span>
          </h1>
        </div>

        {/* Carousel (with indicators only) */}
        <Carousel className="text-center" controls={false} indicators interval={null}>
          {groupedMembers.map((group, idx) => (
            <Carousel.Item key={idx}>
              <Row className="g-3">
                {group.map((member, index) => (
                  <Col key={index} xs={12} sm={6} md={3}>
                    <div
                      className="text-center p-3 h-100"
                      style={{
                        backgroundColor: '#F9FAFB',
                        borderRadius: '16px',
                      }}
                    >
                      <div className="mb-3">
                        <Image
                          src={member.image}
                          alt={member.name}
                          width={160}
                          height={160}
                          style={{
                            borderRadius: '12px',
                            objectFit: 'cover',
                            width: '100%',
                            height: 'auto',
                          }}
                        />
                      </div>
                      <h6 className="fw-bold mb-1">{member.name}</h6>
                      <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                        {member.experience}
                      </p>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: member.roleColor,
                          color: '#333',
                          padding: '6px 12px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                        }}
                      >
                        {member.role}
                      </span>
                    </div>
                  </Col>
                ))}
              </Row>
            </Carousel.Item>
          ))}
        </Carousel>
      </Container>
    </section>
  );
};

export default FoundersCarousel;
