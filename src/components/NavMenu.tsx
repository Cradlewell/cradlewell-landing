'use client';

import React, { useState } from "react";
import {
	Button,
	Collapse,
	Container,
	Form,
	InputGroup,
	Modal,
	Nav,
	Navbar,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faShoppingCart } from "@fortawesome/free-solid-svg-icons";
import { FaBars } from "react-icons/fa";
import { FiPhoneCall } from "react-icons/fi";


// Route type
type Route = {
	name: string;
	href: string;
};

const routes: Route[] = [
	{ name: "Why Choose", href: "/#whychoose" },
	{ name: "How It Works", href: "/#howitworks" },
	{ name: "See Plan", href: "/#ourplans" },
	{ name: "Testimonials", href: "/#testimonials" },
	{ name: "Our Team", href: "/#ourteam" },
	// { name: "FAQs", href: "#faq" },
	{ name: "Blogs", href: "/blog" },
];

const NavMenu: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
	<Nav className="mx-auto mb-2 mb-lg-0 mt-4 mt-lg-0 px-2">
		{children}
		{routes.map((route) => (
			<Nav.Item key={route.name}>
				<Nav.Link href={route.href} className="nav-link-hover">
					{route.name}
				</Nav.Link>
			</Nav.Item>
		))}
	</Nav>
);

type NavMenu2Props = {
	toggleSearch: () => void;
	openModal: () => void;
};

const NavMenu2: React.FC<NavMenu2Props> = ({ toggleSearch, openModal }) => (
	<Nav className="flex-row mb-2 mb-lg-0">
		<Nav.Item className="nav-item mx-2">
			<a className="btn btn-primary" href="tel:9363893639">
				<FiPhoneCall /> Call Us
			</a>
		</Nav.Item>
    	<Nav.Item className="nav-item mx-2">
			<a className="btn btn-primary" onClick={() => openModal()}>
				Contact Us
			</a>
		</Nav.Item>
	</Nav>
);

const SearchForm: React.FC = () => (
	<Form className="mt-4">
		<InputGroup>
			<Form.Control type="search" placeholder="City, Address, Zip" />
			<Button variant="" className="ezy__nav5-btn px-3" type="submit">
				Search
			</Button>
		</InputGroup>
	</Form>
);

const defaultContactForm = {
  name: '',
  phone: '',
  preferredTime: '-None-',
  supportType: '-None-',
  message: '',
};

const Navigation5: React.FC = () => {
	const [isOpenSearch, setIsOpenSearch] = useState(false);
	const [showModal, setShowModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(defaultContactForm);

	const toggleSearch = () => setIsOpenSearch((prev) => !prev);
	const openModal = () => setShowModal(true);
	const closeModal = () => {
    setShowModal(false);
    setSubmitted(false);
    setForm(defaultContactForm);
  };

  React.useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 0);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          summary: `Preferred Time: ${form.preferredTime} | Support Type: ${form.supportType} | Message: ${form.message}`,
          pagePath: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('Something went wrong. Please try again.');
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

	return (
		<div className={`ezy__nav5 light sticky-top ${scrolled ? 'shadow-sm' : ''}`}>
			<Navbar expand="lg" className="flex-column py-3">
				<Container>
					<Navbar.Brand href="/">
						<img className="img-fluid" width={"200px"} src="/images/logo.png" alt="Cradlewell Logo - Nurse-led Newborn and Postnatal Home Care Services in Bangalore" />
					</Navbar.Brand>
					<Navbar.Toggle aria-controls="ezy__nav5-navbar-nav">
						<span><span /></span>
						<span><span /></span>
						<span><span /></span>
					</Navbar.Toggle>
					<Navbar.Collapse id="ezy__nav5-navbar-nav">
						<NavMenu />
						<NavMenu2 toggleSearch={toggleSearch} openModal={openModal} />
					</Navbar.Collapse>
				</Container>

				<Container>
					<Collapse in={isOpenSearch} className="w-100">
						<div>
							<SearchForm />
						</div>
					</Collapse>
				</Container>
			</Navbar>

			{/* Contact Us Modal */}
			<Modal show={showModal} onHide={closeModal} centered>
				<Modal.Header closeButton>
					<Modal.Title>Need Help? We Will Call You Back</Modal.Title>
				</Modal.Header>
				<Modal.Body>
          {submitted ? (
            <div className="text-center py-4">
              <h5 className="text-success fw-semibold">Thank you! We&apos;ll call you shortly.</h5>
              <p className="text-muted mt-2">Our team will reach out within a few hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
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
                  value={form.name}
                  onChange={handleChange}
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
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group mb-3">
                <label>Preferred Time for Call</label>
                <select name="preferredTime" className="form-select" value={form.preferredTime} onChange={handleChange}>
                  <option value="-None-">-None-</option>
                  <option value="Anytime">Anytime</option>
                  <option value="10 AM - 12 PM">10 AM – 12 PM</option>
                  <option value="12 PM - 4 PM">12 PM – 4 PM</option>
                  <option value="4 PM - 8 PM">4 PM – 8 PM</option>
                </select>
              </div>

              <div className="form-group mb-3">
                <label>Type of Support Needed</label>
                <select name="supportType" className="form-select" value={form.supportType} onChange={handleChange}>
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
                  value={form.message}
                  onChange={handleChange}
                />
              </div>

              <div className="d-grid">
                <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          )}
				</Modal.Body>
			</Modal>
		</div>
	);
};

export default Navigation5;
