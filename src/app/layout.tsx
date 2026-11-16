// src/app/layout.tsx
// Bootstrap and globals.css are imported by the (site) and operations layouts,
// not here, so the CRM is not affected by them.
// Tracking (Google Analytics, Tag Manager, Meta Pixel), SEO schema, site fonts and the
// site shell live in (site)/layout.tsx, so the CRM and Operations don't load them.
import { ReactNode } from 'react';
import { Metadata } from 'next';

const BASE_URL = 'https://www.cradlewell.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    // Brand only, by request — the tab should read "Cradlewell" and nothing else.
    // The descriptive positioning still reaches crawlers and social cards via the
    // description, openGraph.title and twitter.title below.
    default: "Cradlewell",
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
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: BASE_URL,
    siteName: 'Cradlewell',
    title: 'Nurse-led Newborn & Postnatal Home Care in Bangalore | Cradlewell',
    description:
      'Certified nurses deliver hospital-grade postnatal and newborn care at home in Bangalore. ISO 9001 & 27001 certified. Winner, Entrepreneur India Startup Awards 2026. Trusted by 100+ families.',
    images: [
      {
        url: `${BASE_URL}/images/bannerimg.png`,
        width: 1200,
        height: 630,
        alt: 'Cradlewell nurse-led newborn and postnatal home care Bangalore',
      },
    ],
  },
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
