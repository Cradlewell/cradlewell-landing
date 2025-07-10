import React from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTimes, FaPhoneAlt, FaEnvelope, FaTwitter } from 'react-icons/fa';
import Image from 'next/image';
import { FaX } from 'react-icons/fa6';

const Footer = () => {
  return (
    <footer className="text-white position-relative pt-5 pb-4" style={{ background: '#08082B', overflow: 'hidden' }}>
      {/* Top-left circle gradient */}
      <div
        className="position-absolute"
        style={{
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(102,117,247,0.4) 0%, transparent 80%)',
          top: '-50px',
          left: '-50px',
          zIndex: 0,
        }}
      ></div>

      {/* Bottom-right circle gradient */}
      <div
        className="position-absolute"
        style={{
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(102,117,247,0.4) 0%, transparent 80%)',
          bottom: '-50px',
          right: '-50px',
          zIndex: 0,
        }}
      ></div>

      <Container style={{ position: 'relative', zIndex: 1 }}>
        <Row className="mb-4">
          {/* Logo & newsletter */}
          <Col md={5} className="mb-4 mb-md-0">
            <div className="d-flex align-items-center mb-3">
              <Image src="/images/logo2.png" alt="logo" width={180} height={40} className="me-2" />
              <h5 className="mb-0 fw-bold"></h5>
            </div>
            <p style={{ color: '#C4C4C4' }}>
              There are many variations of passages<br />
              of Lorem the Ipsum available it majority.
            </p>
           <Form
  className="d-flex align-items-center"
  style={{
    backgroundColor: 'rgba(255, 255, 255, 0.06)', // Slight outer container visibility
    borderRadius: 999,
    padding: 4,
    width: '100%',
    maxWidth: 360,
  }}
>
  <Form.Control
    type="email"
    placeholder="Enter your email"
    className="border-0"
    style={{
      backgroundColor: 'rgba(255, 255, 255, 0.12)', // Softer purple-gray
      borderRadius: 999,
      padding: '10px 16px',
      fontSize: '0.9rem',
      color: '#ffffff', // Make text white
      flex: 1,
    }}
  />
  <Button
    type="submit"
    className="border-0 ms-2"
    style={{
      backgroundColor: '#6675F7',
      borderRadius: 999,
      padding: '10px 20px',
      fontSize: '0.9rem',
      color: '#fff',
    }}
  >
    Subscribe
  </Button>
</Form>

          </Col>

          {/* Contact info */}
          <Col md={5} className="mb-4 mb-md-0">
            <h4 className=" mb-3">Contact Us</h4>
            <p className="mb-2" style={{ color: '#C4C4C4' }}>
              455 West Orchard Street Kings Mountain,<br />NC 280867
            </p>
            <p className="mb-2"><FaPhoneAlt className="me-2 text-success" /> +088 (246) 642-27-10</p>
            <p><FaEnvelope className="me-2 text-success" /> example@gmail.com</p>
          </Col>

          {/* Social media */}
          <Col md={2}>
            <h4 className=" mb-3">Follow Us</h4>
            <div className="d-flex gap-3 fs-5">
              <FaFacebookF />
              <FaInstagram />
              <FaLinkedinIn />
              <FaX />
            </div>
          </Col>
        </Row>

        <Row className="pt-4 border-top border-secondary" style={{ fontSize: '0.875rem' }}>
          <Col md={6} className="text-start text-light">
            @ Copyright 2025, All Rights Reserved by TENDERKIN WELLNESS PRIVATE LIMITED
          </Col>
          <Col md={6} className="text-md-end mt-3 mt-md-0">
            <span className="me-3 text-light">Privacy Policy</span>
            <span className="me-3 text-light">Terms & Conditions</span>
            <span className="text-light">Support</span>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
