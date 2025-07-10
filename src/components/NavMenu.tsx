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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faShoppingCart } from "@fortawesome/free-solid-svg-icons";
import { FaBars } from "react-icons/fa";

// Route type
type Route = {
	name: string;
	href: string;
};

// NavMenu Props
type NavMenuProps = {
	routes: Route[];
	children?: React.ReactNode;
};

const routes: Route[] = [
	{ name: "Why Choose", href: "#" },
	{ name: "How It Works", href: "#" },
	{ name: "Our App", href: "#" },
	{ name: "Testimonials", href: "#" },
    { name: "Blogs", href: "#" },
];

const NavMenu: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
	<Nav className="mx-auto mb-2 mb-lg-0 mt-4 mt-lg-0 px-2">
		{children}
		{routes.map((route) => (
			<Nav.Item key={route.name}>
				<Nav.Link href={route.href}>{route.name}</Nav.Link>
			</Nav.Item>
		))}
	</Nav>
);


// NavMenu2 Props
type NavMenu2Props = {
	toggleSearch: () => void;
};

const NavMenu2: React.FC<NavMenu2Props> = ({ toggleSearch }) => (
	<Nav className="flex-row mb-2 mb-lg-0">
		<Nav.Item className="nav-item mt-2 px-2">
				<h6>See Plan</h6>
		</Nav.Item>
		<Nav.Item className="nav-item mx-2">
		   <a className="btn btn-primary"> Start Free Trial</a>
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

	const toggleSearch = () => setIsOpenSearch((prev) => !prev);

	return (
		<div className="ezy__nav5 light">
			<Navbar expand="lg" className="flex-column py-3">
				<Container>
					<Navbar.Brand href="#"><img src="/images/logo.png" alt="" /></Navbar.Brand>
					<Navbar.Toggle aria-controls="ezy__nav5-navbar-nav">
						<span>
							<span />
							<span />
							<span />
						</span>
					</Navbar.Toggle>
					<Navbar.Collapse id="ezy__nav5-navbar-nav">
						<NavMenu />
						<NavMenu2 toggleSearch={toggleSearch} />
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
