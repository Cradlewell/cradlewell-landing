'use-client'

import React from "react";
import { Container, Row, Col, Button, Card } from "react-bootstrap";

const PricingSection = () => {
	return (
		<div className="pricing-section bg-light py-5">
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


							<Button variant="primary" className="mt-auto">Get Started</Button>
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

							<Button variant="light" className="text-primary mt-auto">Get Started</Button>
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

							<Button variant="primary" className="mt-auto">Get Started</Button>
						</Card>
					</Col>
				</Row>

				<Button variant="btm btn-primary" className="mt-5">
					Start Free Trial
				</Button>
				<p className="mt-2 text-muted fw-bold">
					Limited nurse availability—book your preferred time slot now.
				</p>
			</Container>
		</div>
	);
};

export default PricingSection;
