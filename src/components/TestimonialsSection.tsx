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
    {
      name: 'Snehashis & Anita',
      text:
        `We chose Cradlewell after our baby girl's birth, and as first-time parents, we were initially unsure. The experience turned out to be very reassuring. The caregivers were supportive and knowledgeable, guiding us through feeding and early baby care with patience. Their calm approach made those early days much smoother. Truly appreciate the care and professionalism.`,
  image: '/images/testimonial3.png',
    },
  ];

return (
  <section
    className="py-5"
    id="testimonials"
    style={{ backgroundColor: '#EDF3FF' }}
  >
    <Container>
      <div className="text-center mb-5">
        <h1 className="fw-bold">
          <span style={{ color: '#5B7CFA' }}>Real words</span> from real parents
        </h1>
      </div>

      <div className="row align-items-center justify-content-center position-relative">
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

        <div className="col-md-10">
          <Carousel
            ref={carouselRef}
            indicators={false}
            controls={false}
            interval={null}
          >
            {testimonials.map((testimonial, idx) => (
              <Carousel.Item key={idx}>
                <div
                  className="d-flex flex-column flex-md-row align-items-center bg-white p-4 p-md-5"
                  style={{
                    borderRadius: 20,
                    boxShadow: "0 8px 40px rgba(15,23,42,0.09)",
                    border: "1px solid rgba(15,23,42,0.06)",
                  }}
                >
                  <div
                    className="me-md-4 mb-3 mb-md-0 flex-shrink-0"
                    style={{
                      width: 220,
                      height: 220,
                      borderRadius: "16px",
                      overflow: "hidden",
                      boxShadow: "0 4px 20px rgba(15,23,42,0.12)",
                    }}
                  >
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      width={220}
                      height={220}
                      quality={100}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center top",
                      }}
                    />
                  </div>

                  <div>
                    {/* Stars first — immediate trust signal */}
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <span style={{ color: "#F59E0B", fontSize: "1.1rem", letterSpacing: 2 }}>
                        ★★★★★
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "'Lexend', system-ui, sans-serif",
                          fontWeight: 600,
                          color: "#94A3B8",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase" as const,
                        }}
                      >
                        Google Review
                      </span>
                    </div>

                    <p
                      className="mb-3"
                      style={{
                        fontSize: "1.05rem",
                        lineHeight: "1.75",
                        color: "#1E293B",
                        fontFamily: "'Source Sans 3', system-ui, sans-serif",
                        fontStyle: "italic",
                      }}
                    >
                      &ldquo;{testimonial.text}&rdquo;
                    </p>

                    <strong
                      style={{
                        fontFamily: "'Lexend', system-ui, sans-serif",
                        fontWeight: 700,
                        fontSize: "0.97rem",
                        color: "#0F172A",
                      }}
                    >
                      — {testimonial.name}
                    </strong>
                  </div>
                </div>
              </Carousel.Item>
            ))}
          </Carousel>
        </div>

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
