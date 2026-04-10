'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Modal } from 'react-bootstrap';

type ModalContextType = {
  openModal: (service?: string) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextType>({
  openModal: () => {},
  closeModal: () => {},
});

export const useModal = () => useContext(ModalContext);

const defaultForm = {
  name: '',
  phone: '',
  service: '',
  babyStatus: '',
  hospitalName: '',
  birthStageStatus: '',
  babyAge: '',
  currentWeight: '',
  address: '',
  shiftType: '',
  shiftHours: '',
  shiftTime: '',
  careStartDate: '',
  serviceDays: '',
};

const HOSPITALS = [
  'Manipal Hospital', 'Fortis Hospital', 'Apollo Hospital',
  'Columbia Asia Hospital', 'Cloudnine Hospital', 'Sakra World Hospital',
  'Narayana Health', "St. John's Medical College Hospital",
  'Motherhood Hospital', 'Rainbow Children\'s Hospital',
  'BGS Gleneagles Global Hospital', 'Aster CMI Hospital', 'Other',
];

function getShiftHours(service: string, shiftType: string): string[] {
  if (!service || !shiftType) return [];
  if (service === 'Nurse Care') return shiftType === 'Day' ? ['8 Hours'] : ['9 Hours'];
  if (service === 'MOBA Care') return shiftType === 'Day' ? ['8 Hours', '10 Hours', '12 Hours'] : ['10 Hours', '12 Hours'];
  return [];
}

function getShiftTimes(service: string, shiftType: string, shiftHours: string): string[] {
  if (!service || !shiftType || !shiftHours) return [];
  if (service === 'Nurse Care') {
    if (shiftType === 'Day' && shiftHours === '8 Hours') return ['8:00 AM – 4:00 PM', '9:00 AM – 5:00 PM', '10:00 AM – 6:00 PM'];
    if (shiftType === 'Night' && shiftHours === '9 Hours') return ['9:00 PM – 6:00 AM'];
  }
  if (service === 'MOBA Care') {
    if (shiftType === 'Day' && shiftHours === '8 Hours')  return ['8:00 AM – 4:00 PM', '9:00 AM – 5:00 PM', '10:00 AM – 6:00 PM'];
    if (shiftType === 'Day' && shiftHours === '10 Hours') return ['9:00 AM – 7:00 PM'];
    if (shiftType === 'Day' && shiftHours === '12 Hours') return ['8:00 AM – 8:00 PM'];
    if (shiftType === 'Night' && shiftHours === '10 Hours') return ['9:00 PM – 7:00 AM'];
    if (shiftType === 'Night' && shiftHours === '12 Hours') return ['8:00 PM – 8:00 AM'];
  }
  return [];
}

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const openModal = (service?: string) => {
    setForm(prev => ({ ...defaultForm, service: service ?? prev.service }));
    setSubmitted(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSubmitted(false);
    setForm(defaultForm);
  };

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'service' || name === 'shiftType') {
        next.shiftHours = '';
        next.shiftTime = '';
      }
      if (name === 'shiftHours') next.shiftTime = '';
      return next;
    });
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
          service: form.service,
          babyStatus: form.babyStatus,
          hospitalName: form.hospitalName,
          birthStageStatus: form.birthStageStatus,
          babyAge: form.babyAge,
          currentWeight: form.currentWeight,
          address: form.address,
          shiftType: form.shiftType,
          shiftHours: form.shiftHours,
          shiftTime: form.shiftTime,
          careStartDate: form.careStartDate
            ? form.careStartDate.split('-').reverse().join('-')
            : '',
          serviceDays: form.serviceDays,
          pagePath: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      });
      if (res.ok) setSubmitted(true);
      else alert('Something went wrong. Please try again.');
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const shiftHoursOptions = getShiftHours(form.service, form.shiftType);
  const shiftTimeOptions = getShiftTimes(form.service, form.shiftType, form.shiftHours);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}

      <Modal show={showModal} onHide={closeModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Book Your Care Now</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          {submitted ? (
            <div className="text-center py-5">
              <h5 className="text-success fw-semibold">Thank you! We&apos;ll call you shortly.</h5>
              <p className="text-muted mt-2">Our team will reach out within a few hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              {/* Name */}
              <div className="form-group mb-3">
                <label className="form-label fw-semibold">Full Name*</label>
                <input type="text" name="name" className="form-control" required
                  pattern="[A-Za-z ]+" title="Letters only" value={form.name} onChange={handleChange} />
              </div>

              {/* Phone */}
              <div className="form-group mb-3">
                <label className="form-label fw-semibold">Phone Number*</label>
                <input type="tel" name="phone" className="form-control" required
                  pattern="^[0-9]{10}$" title="10-digit number" maxLength={10}
                  value={form.phone} onChange={handleChange} />
              </div>

              {/* Service */}
              <div className="form-group mb-3">
                <label className="form-label fw-semibold">Service*</label>
                <select name="service" className="form-select" required value={form.service} onChange={handleChange}>
                  <option value="">Select Service</option>
                  <option value="Nurse Care">Nurse Care</option>
                  <option value="MOBA Care">MOBA Care</option>
                </select>
              </div>

              {/* Baby Born or Expecting */}
              <div className="form-group mb-3">
                <label className="form-label fw-semibold">Baby Born or Expecting?*</label>
                <select name="babyStatus" className="form-select" required value={form.babyStatus} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Baby is Born">Baby is Born</option>
                  <option value="Expecting">Expecting</option>
                </select>
              </div>

              {/* Hospital Name */}
              <div className="form-group mb-3">
                <label className="form-label fw-semibold">Hospital Name</label>
                <select name="hospitalName" className="form-select" value={form.hospitalName} onChange={handleChange}>
                  <option value="">Select Hospital</option>
                  {HOSPITALS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Baby Birth Stage, Age, Weight — hidden when Expecting */}
              {form.babyStatus !== 'Expecting' && (
                <>
                  <div className="form-group mb-3">
                    <label className="form-label fw-semibold">Baby Birth Stage</label>
                    <select name="birthStageStatus" className="form-select" value={form.birthStageStatus} onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="Normal">Normal</option>
                      <option value="Preterm / Early birth">Preterm / Early birth</option>
                    </select>
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label fw-semibold">Baby Age</label>
                    <select name="babyAge" className="form-select" value={form.babyAge} onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="0-7 days">0–7 days</option>
                      <option value="1-2 weeks">1–2 weeks</option>
                      <option value="2-4 weeks">2–4 weeks</option>
                      <option value="1-2 months">1–2 months</option>
                      <option value="2-3 months">2–3 months</option>
                      <option value="3-6 months">3–6 months</option>
                    </select>
                  </div>

                  <div className="form-group mb-3">
                    <label className="form-label fw-semibold">Baby&apos;s Current Weight</label>
                    <select name="currentWeight" className="form-select" value={form.currentWeight} onChange={handleChange}>
                      <option value="">Select</option>
                      <option value="Below 2.0 kg">Below 2.0 kg</option>
                      <option value="2.0 - 2.5 kg">2.0 – 2.5 kg</option>
                      <option value="2.5 - 3.0 kg">2.5 – 3.0 kg</option>
                      <option value="3.0 - 3.5 kg">3.0 – 3.5 kg</option>
                      <option value="3.5 - 4.0 kg">3.5 – 4.0 kg</option>
                      <option value="Above 4.0 kg">Above 4.0 kg</option>
                    </select>
                  </div>
                </>
              )}

              {/* Address */}
              <div className="form-group mb-3">
                <label className="form-label fw-semibold">Current Address / Location*</label>
                <input type="text" name="address" className="form-control" required
                  placeholder="House no., street, area, city" value={form.address} onChange={handleChange} />
              </div>

              {/* Shift Type */}
              <div className="form-group mb-3">
                <label className="form-label fw-semibold">Shift Type*</label>
                <select name="shiftType" className="form-select" required value={form.shiftType} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              {/* Shift Hours — dynamic */}
              {shiftHoursOptions.length > 0 && (
                <div className="form-group mb-3">
                  <label className="form-label fw-semibold">Shift Hours*</label>
                  <select name="shiftHours" className="form-select" required value={form.shiftHours} onChange={handleChange}>
                    <option value="">Select</option>
                    {shiftHoursOptions.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              )}

              {/* Shift Time — dynamic */}
              {shiftTimeOptions.length > 0 && (
                <div className="form-group mb-3">
                  <label className="form-label fw-semibold">Shift Timing*</label>
                  <select name="shiftTime" className="form-select" required value={form.shiftTime} onChange={handleChange}>
                    <option value="">Select</option>
                    {shiftTimeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              {/* Care Start Date */}
              <div className="form-group mb-3">
                <label className="form-label fw-semibold">Care Start Date*</label>
                <input type="date" name="careStartDate" className="form-control" required
                  min={today} value={form.careStartDate} onChange={handleChange} />
              </div>

              {/* Service Days */}
              <div className="form-group mb-4">
                <label className="form-label fw-semibold">Service Duration*</label>
                <select name="serviceDays" className="form-select" required value={form.serviceDays} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="3 Day Trial">3 Day Trial</option>
                  <option value="30 Days">30 Days</option>
                  <option value="60 Days">60 Days</option>
                  <option value="Custom / Decide On Call">Custom / Decide On Call</option>
                </select>
              </div>

              <div className="d-grid">
                <button type="submit" className="btn btn-primary w-100 py-2" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Book Now'}
                </button>
              </div>

            </form>
          )}
        </Modal.Body>
      </Modal>
    </ModalContext.Provider>
  );
};
