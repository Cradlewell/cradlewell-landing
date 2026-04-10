'use client';

import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Modal } from 'react-bootstrap';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTimes, FaPhoneAlt, FaEnvelope, FaTwitter } from 'react-icons/fa';
import Image from 'next/image';
import { FaX } from 'react-icons/fa6';
import Link from 'next/link';

const defaultSupportForm = {
  name: '',
  phone: '',
  preferredTime: '-None-',
  supportType: '-None-',
  message: '',
};

const Footer = () => {
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Inline callback form
  const [callbackPhone, setCallbackPhone] = useState('');
  const [callbackSubmitting, setCallbackSubmitting] = useState(false);
  const [callbackDone, setCallbackDone] = useState(false);

  // Support modal form
  const [supportForm, setSupportForm] = useState(defaultSupportForm);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCallbackSubmitting(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Web User',
          phone: callbackPhone,
          pagePath: typeof window !== 'undefined' ? window.location.pathname : '',
          summary: 'Footer callback request',
        }),
      });
      if (res.ok) {
        setCallbackDone(true);
        setCallbackPhone('');
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setCallbackSubmitting(false);
    }
  };

  const handleSupportChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setSupportForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportSubmitting(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supportForm.name,
          phone: supportForm.phone,
          summary: `Preferred Time: ${supportForm.preferredTime} | Support Type: ${supportForm.supportType} | Message: ${supportForm.message}`,
          pagePath: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      });
      if (res.ok) {
        setSupportSubmitted(true);
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setSupportSubmitting(false);
    }
  };

  const closeSupportModal = () => {
    setShowSupportModal(false);
    setSupportSubmitted(false);
    setSupportForm(defaultSupportForm);
  };

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
          {/* Logo & callback form */}
          <Col md={5} className="mb-4 mb-md-0">
            <div className="d-flex align-items-center mb-3">
              <Image src="/images/logo2.png" alt="logo" width={180} height={40} className="me-2" />
              <h5 className="mb-0 fw-bold"></h5>
            </div>
            <p style={{ color: '#C4C4C4' }}>
              Providing premium, hospital-grade postnatal and newborn care in the comfort of your home. Your peace of mind is our priority.
            </p>

            {callbackDone ? (
              <p style={{ color: '#a0f0a0', fontSize: '0.9rem' }}>
                Got it! We&apos;ll call you back soon.
              </p>
            ) : (
              <Form
                className="d-flex align-items-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 999, padding: 4, width: '100%', maxWidth: 360 }}
                onSubmit={handleCallbackSubmit}
              >
                <Form.Control
                  type="tel"
                  placeholder="Enter your phone number"
                  required
                  pattern="[0-9]{10}"
                  maxLength={10}
                  className="border-0"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    borderRadius: 999,
                    padding: '10px 16px',
                    fontSize: '0.9rem',
                    color: '#ffffff',
                    flex: 1,
                  }}
                  value={callbackPhone}
                  onChange={e => setCallbackPhone(e.target.value)}
                />
                <Button
                  type="submit"
                  className="border-0 ms-2"
                  disabled={callbackSubmitting}
                  style={{
                    backgroundColor: '#6675F7',
                    borderRadius: 999,
                    padding: '10px 20px',
                    fontSize: '0.9rem',
                    color: '#fff',
                  }}
                >
                  {callbackSubmitting ? '...' : 'Get a Call Back'}
                </Button>
              </Form>
            )}
          </Col>

          {/* Contact info */}
          <Col md={5} className="mb-4 mb-md-0">
            <h4 className=" mb-3">Contact Us</h4>
            <p className="mb-2" style={{ color: '#C4C4C4' }}>
              Site No. 26, Laskar Hosur, Adugodi, Koramangala,<br />
              Bangalore South, Bangalore - 560030, Karnataka
            </p>
            <p className="mb-2"><FaPhoneAlt className="me-2 text-success" /> +91 9363893639</p>
            <p><FaEnvelope className="me-2 text-success" /> care@cradlewell.com</p>
          </Col>

          {/* Social media */}
          <Col md={2}>
            <h4 className=" mb-3">Follow Us</h4>
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
              onClick={() => setShowSupportModal(true)}
            >
              Support
            </span>
          </Col>
        </Row>
      </Container>
    </footer>

    {/* Support Modal */}
    <Modal show={showSupportModal} onHide={closeSupportModal} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Need Help? We Will Call You Back</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {supportSubmitted ? (
          <div className="text-center py-4">
            <h5 className="text-success fw-semibold">Thank you! We&apos;ll call you shortly.</h5>
            <p className="text-muted mt-2">Our team will reach out within a few hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSupportSubmit}>
            <div className="form-group mb-3">
              <label>Full Name*</label>
              <input
                type="text"
                name="name"
                className="form-control"
                required
                pattern="[A-Za-z ]+"
                title="Please enter letters only"
                maxLength={80}
                value={supportForm.name}
                onChange={handleSupportChange}
              />
            </div>

            <div className="form-group mb-3">
              <label>Phone Number*</label>
              <input
                type="tel"
                name="phone"
                className="form-control"
                required
                pattern="^[0-9]{10}$"
                maxLength={10}
                title="Please enter a valid 10-digit phone number"
                value={supportForm.phone}
                onChange={handleSupportChange}
              />
            </div>

            <div className="form-group mb-3">
              <label>Preferred Time for Call</label>
              <select name="preferredTime" className="form-select" value={supportForm.preferredTime} onChange={handleSupportChange}>
                <option value="-None-">-None-</option>
                <option value="Anytime">Anytime</option>
                <option value="10 AM - 12 PM">10 AM – 12 PM</option>
                <option value="12 PM - 4 PM">12 PM – 4 PM</option>
                <option value="4 PM - 8 PM">4 PM – 8 PM</option>
              </select>
            </div>

            <div className="form-group mb-3">
              <label>Type of Support Needed</label>
              <select name="supportType" className="form-select" value={supportForm.supportType} onChange={handleSupportChange}>
                <option value="-None-">-None-</option>
                <option value="Booking Help">Booking Help</option>
                <option value="Service Feedback">Service Feedback</option>
                <option value="Nurse Concern">Nurse Concern</option>
                <option value="Change Package">Change Package</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group mb-3">
              <label>Message / Additional Notes</label>
              <textarea
                name="message"
                className="form-control"
                rows={3}
                value={supportForm.message}
                onChange={handleSupportChange}
              />
            </div>

            <div className="d-grid">
              <button type="submit" className="btn btn-primary w-100" disabled={supportSubmitting}>
                {supportSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </Modal.Body>
    </Modal>
    </>
  );
};

export default Footer;
