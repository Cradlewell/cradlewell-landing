'use client';

import React, { useRef } from 'react';
import { Container, Carousel } from 'react-bootstrap';
import Image from 'next/image';

const RealNurses = () => {
  const carouselRef = useRef<any>(null);

  const testimonials = [
    {
      name: 'Shreya Raj',
      text: `Being a nurse at Cradlewell has been a very rewarding job. I was able to make a genuine difference during a hard time by helping new mothers and families in their own homes. The crew is kind, well-organised, and really cares about both worker and client care. I'm proud to be a part of work that means so much.`,
      image: '/images/nursetesti.png',
    },
    {
      name: 'Shreya Raj',
      text: `Being a nurse at Cradlewell has been a very rewarding job. I was able to make a genuine difference during a hard time by helping new mothers and families in their own homes. The crew is kind, well-organised, and really cares about both worker and client care. I'm proud to be a part of work that means so much.`,
      image: '/images/nursetesti.png',
    },
  ];

  return (
    <section className="py-5" id="testimonials" style={{ backgroundColor: '#EDF3FF' }}>
      <Container>
        {/* Title */}
        <div className="text-center mb-5">
          <h1>
            <span style={{ color: '#5B7CFA' }}>Real Words</span> from Real Nurses
          </h1>
        </div>

        <div className="row align-items-center justify-content-center position-relative">
          {/* Left Arrow */}
          <div
            className="position-absolute start-0 d-none d-md-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 48,
              height: 48,
              border: '1px solid black',
              cursor: 'pointer',
              zIndex: 1,
              transform: 'translateX(-50%)',
            }}
            onClick={() => carouselRef.current?.prev()}
          >
            ←
          </div>

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
                  <div className="d-flex flex-column flex-md-row align-items-center bg-white p-4 rounded-4 shadow-sm">
                    {/* Image */}
                    <div
                      className="position-relative me-md-4 mb-3 mb-md-0"
                      style={{
                        position: 'relative',
                        width: '200px',
                        height: '100%',
                        minHeight: '260px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        fill
                        style={{
                          objectFit: 'cover',
                          borderRadius: '12px',
                        }}
                      />
                      {/* Play Button */}
                      <div
                        className="position-absolute bottom-0 start-0 m-3 d-flex align-items-center justify-content-center rounded-circle"
                        style={{
                          width: 40,
                          height: 40,
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            borderTop: '8px solid transparent',
                            borderBottom: '8px solid transparent',
                            borderLeft: '12px solid #5B7CFA',
                            marginLeft: '4px',
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Text */}
                    <div>
                      <p className="mb-3 text-dark" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                        {testimonial.text}
                      </p>
                      <strong>{testimonial.name}</strong>
                      <div className="text-warning mt-1">
                        {'★★★★★'.split('').map((star, i) => (
                          <span key={i}>{star}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Carousel.Item>
              ))}
            </Carousel>
          </div>

          {/* Right Arrow */}
          <div
            className="position-absolute end-0 d-none d-md-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 48,
              height: 48,
              border: '1px solid black',
              cursor: 'pointer',
              zIndex: 1,
              transform: 'translateX(50%)',
            }}
            onClick={() => carouselRef.current?.next()}
          >
            →
          </div>
        </div>
      </Container>
    </section>
  );
};

export default RealNurses;
