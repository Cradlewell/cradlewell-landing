'use client';

import React, { useRef, useState } from 'react';
import { Container, Carousel } from 'react-bootstrap';
import Image from 'next/image';

const TestimonialsSection = () => {
  const carouselRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      name: 'Santosh Malpatra',
      text: 'Very professional and excellent home nursing service.Nurses are well-trained and knowledgeable.Excellent quality of medical and personal care for our baby.Nurses follow all instructions carefully and maintain proper hygiene.',
      image: '/images/testimonial1.png',
      rating: 5,
      source: 'Google Review',
      location: 'Bangalore',
    },
    {
      name: 'Yashul Srivastava',
      text: 'This Company has provided genuine nurse for our baby care. we took thier service package and we are quite satisfied with the services.looking forward in future as well if need arises.',
      image: '/images/testimonial2.png',
      rating: 5,
      source: 'Google Review',
      location: 'Bangalore',
    },
  ];

  const total = testimonials.length;

  const goPrev = () => carouselRef.current?.prev();
  const goNext = () => carouselRef.current?.next();

  return (
    <section className="py-5" id="testimonials" style={{ backgroundColor: '#EDF3FF' }}>
      <Container>
        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="fw-bold mb-2">
            <span style={{ color: '#5B7CFA' }}>Real reviews</span> from parents
          </h1>
          <p className="text-muted mb-0">Verified words from families we’ve supported.</p>
        </div>

        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="position-relative">
              <Carousel
                ref={carouselRef}
                indicators={false}
                controls={false}
                interval={null}
                activeIndex={activeIndex}
                onSelect={(selectedIndex) => setActiveIndex(selectedIndex)}
              >
                {testimonials.map((t, idx) => (
                  <Carousel.Item key={idx}>
                    <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm">
                      <div className="d-flex flex-column flex-md-row align-items-start gap-4">
                        {/* Image */}
                        <div
                          className="position-relative flex-shrink-0"
                          style={{
                            width: 200,
                            height: 200,
                            borderRadius: 16,
                            overflow: 'hidden',
                          }}
                        >
                          <Image
                            src={t.image}
                            alt={t.name}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="200px"
                          />
                          {/* Quote icon instead of play */}
                          <div
                            className="position-absolute bottom-0 start-0 m-3 d-flex align-items-center justify-content-center rounded-circle"
                            style={{
                              width: 40,
                              height: 40,
                              backgroundColor: '#FFFFFF',
                              border: '1px solid rgba(0,0,0,0.08)',
                            }}
                            aria-hidden="true"
                          >
                            <span style={{ color: '#5B7CFA', fontSize: 20, fontWeight: 700 }}>“</span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-grow-1">
                          <p className="mb-3 text-dark" style={{ fontSize: '1.05rem', lineHeight: 1.8 }}>
                            “{t.text}”
                          </p>

                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <div className="fw-bold">{t.name}</div>
                            <span className="text-muted">•</span>
                            <div className="text-muted">{t.location}</div>
                          </div>

                          <div className="d-flex align-items-center gap-3 mt-2">
                            <div className="text-warning" aria-label={`${t.rating} out of 5`}>
                              {'★'.repeat(t.rating)}
                              <span className="text-muted ms-2" style={{ fontSize: 14 }}>
                                {t.rating}.0
                              </span>
                            </div>

                            <span
                              className="px-2 py-1 rounded-pill"
                              style={{
                                fontSize: 12,
                                backgroundColor: '#F2F6FF',
                                color: '#2F4FE3',
                                border: '1px solid rgba(47,79,227,0.12)',
                              }}
                            >
                              {t.source}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Carousel.Item>
                ))}
              </Carousel>

              {/* Arrows INSIDE the card area */}
              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="position-absolute top-50 start-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(0,0,0,0.12)',
                      boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                      marginLeft: 10,
                    }}
                    aria-label="Previous testimonial"
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    onClick={goNext}
                    className="position-absolute top-50 end-0 translate-middle-y d-none d-md-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(0,0,0,0.12)',
                      boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                      cursor: 'pointer',
                      marginRight: 10,
                    }}
                    aria-label="Next testimonial"
                  >
                    →
                  </button>
                </>
              )}
            </div>

            {/* Dots indicators */}
            {total > 1 && (
              <div className="d-flex justify-content-center gap-2 mt-3">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Go to testimonial ${i + 1}`}
                    style={{
                      width: i === activeIndex ? 18 : 8,
                      height: 8,
                      borderRadius: 999,
                      border: 'none',
                      backgroundColor: i === activeIndex ? '#5B7CFA' : 'rgba(91,124,250,0.35)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default TestimonialsSection;
