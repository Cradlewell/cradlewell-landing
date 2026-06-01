'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Modal } from 'react-bootstrap';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

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

const STEPS = [
  { id: 1, title: 'About you',  hint: 'Just the basics — takes 30 seconds.' },
  { id: 2, title: 'About baby', hint: 'Helps us match the right caregiver.' },
  { id: 3, title: 'Schedule',   hint: 'When and how long do you need care?' },
];

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [step, setStep] = useState(1);

  const openModal = (service?: string) => {
    setForm(prev => ({ ...defaultForm, service: service ?? prev.service }));
    setSubmitted(false);
    setStep(1);
    setShowModal(true);
    if (typeof window !== 'undefined') {
      if ((window as any).fbq) (window as any).fbq('track', 'InitiateCheckout');
      if ((window as any).gtag) (window as any).gtag('event', 'begin_checkout', { event_category: 'modal' });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSubmitted(false);
    setStep(1);
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

  // Per-step validation — gates Next button
  const isStepValid = (s: number): boolean => {
    if (s === 1) {
      return !!form.name.trim() && /^[A-Za-z ]+$/.test(form.name) && /^[0-9]{10}$/.test(form.phone) && !!form.service;
    }
    if (s === 2) {
      return !!form.babyStatus && !!form.address.trim();
    }
    if (s === 3) {
      const hoursOk = getShiftHours(form.service, form.shiftType).length === 0 || !!form.shiftHours;
      const timeOk  = getShiftTimes(form.service, form.shiftType, form.shiftHours).length === 0 || !!form.shiftTime;
      return !!form.shiftType && hoursOk && timeOk && !!form.careStartDate && !!form.serviceDays;
    }
    return false;
  };

  const next = () => {
    if (isStepValid(step) && step < 3) setStep(step + 1);
  };

  const back = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid(3)) return;
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
      if (res.ok) {
        setSubmitted(true);
        if (typeof window !== 'undefined') {
          if ((window as any).fbq) {
            (window as any).fbq('track', 'Schedule');
            (window as any).fbq('track', 'Lead');
          }
          if ((window as any).gtag) {
            (window as any).gtag('event', 'schedule', { event_category: 'form', service: form.service });
            (window as any).gtag('event', 'generate_lead', { event_category: 'form' });
          }
        }
      } else alert('Something went wrong. Please try again.');
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const shiftHoursOptions = getShiftHours(form.service, form.shiftType);
  const shiftTimeOptions = getShiftTimes(form.service, form.shiftType, form.shiftHours);

  const current = STEPS[step - 1];

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}

      <Modal show={showModal} onHide={closeModal} centered size="lg" fullscreen="sm-down">
        <Modal.Header closeButton style={{ borderBottom: 'none', padding: '20px 24px 0' }}>
          <div style={{ width: '100%' }}>
            <Modal.Title style={{
              fontFamily: "'Lexend', system-ui, sans-serif",
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: 'var(--cw-text-primary)',
            }}>
              {submitted ? 'You’re booked' : 'Book your care'}
            </Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '78vh', overflowY: 'auto', padding: '8px 24px 24px' }}>
          {submitted ? (
            <div className="text-center" style={{ padding: '32px 0 12px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(34,197,94,0.10)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 18,
              }}>
                <Check size={28} strokeWidth={2.5} color="#16A34A" />
              </div>
              <h3 style={{
                fontFamily: "'Lexend', system-ui, sans-serif",
                fontSize: '1.2rem', fontWeight: 700,
                color: 'var(--cw-text-primary)', marginBottom: 8,
              }}>
                Thank you{form.name ? `, ${form.name.split(' ')[0]}` : ''}
              </h3>
              <p style={{ color: 'var(--cw-text-secondary)', fontSize: '0.95rem', maxWidth: 360, margin: '0 auto' }}>
                Our care team will call you within a few hours to confirm details and answer any questions.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              {/* Progress dots */}
              <div className="cw-step-progress" aria-label={`Step ${step} of ${STEPS.length}`}>
                {STEPS.map((s, idx) => {
                  const isDone = idx + 1 < step;
                  const isActive = idx + 1 === step;
                  return (
                    <div key={s.id} className="cw-step-dot-wrap">
                      <div
                        className={`cw-step-dot ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                        aria-current={isActive ? 'step' : undefined}
                      >
                        {isDone ? <Check size={12} strokeWidth={3} /> : idx + 1}
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div className={`cw-step-line ${isDone ? 'done' : ''}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step heading */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{
                  fontFamily: "'Lexend', system-ui, sans-serif",
                  fontSize: '1.05rem', fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--cw-text-primary)',
                  marginBottom: 4,
                }}>
                  {current.title}
                </h4>
                <p style={{ color: 'var(--cw-text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                  {current.hint}
                </p>
              </div>

              {/* Step 1 — About you */}
              {step === 1 && (
                <>
                  <div className="cw-field">
                    <label className="cw-field-label">Your name</label>
                    <input type="text" name="name" className="form-control" required
                      pattern="[A-Za-z ]+" title="Letters only"
                      placeholder="e.g. Priya Sharma"
                      autoComplete="name"
                      value={form.name} onChange={handleChange} />
                  </div>
                  <div className="cw-field">
                    <label className="cw-field-label">Phone number</label>
                    <input type="tel" name="phone" className="form-control" required
                      pattern="^[0-9]{10}$" title="10-digit number" maxLength={10}
                      placeholder="10-digit mobile"
                      autoComplete="tel"
                      value={form.phone} onChange={handleChange} />
                  </div>
                  <div className="cw-field">
                    <label className="cw-field-label">Which service are you looking for?</label>
                    <div className="cw-choice-grid">
                      {['Nurse Care', 'MOBA Care'].map(opt => (
                        <button
                          type="button"
                          key={opt}
                          className={`cw-choice ${form.service === opt ? 'selected' : ''}`}
                          onClick={() => setForm(prev => ({ ...prev, service: opt, shiftHours: '', shiftTime: '' }))}
                        >
                          <div className="cw-choice-title">{opt}</div>
                          <div className="cw-choice-sub">
                            {opt === 'Nurse Care' ? 'Clinical, hospital-grade' : 'Trained caregiver support'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Step 2 — About baby */}
              {step === 2 && (
                <>
                  <div className="cw-field">
                    <label className="cw-field-label">Is baby born or are you expecting?</label>
                    <div className="cw-choice-grid">
                      {['Baby is Born', 'Expecting'].map(opt => (
                        <button
                          type="button"
                          key={opt}
                          className={`cw-choice ${form.babyStatus === opt ? 'selected' : ''}`}
                          onClick={() => setForm(prev => ({ ...prev, babyStatus: opt }))}
                        >
                          <div className="cw-choice-title">{opt}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="cw-field">
                    <label className="cw-field-label">Hospital <span className="cw-field-optional">(optional)</span></label>
                    <select name="hospitalName" className="form-select" value={form.hospitalName} onChange={handleChange}>
                      <option value="">Select hospital</option>
                      {HOSPITALS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {form.babyStatus !== 'Expecting' && form.babyStatus !== '' && (
                    <>
                      <div className="cw-field">
                        <label className="cw-field-label">Birth stage <span className="cw-field-optional">(optional)</span></label>
                        <select name="birthStageStatus" className="form-select" value={form.birthStageStatus} onChange={handleChange}>
                          <option value="">Select</option>
                          <option value="Normal">Normal</option>
                          <option value="Preterm / Early birth">Preterm / Early birth</option>
                        </select>
                      </div>

                      <div className="cw-field cw-field-row">
                        <div style={{ flex: 1 }}>
                          <label className="cw-field-label">Baby&apos;s age <span className="cw-field-optional">(optional)</span></label>
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
                        <div style={{ flex: 1 }}>
                          <label className="cw-field-label">Weight <span className="cw-field-optional">(optional)</span></label>
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
                      </div>
                    </>
                  )}

                  <div className="cw-field">
                    <label className="cw-field-label">Your address</label>
                    <input type="text" name="address" className="form-control" required
                      placeholder="House no., street, area, city"
                      autoComplete="street-address"
                      value={form.address} onChange={handleChange} />
                  </div>
                </>
              )}

              {/* Step 3 — Schedule */}
              {step === 3 && (
                <>
                  <div className="cw-field">
                    <label className="cw-field-label">Day or night shift?</label>
                    <div className="cw-choice-grid">
                      {['Day', 'Night'].map(opt => (
                        <button
                          type="button"
                          key={opt}
                          className={`cw-choice ${form.shiftType === opt ? 'selected' : ''}`}
                          onClick={() => setForm(prev => ({ ...prev, shiftType: opt, shiftHours: '', shiftTime: '' }))}
                        >
                          <div className="cw-choice-title">{opt} shift</div>
                          <div className="cw-choice-sub">
                            {opt === 'Day' ? 'Support during waking hours' : 'Overnight care, you sleep'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {shiftHoursOptions.length > 0 && (
                    <div className="cw-field">
                      <label className="cw-field-label">Shift length</label>
                      <select name="shiftHours" className="form-select" required value={form.shiftHours} onChange={handleChange}>
                        <option value="">Select</option>
                        {shiftHoursOptions.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  )}

                  {shiftTimeOptions.length > 0 && (
                    <div className="cw-field">
                      <label className="cw-field-label">Preferred timing</label>
                      <select name="shiftTime" className="form-select" required value={form.shiftTime} onChange={handleChange}>
                        <option value="">Select</option>
                        {shiftTimeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="cw-field cw-field-row">
                    <div style={{ flex: 1 }}>
                      <label className="cw-field-label">Care start date</label>
                      <input type="date" name="careStartDate" className="form-control" required
                        min={today} value={form.careStartDate} onChange={handleChange} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="cw-field-label">Duration</label>
                      <select name="serviceDays" className="form-select" required value={form.serviceDays} onChange={handleChange}>
                        <option value="">Select</option>
                        <option value="3 Day Trial">3 Day Trial</option>
                        <option value="30 Days">30 Days</option>
                        <option value="60 Days">60 Days</option>
                        <option value="Custom / Decide On Call">Custom on call</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Step controls */}
              <div className="cw-step-controls">
                {step > 1 ? (
                  <button type="button" className="cw-btn-back" onClick={back}>
                    <ArrowLeft size={16} /> Back
                  </button>
                ) : <span />}

                {step < 3 ? (
                  <button
                    type="button"
                    className="cw-btn-next"
                    onClick={next}
                    disabled={!isStepValid(step)}
                  >
                    Continue <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="cw-btn-next cw-btn-submit"
                    disabled={submitting || !isStepValid(3)}
                  >
                    {submitting ? 'Submitting…' : 'Book free consultation'}
                  </button>
                )}
              </div>

              <p className="cw-step-trust">
                No commitment · We&apos;ll call to confirm · Your details stay private
              </p>
            </form>
          )}
        </Modal.Body>
      </Modal>
    </ModalContext.Provider>
  );
};
