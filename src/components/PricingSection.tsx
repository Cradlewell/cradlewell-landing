'use client'
import React, { useEffect } from "react";
import { Container, Row, Col, Button, Card } from "react-bootstrap";
import { useModal } from "./ModalContext"; // adjust path if needed

const PricingSection = () => {
  useEffect(() => {
    const dateInput = document.getElementById("start-date-field") as HTMLInputElement | null;
    if (dateInput) {
      const today = new Date().toISOString().split("T")[0];
      dateInput.min = today;
    }
  }, []);

  const { openModal } = useModal();

  return (
    <div className="pricing-section bg-light py-5" id="ourplans">
      <Container className="text-center text-dark">
        <span className="badge rounded-pill bg-light primary-color px-3">Pricing Plan</span>
        <h1 className="fw-bold mt-2 mb-5">
          Choose the <span className="text-primary">Care Plan</span>
        </h1>

        <Row className="g-4 justify-content-center">
          {/* Care Lite (White Card - 8 Hour Plan) */}
          <Col md={6} lg={5}>
            <Card
              className="h-100 text-dark p-4 price-card shadow-sm"
              style={{ backgroundColor: "#ffffff" }}
            >
              <div className="d-flex justify-content-center mb-2">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: "50px",
                    height: "50px",
                    boxShadow: "inset 2px 2px 16px rgb(200, 200, 200)",
                  }}
                >
                  <i className="fas fa-sun text-primary" style={{ fontSize: "20px" }}></i>
                </div>
              </div>

              <h3 className="text-dark text-center mb-1 fw-semibold">Care Lite</h3>
              <p className="text-muted mb-3">8-hour day care</p>

              <ul className="list-unstyled mt-3 text-start mx-auto" style={{ maxWidth: 420 }}>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-primary me-2 mt-1"></i>
                  <span>Daily 8 hours of newborn & mother care</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-primary me-2 mt-1"></i>
                  <span>Baby massage and bath</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-primary me-2 mt-1"></i>
                  <span>Mother hygiene support and pad change</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-primary me-2 mt-1"></i>
                  <span>Breastfeeding support and feeding schedule guidance</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-primary me-2 mt-1"></i>
                  <span>Diapering and baby sleep setup</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-primary me-2 mt-1"></i>
                  <span>Basic vitals check (mother & baby)</span>
                </li>
                <li className="d-flex align-items-start mb-1">
                  <i className="far fa-check-circle text-primary me-2 mt-1"></i>
                  <span>1 consultation (lactation or pediatric)</span>
                </li>
              </ul>

              <Button variant="primary" className="mt-auto" onClick={openModal}>
                Get Started
              </Button>
            </Card>
          </Col>

          {/* Care Max (Blue Gradient - 12 Hour Night Guardian) */}
          <Col md={6} lg={5}>
            <Card
              className="h-100 text-white p-4 price-card"
               style={{ background: "linear-gradient(135deg, rgba(95,71,255,0.85) 0%, #6388FF 100%)" }}
            >
              <div className="d-flex justify-content-center mb-2">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: "50px",
                    height: "50px",
                    boxShadow: "inset 2px 2px 16px rgb(255, 255, 255)",
                  }}
                >
                  <i className="fas fa-shield-heart text-light" style={{ fontSize: "20px" }}></i>
                </div>
              </div>

              <h3 className="text-white text-center mb-1 fw-semibold">Care Max</h3>
              <p className="opacity-75 mb-3">8-hour day care</p>

              <ul className="list-unstyled mt-3 text-start mx-auto" style={{ maxWidth: 420 }}>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-light me-2 mt-1"></i>
                  <span>Overnight 12 hours of dedicated newborn care</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-light me-2 mt-1"></i>
                  <span>Night feeds, burping, and settling routine</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-light me-2 mt-1"></i>
                  <span>Sleep tracking and soothing support</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-light me-2 mt-1"></i>
                  <span>Mother rest protection — calls nurse when needed</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-light me-2 mt-1"></i>
                  <span>Hygiene, diapering, and nighttime logs</span>
                </li>
                <li className="d-flex align-items-start mb-3">
                  <i className="far fa-check-circle text-light me-2 mt-1"></i>
                  <span>Basic vitals check (mother & baby)</span>
                </li>
                <li className="d-flex align-items-start mb-1">
                  <i className="far fa-check-circle text-light me-2 mt-1"></i>
                  <span>1 pediatrician consult if needed</span>
                </li>
              </ul>

              <Button variant="light" className="text-primary mt-auto" onClick={openModal}>
                Get Started
              </Button>
            </Card>
          </Col>
        </Row>

        <Button variant="primary" className="mt-5" onClick={openModal}>
          Start Free Trial
        </Button>
        <p className="mt-2 text-muted fw-bold">Limited nurse availability — book your preferred time slot now.</p>
      </Container>
    </div>
  );
};

