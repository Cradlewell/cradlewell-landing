'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, Menu, X, ArrowRight } from "lucide-react";
import { useModal } from "./ModalContext";

type Route = { name: string; href: string };

const routes: Route[] = [
  { name: "Why Cradlewell", href: "/#whychoose" },
  { name: "How it works",   href: "/#howitworks" },
  { name: "Plans",          href: "/#ourplans" },
  { name: "Reviews",        href: "/#testimonials" },
  { name: "Team",           href: "/#ourteam" },
  { name: "Blog",           href: "/blog" },
];

const NavMenu: React.FC = () => {
  const { openModal } = useModal();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const closeMobile = () => setOpen(false);

  return (
    <header className={`cw-nav ${scrolled ? 'cw-nav-scrolled' : ''}`}>
      <div className="cw-nav-inner">
        {/* Brand */}
        <Link href="/" className="cw-nav-brand" aria-label="Cradlewell home">
          <img
            src="/images/logo.png"
            alt="Cradlewell — nurse-led newborn and postnatal home care, Bangalore"
            width={170}
            height={36}
          />
        </Link>

        {/* Desktop links */}
        <nav className="cw-nav-links" aria-label="Primary">
          {routes.map((r) => (
            <a key={r.name} href={r.href} className="cw-nav-link">
              {r.name}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="cw-nav-actions">
          <a href="tel:+919363893639" className="cw-nav-phone" aria-label="Call Cradlewell">
            <Phone size={14} strokeWidth={2} />
            <span>+91 93638 93639</span>
          </a>
          <button type="button" onClick={() => openModal()} className="cw-nav-cta">
            Book consultation
            <ArrowRight size={14} strokeWidth={2.25} />
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="cw-nav-toggle"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="cw-mobile-menu"
        >
          {open ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
        </button>
      </div>

      {/* Mobile sheet */}
      <div
        id="cw-mobile-menu"
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
          <a href="tel:+919363893639" className="cw-nav-sheet-phone" onClick={closeMobile}>
            <Phone size={15} strokeWidth={2} />
            +91 93638 93639
          </a>
          <button
            type="button"
            onClick={() => { closeMobile(); openModal(); }}
            className="cw-nav-sheet-cta"
          >
            Book consultation
            <ArrowRight size={15} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default NavMenu;
