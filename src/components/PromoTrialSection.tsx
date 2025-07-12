'use client';

import React from 'react';
import { Container, Button } from 'react-bootstrap';
import Image from 'next/image';
import { FaWhatsapp } from "react-icons/fa";


const PromoTrialSection = () => {
  return (
    <section
      className="position-relative py-5 text-center text-white"
      style={{
        background: 'linear-gradient(90deg, #6388FF 0%, #5F47FF 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Left SVG */}
      <div className="position-absolute top-50 start-0 translate-middle-y" style={{ zIndex: 2 }}>
        <Image src="/images/layer.svg" alt="left-svg" width={200} height={200} />
      </div>

      {/* Right SVG */}
      <div className="position-absolute top-50 end-0 translate-middle-y mx-3" style={{ zIndex: 2 }}>
        <Image src="/images/layer.svg" alt="right-svg" width={200} height={200} />
      </div>

      <Container style={{ position: 'relative', zIndex: 1 }}>
        <h2 className="fw-semibold mb-4" style={{ fontSize: '1.8rem' }}>
          Wait! Get your first day of<br />care completely free.
        </h2>
        <Button
          variant="dark"
          className="rounded-3 px-4 mx-2 fw-semibold mb-4"
          style={{ fontSize: '1rem' }}
        >
          Active Trial
        </Button>

          <Button
          variant="light"
          onClick={() => window.open('https://wa.me/919363893639', '_blank')}
          className="rounded-3 px-4 mx-2 fw-semibold mb-4"
          style={{ fontSize: '1rem' }}
        >
          <FaWhatsapp style={{ fontSize: '1.3rem' }}/> Chat On WhatsApp
        </Button>

        {/* Features */}
        <div className="d-flex flex-column flex-md-row justify-content-center gap-4 mt-3 text-white-50 small">
          <div>• No hidden charges</div>
          <div>• Verified Professionals</div>
          <div>• Data Privacy Guaranteed</div>
        </div>
      </Container>
    </section>
  );
};

export default PromoTrialSection;
