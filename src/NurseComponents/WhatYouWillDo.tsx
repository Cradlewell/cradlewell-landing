'use client';

import React from 'react';
import Image from 'next/image';
import { Carousel } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './WhatYouWillDo.css';

const newbornTasks = [
  { src: '/whychoose/newborn1.png', text: 'Bath' },
  { src: '/whychoose/newborn2.png', text: 'Diaper Changing' },
  { src: '/whychoose/newborn3.png', text: 'Proper Sleep Setup' },
  { src: '/whychoose/newborn4.png', text: 'Feeding Support' },
  { src: '/whychoose/newborn5.png', text: 'Burping' },
];

const motherTasks = [
  { src: '/whychoose/mothers1.png', text: 'Tracking vitals' },
  { src: '/whychoose/mothers2.png', text: 'Help with feeding' },
  { src: '/whychoose/mothers3.png', text: 'Postnatal comfort' },
  { src: '/whychoose/mothers4.png', text: 'Emotional Support' },
  { src: '/whychoose/mothers5.png', text: 'Daily Monitoring' },
];

export default function WhatYouWillDo() {
  return (
    <section className="py-5 container" id='responsibilities'>
      <h1 className="text-center fw-bold mb-5">
        <span className="text-primary">What</span> You will be <span className="text-primary">Doing</span>?
      </h1>

      <div className="row g-4 justify-content-around">
        {/* Newborn Section */}
        <div className="col-md-5">
        <h3 className="text-center fw-bold text-primary mb-3">For Newborn</h3>
          <div className="p-3 rounded shadow-sm bg-light">
            <Carousel indicators={false} controls={true} fade>
              {newbornTasks.map((item, idx) => (
                <Carousel.Item key={idx}>
  <div className="text-center">
    <Image
      src={item.src}
      className="d-block w-100 rounded-4"
      alt={item.text}
      width={400}
      height={550}
      style={{ maxHeight: '550px' }}
    />
    <div className="label-box mt-3">{item.text}</div>
  </div>
</Carousel.Item>

              ))}
            </Carousel>
          </div>
        </div>

        {/* Mother Section */}
        <div className="col-md-5">
        <h3 className="text-center fw-bold text-primary mb-3">For Mother</h3>
          <div className="p-3 rounded shadow-sm bg-light">
            <Carousel indicators={false} controls={true} fade>
              {motherTasks.map((item, idx) => (
                <Carousel.Item key={idx}>
  <div className="text-center">
    <Image
      src={item.src}
      className="d-block w-100 rounded-4"
      alt={item.text}
      width={400}
      height={550}
      style={{  maxHeight: '550px' }}
    />
    <div className="label-box mt-3">{item.text}</div>
  </div>
</Carousel.Item>

              ))}
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
}
