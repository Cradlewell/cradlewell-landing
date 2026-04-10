'use client';

import React, { useState } from "react";
import {
	Button,
	Collapse,
	Container,
	Form,
	InputGroup,
	Nav,
	Navbar,
} from "react-bootstrap";
import { FiPhoneCall } from "react-icons/fi";
import { useModal } from "./ModalContext";

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
			<a className="btn btn-primary" style={{ cursor: 'pointer' }} onClick={() => openModal()}>
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
	const [scrolled, setScrolled] = useState(false);
	const { openModal } = useModal();

	const toggleSearch = () => setIsOpenSearch((prev) => !prev);

	React.useEffect(() => {
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
		</div>
	);
};

export default Navigation5;
