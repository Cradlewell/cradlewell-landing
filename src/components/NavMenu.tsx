'use client';

import React, { useEffect, useState } from "react";
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
			<a className="btn btn-primary" onClick={openModal}>
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

const Navigation5: React.FC = () => {
	const [isOpenSearch, setIsOpenSearch] = useState(false);
	const [showModal, setShowModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);

	const toggleSearch = () => setIsOpenSearch((prev) => !prev);
	const openModal = () => setShowModal(true);
	const closeModal = () => setShowModal(false);

  	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 0);
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

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

			{/* Free Trial Modal */}
			   <Modal show={showModal} onHide={closeModal} centered>
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
                                   <option value="10 AM - 12 PM">10 AM - 12 PM</option>
                                   <option value="12 PM - 4 PM">12 PM - 4 PM</option>
                                   <option value="4 PM - 8 PM">4 PM - 8 PM</option>
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
		</div>
	);
};

export default Navigation5;
