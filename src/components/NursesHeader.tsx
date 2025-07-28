"use client";

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

// Define your routes
const routes = [
	{ name: "Why Choose Us", href: "#whychooseus" },
	{ name: "Responsibilities", href: "#responsibilities" },
	{ name: "Testimonials", href: "#nursetestimonials" },
	{ name: "How To Apply", href: "#howtoapply" },
];

const NavMenu = () => (
	<Nav className="mx-auto mb-2 mb-lg-0 mt-4 mt-lg-0 px-2">
		{routes.map((route) => (
			<Nav.Item key={route.name}>
				<Nav.Link href={route.href} className="nav-link-hover">
					{route.name}
				</Nav.Link>
			</Nav.Item>
		))}
	</Nav>
);

const NavActions = () => (
	<Nav className="flex-row mb-2 mb-lg-0">
		<Nav.Item className="nav-item mx-2">
			<a className="btn btn-primary" href="#ourplans">
				Apply Now To Join
			</a>
		</Nav.Item>
	</Nav>
);

const SearchForm = () => (
	<Form className="mt-4">
		<InputGroup>
			<Form.Control type="search" placeholder="City, Address, Zip" />
			<Button variant="" className="ezy__nav5-btn px-3" type="submit">
				Search
			</Button>
		</InputGroup>
	</Form>
);

const NurseHeader = () => {
	const [isSearchOpen, setIsSearchOpen] = useState(false);

	return (
		<div className="ezy__nav5 light">
			<Navbar expand="lg" className="flex-column py-3">
				<Container>
					<Navbar.Brand href="/">
						<img
							src="/images/logo.png"
							alt="Logo"
							width="200px"
							className="img-fluid"
						/>
					</Navbar.Brand>
					<Navbar.Toggle aria-controls="navbar-content" />
					<Navbar.Collapse id="navbar-content">
						<NavMenu />
						<NavActions />
					</Navbar.Collapse>
				</Container>

				<Container>
					<Collapse in={isSearchOpen} className="w-100">
						<div>
							<SearchForm />
						</div>
					</Collapse>
				</Container>
			</Navbar>
		</div>
	);
};

export default NurseHeader;