export default PricingSection;




      {/* Popup Modal */}
      {/* <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Book Your Nurse Now</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted">
            Get expert mother & baby care at home, starting from 7 days.
          </p>
          <div
  id="crmWebToEntityForm"
  className="zcwf_lblLeft crmWebToEntityForm"
  style={{
    backgroundColor: 'white',
    color: 'black',
    maxWidth: '100%',
    padding: '0',
  }}
  dangerouslySetInnerHTML={{
    __html: `
      <form id='webform941304000000471005' action='https://crm.zoho.in/crm/WebToLeadForm'
        name='WebToLeads941304000000471005' method='POST'
        onSubmit='javascript:document.charset="UTF-8"; return checkMandatory941304000000471005()'
        accept-charset='UTF-8'>

        <!-- hidden fields required by Zoho -->
        <input type='text' style='display:none;' name='xnQsjsdp' value='a7a0aaf7d3cfa89b7874fae502807036e98f8c45a4f5bab305abd86a885f62fd'/>
        <input type='hidden' name='zc_gad' id='zc_gad' value='' />
        <input type='text' style='display:none;' name='xmIwtLD' value='c85fd034328d45847bb9ad6baca109a9fd9cce73d2396aa70fec1cac636c5b6b034e55cccd59d825a3eccebe58b57e98'/>
        <input type='text' style='display:none;' name='actionType' value='TGVhZHM='/>
        <input type='text' style='display:none;' name='returnURL' value='null'/>

        <!-- Zoho-rendered fields -->
        <div class='form-group mb-3'>
          <label for='Last_Name'>Full Name*</label>
          <input type="text"
           name="Last Name"
           class="form-control"
           required
           pattern="[A-Za-z ]+"
          title="Please enter a valid fullname"
          />

        </div>

        <div class='form-group mb-3'>
          <label for='Mobile'>Phone Number*</label>
          <input
            type="tel"
            name="Mobile"
            class="form-control"
            required
            pattern="^[0-9]{10}$"
            title="Please enter a valid 10-digit phone number"
            maxlength="10"
          />
          <div class="form-check mt-2">
            <input type="checkbox" class="form-check-input" name="LEADCF101" id="whatsappOptin">
            <label class="form-check-label" for="whatsappOptin">Opt-in for WhatsApp</label>
          </div>
        </div>

        <div class='form-group mb-3'>
          <label for='Email'>Email Address</label>
          <input type='email' name='Email' class='form-control' />
        </div>

        <div class='form-group mb-3'>
          <label for='City'>City & Locality*</label>
          <input type='text' name='City' class='form-control' required />
        </div>

        <div class='form-group mb-3'>
          <label for='LEADCF2'>Type of Care Needed</label>
          <select name='LEADCF2' class='form-select'>
            <option value='-None-'>-None-</option>
            <option value='Care Light (4 Hrs)'>Care Light (4 Hrs)</option>
            <option value='Care Plus (8 Hrs)'>Care Plus (8 Hrs)</option>
            <option value='Night Guardian (12 Hrs)'>Night Guardian (12 Hrs)</option>
            <option value='Not Sure / Need Help Choosing'>Not Sure / Need Help Choosing</option>
          </select>
        </div>

        <div class='form-group mb-3'>
          <label for='LEADCF116'>Preferred Start Date</label>
          <input type='date' id='start-date-field' name='LEADCF116' class='form-control' />
        </div>

        <div class='form-group mb-3'>
          <label for='LEADCF3'>Duration of Service</label>
          <select name='LEADCF3' class='form-select'>
            <option value='-None-'>-None-</option>
            <option value='7 Days'>7 Days</option>
            <option value='14 Days'>14 Days</option>
            <option value='30 Days'>30 Days</option>
            <option value='Custom / Decide On Call'>Custom / Decide On Call</option>
          </select>
        </div>

        <div class='d-grid'>
          <input type='submit' class='btn btn-primary w-100' value='Submit' />
        </div>
      </form>
    `,
  }}
/>

        </Modal.Body>
      </Modal> */}
    
// 		</div>
// 	);
// };

// export default PricingSection;
