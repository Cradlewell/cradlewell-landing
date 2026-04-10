'use client';

import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';
import Image from 'next/image';
import { FaX } from 'react-icons/fa6';
import Link from 'next/link';
import { useModal } from './ModalContext';

const Footer = () => {
  const { openModal } = useModal();

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
          {/* Logo & CTA */}
          <Col md={5} className="mb-4 mb-md-0">
            <div className="d-flex align-items-center mb-3">
              <Image src="/images/logo2.png" alt="logo" width={180} height={40} className="me-2" />
            </div>
            <p style={{ color: '#C4C4C4' }}>
              Providing premium, hospital-grade postnatal and newborn care in the comfort of your home. Your peace of mind is our priority.
            </p>
            <button
              className="btn btn-primary mt-2"
              style={{ borderRadius: 999, padding: '10px 24px' }}
              onClick={() => openModal()}
            >
              Book Free Consultation
            </button>
          </Col>

          {/* Contact info */}
          <Col md={5} className="mb-4 mb-md-0">
            <h4 className="mb-3">Contact Us</h4>
            <p className="mb-2" style={{ color: '#C4C4C4' }}>
              Site No. 26, Laskar Hosur, Adugodi, Koramangala,<br />
              Bangalore South, Bangalore - 560030, Karnataka
            </p>
            <p className="mb-2"><FaPhoneAlt className="me-2 text-success" /> +91 9363893639</p>
            <p><FaEnvelope className="me-2 text-success" /> care@cradlewell.com</p>
          </Col>

          {/* Social media */}
          <Col md={2}>
            <h4 className="mb-3">Follow Us</h4>
            <div className="d-flex gap-3 fs-5">
              <a href="https://www.facebook.com/share/1HRDvZY1K3/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-light">
                <FaFacebookF />
              </a>
              <a href="https://www.instagram.com/cradlewell_care?igsh=b3pkOHBxMTIyMGF4" target="_blank" rel="noopener noreferrer" className="text-light">
                <FaInstagram />
              </a>
              <a href="https://www.linkedin.com/company/cradlewell/" target="_blank" rel="noopener noreferrer" className="text-light">
                <FaLinkedinIn />
              </a>
              <a href="https://x.com/cradle_well?s=11" target="_blank" rel="noopener noreferrer" className="text-light">
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
              Terms &amp; Conditions
            </Link>
            <span
              className="text-light"
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => openModal()}
            >
              Support
            </span>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
