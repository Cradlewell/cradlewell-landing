'use client';

import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';

const defaultForm = {
  name: '',
  phone: '',
  email: '',
  city: '',
  service: 'Day Care(8 Hrs)',
  preferredStartDate: '',
  duration: '30 Days',
};

const ModalController = () => {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const openModal = () => setShowModal(true);
  const closeModal = () => {
    setShowModal(false);
    setSubmitted(false);
    setForm(defaultForm);
  };

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          email: form.email,
          city: form.city,
          service: form.service,
          preferredStartDate: form.preferredStartDate,
          summary: `Duration: ${form.duration}`,
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
    <>
      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Book Your Nurse Now</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {submitted ? (
            <div className="text-center py-4">
              <h5 className="text-success fw-semibold">Thank you! We&apos;ll call you shortly.</h5>
              <p className="text-muted mt-2">Our team will reach out within a few hours.</p>
            </div>
          ) : (
            <>
              <p className="text-muted">
                Get expert mother &amp; baby care at home, starting from 10 days.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="form-group mb-3">
                  <label>Full Name*</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    required
                    pattern="[A-Za-z ]+"
                    title="Please enter a valid full name"
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
                    title="Please enter a valid 10-digit phone number"
                    maxLength={10}
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group mb-3">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group mb-3">
                  <label>City &amp; Locality*</label>
                  <input
                    type="text"
                    name="city"
                    className="form-control"
                    required
                    value={form.city}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group mb-3">
                  <label>Type of Care Needed</label>
                  <select name="service" className="form-select" value={form.service} onChange={handleChange}>
                    <option value="Day Care(8 Hrs)">Day Care (8 Hrs)</option>
                    <option value="Night Care (9 Hrs)">Night Care (9 Hrs)</option>
                  </select>
                </div>

                <div className="form-group mb-3">
                  <label>Preferred Start Date</label>
                  <input
                    type="date"
                    name="preferredStartDate"
                    className="form-control"
                    min={today}
                    value={form.preferredStartDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group mb-3">
                  <label>Duration of Service</label>
                  <select name="duration" className="form-select" value={form.duration} onChange={handleChange}>
                    <option value="30 Days">30 Days</option>
                    <option value="60 Days">60 Days</option>
                    <option value="Custom / Decide On Call">Custom / Decide On Call</option>
                  </select>
                </div>

                <div className="d-grid">
                  <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ModalController;
