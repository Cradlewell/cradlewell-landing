'use client';

import React from 'react';
import { Container } from 'react-bootstrap';
import Image from 'next/image';
import Link from 'next/link';
import { Phone, Mail, MapPin, ArrowRight } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaLinkedinIn } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { useModal } from './ModalContext';

type SocialIcon = React.ComponentType<{ size?: number; }>;

const socials: { Icon: SocialIcon; href: string; label: string }[] = [
  { Icon: FaFacebookF,   href: 'https://www.facebook.com/share/1HRDvZY1K3/?mibextid=wwXIfr',     label: 'Facebook'   },
  { Icon: FaInstagram,   href: 'https://www.instagram.com/cradlewell_care?igsh=b3pkOHBxMTIyMGF4', label: 'Instagram'  },
  { Icon: FaLinkedinIn,  href: 'https://www.linkedin.com/company/cradlewell/',                   label: 'LinkedIn'   },
  { Icon: FaXTwitter,    href: 'https://x.com/cradle_well?s=11',                                 label: 'X (Twitter)'},
];

const Footer = () => {
  const { openModal } = useModal();
  const year = new Date().getFullYear();

  return (
    <footer className="cw-footer">
      <Container>
        {/* Top: brand · contact · social */}
        <div className="cw-footer-grid">

          {/* Brand */}
          <div className="cw-footer-brand">
            <Image src="/images/logo2.png" alt="Cradlewell" width={170} height={38} priority={false} />
            <p className="cw-footer-tagline">
              Hospital-grade postnatal and newborn care, delivered at home in Bangalore. Your peace of mind is our priority.
            </p>
            <button onClick={() => openModal()} className="cw-footer-cta">
              Book Free Consultation
              <ArrowRight size={15} strokeWidth={2.25} />
            </button>
          </div>

          {/* Contact */}
          <div className="cw-footer-col">
            <h4 className="cw-footer-heading">Contact</h4>
            <ul className="cw-footer-list">
              <li>
                <MapPin size={15} strokeWidth={1.75} />
                <span>
                  Site No. 26, Laskar Hosur, Adugodi,<br />
                  Koramangala, Bangalore – 560030
                </span>
              </li>
              <li>
                <Phone size={15} strokeWidth={1.75} />
                <a href="tel:+919363893639">+91 9363893639</a>
              </li>
              <li>
                <Mail size={15} strokeWidth={1.75} />
                <a href="mailto:care@cradlewell.com">care@cradlewell.com</a>
              </li>
            </ul>
          </div>

          {/* Navigate */}
          <div className="cw-footer-col">
            <h4 className="cw-footer-heading">Explore</h4>
            <ul className="cw-footer-links">
              <li><a href="/#whychoose">Why Cradlewell</a></li>
              <li><a href="/#howitworks">How it works</a></li>
              <li><a href="/#ourplans">Care plans</a></li>
              <li><a href="/#testimonials">Reviews</a></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/nurses">Join as a nurse</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div className="cw-footer-col">
            <h4 className="cw-footer-heading">Follow</h4>
            <div className="cw-footer-socials">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="cw-footer-social"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="cw-footer-divider" />

        {/* Bottom: legal */}
        <div className="cw-footer-legal">
          <p>© {year} Tenderkin Wellness Private Limited · All rights reserved</p>
          <nav className="cw-footer-legal-links">
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms-conditions">Terms</Link>
            <button type="button" onClick={() => openModal()}>Support</button>
          </nav>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
