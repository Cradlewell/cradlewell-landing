'use client';

import React, { useRef } from 'react';
import { Container, Carousel } from 'react-bootstrap';
import Image from 'next/image';

const TestimonialsSection = () => {
  const carouselRef = useRef<any>(null);

  const testimonials = [
    {
      name: 'Santosh Malpatra',
      text:
        'Very professional and excellent home nursing service. Nurses are well-trained and knowledgeable. Excellent quality of medical and personal care for our baby. Proper hygiene was maintained throughout.',
      image: '/images/testimonial2.png',
    },
    {
      name: 'Yashul Srivastava',
      text:
        'They provided a genuine and well-trained caregiver for our baby. We opted for a care package and were very satisfied with the service. Would definitely consider them again if needed.',
      image: '/images/testimonial1.png',
    },
  ];

  return (
    <section className="py-5" id="testimonials" style={{ backgroundColor: '#EDF3FF' }}>
      <Container>
        {/* Title */}
        <div className="text-center mb-5">
          <h1 className="fw-bold">
            <span style={{ color: '#5B7CFA' }}>Real words</span> from real parents
          </h1>
        </div>

        <div className="row align-items-center justify-content-center position-relative">
          {/* Left Arrow */}
          <button
            type="button"
            className="position-absolute start-0 d-none d-md-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 44,
              height: 44,
              border: '1px solid rgba(0,0,0,0.15)',
              backgroundColor: '#fff',
              cursor: 'pointer',
              zIndex: 2,
              transform: 'translateX(-50%)',
            }}
            onClick={() => carouselRef.current?.prev()}
            aria-label="Previous testimonial"
          >
            ←
          </button>

          {/* Carousel */}
          <div className="col-md-10">
            <Carousel
              ref={carouselRef}
              indicators={false}
              controls={false}
              interval={null}
            >
              {testimonials.map((testimonial, idx) => (
                <Carousel.Item key={idx}>
                  <div className="d-flex flex-column flex-md-row align-items-center bg-white p-4 p-md-5 rounded-4 shadow-sm">
                    
                    {/* Image */}
                    <div
                      className="position-relative me-md-4 mb-3 mb-md-0 flex-shrink-0"
                      style={{
                        width: 240,
                        height: 240,
                        borderRadius: '16px',
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        fill
                        sizes="240px"
                        style={{
                          objectFit: 'cover',
                          objectPosition: 'center top', // 👈 keeps face visible
                        }}
                      />
                    </div>

                    {/* Text */}
                    <div>
                      <p
                        className="mb-3 text-dark"
                        style={{ fontSize: '1.05rem', lineHeight: '1.7' }}
                      >
                        “{testimonial.text}”
                      </p>

                      <strong>{testimonial.name}</strong>

                      <div className="text-warning mt-1">
                        {'★★★★★'.split('').map((star, i) => (
                          <span key={i}>{star}</span>
                        ))}
                        <span className="text-muted ms-2" style={{ fontSize: '0.85rem' }}>
                          Google Review
                        </span>
                      </div>
                    </div>
                  </div>
                </Carousel.Item>
              ))}
            </Carousel>
          </div>

          {/* Right Arrow */}
          <button
            type="button"
            className="position-absolute end-0 d-none d-md-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 44,
              height: 44,
              border: '1px solid rgba(0,0,0,0.15)',
              backgroundColor: '#fff',
              cursor: 'pointer',
              zIndex: 2,
              transform: 'translateX(50%)',
            }}
            onClick={() => carouselRef.current?.next()}
            aria-label="Next testimonial"
          >
            →
          </button>
        </div>
      </Container>
    </section>
  );
};

export default TestimonialsSection;
