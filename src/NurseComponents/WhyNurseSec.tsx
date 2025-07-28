'use client';

import React from 'react';
import { Container } from 'react-bootstrap';

const WhyNurseSec = () => {
  return (
    <section className="py-5 bg-white" id="howitworks">
      <Container>
        {/* Heading */}
        <div className="text-center mb-5">
          <h1 className="fw-bold">
            <span style={{ color: '#5B7CFA' }}> Why</span> Work With{' '}
            <span style={{ color: '#5B7CFA' }}> Cradlewell</span>
          </h1>
          <h4 className="" style={{ color: '#676767ff' }}>
            Because Your
            <span style={{ color: '#5B7CFA' }}> Safety, Dignity & Growth</span> shouldn't be Optional,
            it should be <span style={{ color: '#5B7CFA' }}> Guaranteed</span>
          </h4>
        </div>

        {/* Responsive Video */}
        <div className="text-center">
          <div className="ratio ratio-16x9">
            <iframe
              src="https://www.youtube.com/embed/OwPZIhTHDUk?si=wG1766whV0V_tYKa"
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default WhyNurseSec;
