'use client'

import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Modal,
  Form,
} from "react-bootstrap";

const PricingSection = () => {
  const [showModal, setShowModal] = useState(false);

  const handleShow = () => setShowModal(true);
  const handleClose = () => setShowModal(false);
	return (
		<div className="pricing-section bg-light py-5" id="ourplans">
			<Container className="text-center text-dark">
<span className="badge rounded-pill bg-light primary-color px-3">Pricing Plans</span>
				<h1 className="fw-bold mt-2 mb-5">
					Choose the <span className="text-primary">Care Plan That Fits</span> You Best
				</h1>

				<Row className="g-4 justify-content-center">
					{/* Care Lite */}
					<Col md={4}>
						<Card className="h-100 shadow-sm p-4 price-card">
                            <div className="d-flex justify-content-center mb-2">
  <div
    className="d-flex align-items-center justify-content-center rounded-circle bg-light"
    style={{
      width: '50px',
      height: '50px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
    }}
  >
    <i className="fas fa-bolt text-primary" style={{ fontSize: '20px' }}></i>
  </div>
</div>

<h5 className="primary-color text-center mb-3 fw-semibold">Care Light</h5>
							<h1 className="fw-bold">₹45,000/mo</h1>
							<p className="text-muted">4 hrs/day</p>
                            <ul className="list-unstyled mt-4">
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Daily 4 hours care</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Baby massage & bath</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Mother hygiene + Pad change</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Breastfeeding Support</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Diapering & baby sleep setup</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Basic vitals (mother)</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>1 consultation (lactation or pediatric)</span>
  </li>
</ul>


							<Button variant="primary" className="mt-auto" onClick={handleShow}>Get Started</Button>
						</Card>
					</Col>

					{/* Care Plus - highlighted */}
					<Col md={4}>
						<Card className="h-100 text-white p-4 price-card" style={{ background: "linear-gradient(135deg,rgba(95, 71, 255, 0.8) 0%, #6388FF 100%)" }}>
                            <div className="d-flex justify-content-center mb-2">
  <div
    className="d-flex align-items-center justify-content-center rounded-circle"
    style={{
      width: '50px',
      height: '50px',
      boxShadow: 'inset 2px 2px 16px rgb(255, 255, 255)'
    }}
  >
    <i className="fas fa-layer-group text-light" style={{ fontSize: '20px' }}></i>
  </div>
</div>
<h5 className="text-white text-center mb-3 fw-semibold">Care Plus</h5>

							<h1 className="fw-bold">₹75,000/mo</h1>
							<p>8 hrs/day</p>
						<ul className="list-unstyled mt-4">
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-light me-2 mt-1"></i>
    <span>Daily 6 hours care</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-light me-2 mt-1"></i>
    <span>Baby massage & bath</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-light me-2 mt-1"></i>
    <span>Mother hygiene + Pad change</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-light me-2 mt-1"></i>
    <span>Breastfeeding Support</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-light me-2 mt-1"></i>
    <span>Diapering & baby sleep setup</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-light me-2 mt-1"></i>
    <span>Basic vitals (mother & baby)</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-light me-2 mt-1"></i>
    <span>2 consultations (lactation or pediatric)</span>
  </li>
</ul>

							<Button variant="light" className="text-primary mt-auto" onClick={handleShow}>Get Started</Button>
						</Card>
					</Col>

					{/* Night Guardian */}
					<Col md={4}>
						<Card className="h-100 shadow-sm p-4 price-card">
                            <div className="d-flex justify-content-center mb-2">
  <div
    className="d-flex align-items-center justify-content-center rounded-circle bg-light"
    style={{
      width: '50px',
      height: '50px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
    }}
  >
    <i className="fas fa-layer-group text-primary" style={{ fontSize: '20px' }}></i>
  </div>
</div>

<h5 className="primary-color text-center mb-3 fw-semibold">Night Guardian</h5>
							<h1 className="fw-bold">₹90,000/mo</h1>
							<p className="text-muted">12 hrs/night</p>
							<ul className="list-unstyled mt-4">
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Night nurse for 10 hours</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Baby feeding support</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Diaper change & burping</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Sleep routine support</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Soothing techniques</span>
  </li>
  <li className="d-flex align-items-start mb-3">
    <i className="far fa-check-circle text-primary me-2 mt-1"></i>
    <span>Mother rest tracking</span>
  </li>
</ul>

							<Button variant="primary" className="mt-auto" onClick={handleShow}>Get Started</Button>
						</Card>
					</Col>
				</Row>

				<Button variant="btm btn-primary" className="mt-5" onClick={handleShow}>
					Start Free Trial
				</Button>
				<p className="mt-2 text-muted fw-bold">
					Limited nurse availability—book your preferred time slot now.
				</p>
			</Container>


      {/* Popup Modal */}
      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Book Your Nurse Now</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted">
            Get expert mother & baby care at home, starting from 30 days.
          </p>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Full Name*</Form.Label>
              <Form.Control type="text" placeholder="Enter full name" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone Number*</Form.Label>
              <Form.Control type="tel" placeholder="Enter phone number" required />
              <Form.Check label="Opt-in for WhatsApp" className="mt-2" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control type="email" placeholder="Enter email" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>City & Locality*</Form.Label>
              <Form.Control type="text" placeholder="e.g., Bangalore, HSR Layout" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type of Care Needed</Form.Label>
              <Form.Select>
                <option>Care Lite (4 hrs)</option>
                <option>Care Plus (8 hrs)</option>
                <option>Night Guardian (12 hrs)</option>
                <option>Not sure / Need Help Choosing</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Preferred Start Date</Form.Label>
              <Form.Control type="date" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Duration of Service</Form.Label>
              <Form.Select>
                <option>7 Days</option>
                <option>14 Days</option>
                <option>30 Days</option>
                <option>Custom / Discuss on Call</option>
              </Form.Select>
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100">
              Submit
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    
		</div>
	);
};

export default PricingSection;
