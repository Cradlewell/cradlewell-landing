'use client';

import React, { useState, useEffect } from 'react';
import { Container, Carousel, Row, Col } from 'react-bootstrap';
import Image from 'next/image';

const teamMembers: any[] = [
   {
    name: 'Lokesh',
    role: 'CEO',
    roleColor: '#E0D8FF',
    image: '/founders/lokesh.jpg',
  },
  {
    name: 'Dr.Vishnu Vardhan',
    role: 'CMO',
    roleColor: '#D5F8DD',
    image: '/founders/vishnu.jpg'
   ,
  },
  {
    name: 'Dr.Madhu Sudhan',
    role: 'COO',
    roleColor: '#D5F8DD',
    image: '/founders/madhu.jpg',
  },
  {
    name: 'Venu Annareddy',
    role: 'CFO',
    roleColor: '#D9E7FF',
    image: '/founders/venu.jpg',
  },
     {
    name: 'Vijaya',
    experience: '25 years experience',
    role: 'Senior Nurse (Level III)',
    roleColor: '#E0D8FF',
    image: '/team/vijaya.png',
  },
  {
    name: 'Sneha Marcel',
    experience: '3 years experience',
    role: 'Senior Nurse (Level I)',
    roleColor: '#D9E7FF',
    image: '/team/sneha.png',
  },
  {
    name: 'Phelomit Lepcha',
    experience: '1 year experience',
    role: 'Junior Nurse',
    roleColor: '#D5F8DD',
    image: '/team/phelomit.png',
  },
  {
    name: 'Pavithra',
    experience: '15 years experience',
    role: 'Yoga Consultant',
    roleColor: '#D5F8DD',
    image: '/team/pavithra.jpg',
  },
];

// Utility function to chunk array
const chunkArray = (arr: any[], size: number) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const FoundersCarousel = () => {
  const [itemsPerSlide, setItemsPerSlide] = useState(4);

  // Update number of items per slide based on window width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 576) {
        setItemsPerSlide(1); // Mobile
      } else if (width < 768) {
        setItemsPerSlide(2); // Tablet
      } else {
        setItemsPerSlide(4); // Desktop
      }
    };

    handleResize(); // initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const groupedMembers = chunkArray(teamMembers, itemsPerSlide);

  return (
    <section className="py-5" id='ourteam'>
      <Container>
        <div className="text-center mb-4">
          <h1 className="fw-bold">
            Meet Our <span style={{ color: '#5B7CFA' }}>Founders & Team</span>
          </h1>
        </div>

        <Carousel controls={false} indicators interval={null}>
          {groupedMembers.map((group, idx) => (
            <Carousel.Item key={idx}>
              <Row className="g-3 mb-5">
                {group.map((member, index) => (
                  <Col key={index} xs={12} sm={6} md={12 / itemsPerSlide}>
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
