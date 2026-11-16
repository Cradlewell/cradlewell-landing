// src/app/layout.tsx
// Bootstrap and globals.css are imported by the (site) layout, not here, so the
// CRM is not affected by them. Tracking, SEO schema, site fonts and the site
// shell also live in (site)/layout.tsx, so the CRM doesn't load them.
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { BASE_URL, defaultOpenGraph } from '@/lib/seo';


export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    // The homepage title is what search results show, so it says what the
    // site offers, not just the brand.
    default: "Nurse-led Newborn & Postnatal Home Care in Bangalore | Cradlewell",
    template: "%s - Cradlewell",
  },
  description:
    "Certified Nurses Deliver Hospital-grade Postnatal and Newborn Care in Bangalore, Right in Your Home. Trusted by New Mothers, Cradlewell Offers Baby Bathing, Feeding Support, Sleep Guidance, and Postpartum Recovery With Compassion and Expertise.",
  keywords:
    "Newborn Home Care Bangalore, postnatal Home Care Nurse, nurse-led Maternity Care, baby Care Services Bangalore, postnatal Recovery Support, certified Postpartum Nurse, mother and Baby Care, professional Newborn Care, hospital-grade Home Care, postpartum Health Bangalore",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  // Each page sets its own address; see pageOpenGraph in lib/seo.
  openGraph: defaultOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    title: 'Nurse-led Newborn & Postnatal Home Care in Bangalore | Cradlewell',
    description:
      'Certified nurses deliver hospital-grade postnatal and newborn care at home in Bangalore. ISO certified. Trusted by 100+ families.',
    images: [`${BASE_URL}/images/bannerimg.png`],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.png" />

        {/* Google Site Verification */}
        <meta name="google-site-verification" content="8akbxzJkvsESfM46RB53TzV8NkmREJX7Q14wN4EJdhI" />

      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
