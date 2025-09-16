'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Modal } from 'react-bootstrap';

type ModalContextType = {
  openModal: () => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextType>({
  openModal: () => {},
  closeModal: () => {},
});

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [showModal, setShowModal] = useState(false);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(() => {
        const dateInput = document.getElementById('start-date-field') as HTMLInputElement;
        if (dateInput) {
          const today = new Date().toISOString().split("T")[0];
          dateInput.min = today;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showModal]);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}

        <Modal show={showModal} onHide={closeModal} centered>
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
                       <option value='Care Plus (12 Hrs)'>Care Plus (12 Hrs)</option>
                       <option value='Care Max (24 Hrs)'>Care 360 (24 Hrs)</option>
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
                       <option value='15 Days'>15 Days</option>
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
                 </Modal>
    </ModalContext.Provider>
  );
};
