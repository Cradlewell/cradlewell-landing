'use client';

import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Modal } from 'react-bootstrap';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTimes, FaPhoneAlt, FaEnvelope, FaTwitter } from 'react-icons/fa';
import Image from 'next/image';
import { FaX } from 'react-icons/fa6';
import Link from 'next/link';

const Footer = () => {
    const [showSupportModal, setShowSupportModal] = useState(false);

  return (
    <>
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
              Providing premium, hospital-grade postnatal and newborn care in the comfort of your home. Your peace of mind is our priority.
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
    placeholder="Enter your phone number"
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
     onClick={() => window.open('https://wa.me/919363893639', '_blank')}
    className="border-0 ms-2"
    style={{
      backgroundColor: '#6675F7',
      borderRadius: 999,
      padding: '10px 20px',
      fontSize: '0.9rem',
      color: '#fff',
    }}
  >
    Get a Call Back
  </Button>
</Form>

          </Col>

          {/* Contact info */}
          <Col md={5} className="mb-4 mb-md-0">
            <h4 className=" mb-3">Contact Us</h4>
            <p className="mb-2" style={{ color: '#C4C4C4' }}>
              Bangalore, Karnataka<br />
            </p>
            <p className="mb-2"><FaPhoneAlt className="me-2 text-success" /> +91 9363893639</p>
            <p><FaEnvelope className="me-2 text-success" /> care@cradlewell.com</p>
          </Col>

          {/* Social media */}
          <Col md={2}>
            <h4 className=" mb-3">Follow Us</h4>
            <div className="d-flex gap-3 fs-5">
 <a
      href="https://www.facebook.com/share/1HRDvZY1K3/?mibextid=wwXIfr"
      target="_blank"
      rel="noopener noreferrer"
      className="text-light"
    >
      <FaFacebookF />
    </a>
    <a
      href="https://www.instagram.com/cradlewell_care?igsh=b3pkOHBxMTIyMGF4"
      target="_blank"
      rel="noopener noreferrer"
      className="text-light"
    >
      <FaInstagram />
    </a>
    <a
      href="https://www.linkedin.com/company/cradlewell/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-light"
    >
      <FaLinkedinIn />
    </a>
    <a
      href="https://x.com/cradle_well?s=11"
      target="_blank"
      rel="noopener noreferrer"
      className="text-light"
    >
      <FaX />
    </a>
            </div>
          </Col>
        </Row>

        <Row className="pt-4 border-top border-secondary" style={{ fontSize: '0.875rem' }}>
          <Col md={6} className="text-start text-light">
            © Copyright 2025, All Rights Reserved by TENDERKIN WELLNESS PRIVATE LIMITED
          </Col>
          <Col md={6} className="text-md-end mt-3 mt-md-0">
<Link href="/privacy-policy" className="me-3 text-light text-decoration-none">
  Privacy Policy
</Link>            
<Link href="/terms-conditions" className="me-3 text-light text-decoration-none">
Terms & Conditions
</Link>             <span className="text-light" style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setShowSupportModal(true)}>Support</span>
          </Col>
        </Row>
      </Container>
    </footer>
      <Modal show={showSupportModal} onHide={() => setShowSupportModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Need Help? We’ll Call You Back</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="supportName">
              <Form.Label>Full Name *</Form.Label>
              <Form.Control type="text" placeholder="Enter your name" required />
            </Form.Group>

            <Form.Group className="mb-3" controlId="supportPhone">
              <Form.Label>Phone Number *</Form.Label>
              <Form.Control type="tel" placeholder="Enter your phone number" required />
            </Form.Group>

            <Form.Group className="mb-3" controlId="supportTime">
              <Form.Label>Preferred Time for Call</Form.Label>
              <Form.Select>
                <option>Anytime</option>
                <option>10 AM – 12 PM</option>
                <option>12 PM – 4 PM</option>
                <option>4 PM – 8 PM</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="supportType">
              <Form.Label>Type of Support Needed</Form.Label>
              <Form.Select>
                <option>Booking Help</option>
                <option>Service Feedback</option>
                <option>Nurse Concern</option>
                <option>Change Package</option>
                <option>Other</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="supportMessage">
              <Form.Label>Message / Additional Notes</Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Optional" />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100">
              Submit Request
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      </>
  );
};

export default Footer;
