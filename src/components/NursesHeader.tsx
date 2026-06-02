"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

const routes = [
	{ name: "Why join",        href: "#whychooseus" },
	{ name: "What you'll do",  href: "#responsibilities" },
	{ name: "Stories",         href: "#nursetestimonials" },
	{ name: "How to apply",    href: "#howtoapply" },
];

const APPLY_URL = "https://tally.so/r/3NGjb0";

const NurseHeader = () => {
	const [scrolled, setScrolled] = useState(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 4);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	useEffect(() => {
		if (open) document.body.style.overflow = 'hidden';
		else document.body.style.overflow = '';
		return () => { document.body.style.overflow = ''; };
	}, [open]);

	const closeMobile = () => setOpen(false);

	return (
		<header className={`cw-nav ${scrolled ? 'cw-nav-scrolled' : ''}`}>
			<div className="cw-nav-inner">
				<Link href="/" className="cw-nav-brand" aria-label="Cradlewell home">
					<img
						src="/images/logo.png"
						alt="Cradlewell — nurse-led newborn and postnatal home care, Bangalore"
						width={170}
						height={36}
					/>
				</Link>

				<nav className="cw-nav-links" aria-label="Primary">
					{routes.map((r) => (
						<a key={r.name} href={r.href} className="cw-nav-link">
							{r.name}
						</a>
					))}
				</nav>

				<div className="cw-nav-actions">
					<a
						href={APPLY_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="cw-nav-cta"
					>
						Apply now
						<ArrowRight size={14} strokeWidth={2.25} />
					</a>
				</div>

				<button
					type="button"
					className="cw-nav-toggle"
					onClick={() => setOpen(v => !v)}
					aria-label={open ? 'Close menu' : 'Open menu'}
					aria-expanded={open}
					aria-controls="cw-nurse-mobile-menu"
				>
					{open ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
				</button>
			</div>

			<div
				id="cw-nurse-mobile-menu"
				className={`cw-nav-sheet ${open ? 'is-open' : ''}`}
				aria-hidden={!open}
			>
				<nav aria-label="Primary mobile">
					{routes.map((r) => (
						<a key={r.name} href={r.href} className="cw-nav-sheet-link" onClick={closeMobile}>
							{r.name}
						</a>
					))}
				</nav>
				<div className="cw-nav-sheet-actions">
					<a
						href={APPLY_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="cw-nav-sheet-cta"
						onClick={closeMobile}
					>
						Apply now
						<ArrowRight size={15} strokeWidth={2.25} />
					</a>
				</div>
			</div>
		</header>
	);
};

export default NurseHeader;
