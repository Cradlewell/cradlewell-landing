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
<Form className="d-flex align-items-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 999, padding: 4, width: '100%', maxWidth: 360, }} action="https://crm.zoho.in/crm/WebToLeadForm" method="POST" target="_blank" acceptCharset="UTF-8" > {/* Required Zoho Hidden Fields */} <input type="hidden" name="xnQsjsdp" value="ab57b5b359d00f17753c941644d97aeae606c083f09556afcb2c2379fc14a70e" /> <input type="hidden" name="xmIwtLD" value="4fa3f4e2ad017703fd868e31ccdc8072c25fbd99924ea5fb0cf4d96832587a30510aa3c76c4fdb67a0092f76a7a4daca" /> <input type="hidden" name="actionType" value="TGVhZHM=" /> <input type="hidden" name="returnURL" value="https://yourdomain.com/thank-you" />
{/* Zoho requires Last Name field */}
<input type="hidden" name="Last Name" value="WebUser" />

{/* Visible Phone input */}
<Form.Control
type="tel"
name="Phone"
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
    Get a Call Back
  </Button>
</Form>

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
      <Modal show={showSupportModal} onHide={() => setShowSupportModal(false)} centered size="lg">
  <Modal.Header closeButton>
    <Modal.Title>Need Help? We Will Call You Back</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <div
      dangerouslySetInnerHTML={{
        __html: `
          <form id="webform941304000000475011" action="https://crm.zoho.in/crm/WebToLeadForm"
            name="WebToLeads941304000000475011" method="POST"
            onSubmit="javascript:document.charset='UTF-8'; return checkMandatory941304000000475011();"
            accept-charset="UTF-8">

            <!-- Required Zoho Fields -->
            <input type="text" style="display:none;" name="xnQsjsdp" value="ed70e75daf868e22b0b3fd743e12dc0005b7b4aa65666436ac6f51a086d43316" />
            <input type="hidden" name="zc_gad" id="zc_gad" value="" />
            <input type="text" style="display:none;" name="xmIwtLD" value="24192fb6bab63e1a2aad26bad1bcb0604dc25969a105ff878cf1328903b60e23af63509661cd13ec16e83fdd13f096a7" />
            <input type="text" style="display:none;" name="actionType" value="TGVhZHM=" />
            <input type="text" style="display:none;" name="returnURL" value="null" />

            <div class="form-group mb-3">
              <label>Full Name*</label>
              <input type="text" name="Last Name" class="form-control" required pattern="[A-Za-z ]+" title="Please enter letters only" maxlength="80" />
            </div>

            <div class="form-group mb-3">
              <label>Phone Number*</label>
              <input type="tel" name="Phone" class="form-control" required pattern="^[0-9]{10}$" maxlength="10" title="Please enter a valid 10-digit phone number" />
            </div>

            <div class="form-group mb-3">
              <label>Preferred Time for Call</label>
              <select name="LEADCF4" class="form-select">
                <option value="-None-">-None-</option>
                <option value="Anytime">Anytime</option>
                <option value="10 AM - 12 PM">10 AM – 12 PM</option>
                <option value="12 PM - 4 PM">12 PM – 4 PM</option>
                <option value="4 PM - 8 PM">4 PM – 8 PM</option>
              </select>
            </div>

            <div class="form-group mb-3">
              <label>Type of Support Needed</label>
              <select name="LEADCF5" class="form-select">
                <option value="-None-">-None-</option>
                <option value="Booking Help">Booking Help</option>
                <option value="Service Feedback">Service Feedback</option>
                <option value="Nurse Concern">Nurse Concern</option>
                <option value="Change Package">Change Package</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-group mb-3">
              <label>Message / Additional Notes</label>
              <textarea name="Description" class="form-control" rows="3"></textarea>
            </div>

            <div class="d-grid">
              <input type="submit" class="btn btn-primary w-100" value="Submit Request" />
            </div>

            <script>
              function checkMandatory941304000000475011 () {
                var mndFields = ['Last Name', 'Phone'];
                var fldLabels = ['Full Name', 'Phone'];
                for (var i = 0; i < mndFields.length; i++) {
                  var field = document.forms['WebToLeads941304000000475011'][mndFields[i]];
                  if (field && field.value.trim().length === 0) {
                    alert(fldLabels[i] + ' cannot be empty.');
                    field.focus();
                    return false;
                  }
                }
                return true;
              }
            </script>
          </form>
        `,
      }}
    />
  </Modal.Body>
</Modal>

      </>
  );
};

export default Footer;
