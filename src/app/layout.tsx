// src/app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { ReactNode } from 'react';
import LandingShell from '@/components/LandingShell';
import { Metadata } from 'next';

const BASE_URL = 'https://www.cradlewell.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Nurse-led Newborn & Postnatal Home Care – Trusted Support for Mothers & Baby in Bangalore",
    template: "%s | Cradlewell",
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

// ── Unified Organization Schema (H2 fix: MedicalOrganization + LocalBusiness merged under single @id) ──
const organizationSchema = {
  "@context": "https://schema.org",
  "@id": `${BASE_URL}/#organization`,
  "@type": ["MedicalOrganization", "LocalBusiness"],
  "name": "Cradlewell",
  "legalName": "Tenderkin Wellness Private Limited",
  "medicalSpecialty": "https://schema.org/Midwifery",
  "telephone": "+919363893639",
  "email": "care@cradlewell.com",
  "url": BASE_URL,
  "image": `${BASE_URL}/images/logo.png`,
  "logo": `${BASE_URL}/images/logo.png`,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Site No. 26, Laskar Hosur, Adugodi",
    "addressLocality": "Koramangala",
    "addressRegion": "Karnataka",
    "postalCode": "560030",
    "addressCountry": "IN",
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 12.9352,
    "longitude": 77.6245,
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      "opens": "00:00",
      "closes": "23:59",
    },
  ],
  "areaServed": [
    { "@type": "City", "name": "Bangalore" },
    { "@type": "Neighborhood", "name": "Koramangala" },
    { "@type": "Neighborhood", "name": "Indiranagar" },
    { "@type": "Neighborhood", "name": "Whitefield" },
    { "@type": "Neighborhood", "name": "HSR Layout" },
    { "@type": "Neighborhood", "name": "BTM Layout" },
    { "@type": "Neighborhood", "name": "Jayanagar" },
    { "@type": "Neighborhood", "name": "Sarjapur Road" },
    { "@type": "Neighborhood", "name": "Electronic City" },
    { "@type": "Neighborhood", "name": "Marathahalli" },
  ],
  // H1 fix: AggregateRating — update reviewCount to match actual on-site testimonials
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "28",
    "bestRating": "5",
    "worstRating": "1",
  },
  "award": "Entrepreneur India Startup Awards 2026",
  "hasCredential": [
    { "@type": "EducationalOccupationalCredential", "credentialCategory": "ISO 9001:2015" },
    { "@type": "EducationalOccupationalCredential", "credentialCategory": "ISO 27001:2022" },
  ],
  "sameAs": [
    "https://www.facebook.com/share/1HRDvZY1K3/?mibextid=wwXIfr",
    "https://x.com/cradle_well?s=11",
    "https://www.instagram.com/cradlewell_care?igsh=b3pkOHBxMTIyMGF4",
    "https://www.linkedin.com/company/cradlewell/",
  ],
};

// ── WebSite Schema ──
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Cradlewell",
  "url": BASE_URL,
  "potentialAction": {
    "@type": "SearchAction",
    "target": `${BASE_URL}/{search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

// ── Person Schemas (M6 fix: Physician type for doctors, Nurse type for nurses, worksFor @id reference) ──
const personSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Lokesh",
    "jobTitle": "CEO",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Chief Executive Officer and co-founder leading postpartum and newborn healthcare services at Cradlewell.",
    "image": `${BASE_URL}/images/lokesh.jpg`,
    "sameAs": ["https://www.linkedin.com/in/lokesh"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Venu Annareddy",
    "jobTitle": "CFO",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Chief Financial Officer and co-founder at Cradlewell.",
    "image": `${BASE_URL}/images/venu.jpg`,
    "sameAs": ["https://www.linkedin.com/in/venuannareddy"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Physician",
    "name": "Dr. Madhu Sudhan",
    "jobTitle": "COO",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Chief Operating Officer and Medical Doctor overseeing healthcare delivery for mothers and babies at Cradlewell.",
    "image": `${BASE_URL}/images/madhu.jpg`,
    "sameAs": ["https://www.linkedin.com/in/drmadhusudhan"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Physician",
    "name": "Dr. Vishnu Vardhan",
    "jobTitle": "CMO",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Chief Medical Officer specializing in postnatal and newborn care at Cradlewell.",
    "image": `${BASE_URL}/images/vishnu.jpg`,
    "sameAs": ["https://www.linkedin.com/in/drvishnuvardhan"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Nurse",
    "name": "Vijaya",
    "jobTitle": "Senior Nurse (Level III)",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Senior certified nurse with 25 years of experience in mother and newborn care at Cradlewell.",
    "image": `${BASE_URL}/team/vijaya.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "Nurse",
    "name": "Sneha Marcel",
    "jobTitle": "Senior Nurse (Level I)",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Senior certified nurse with experience in postnatal and newborn care.",
    "image": `${BASE_URL}/team/sneha.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "Nurse",
    "name": "Phelomit Lepcha",
    "jobTitle": "Nurse",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Certified nurse providing postnatal and newborn home care services.",
    "image": `${BASE_URL}/team/phelomit.png`,
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Pavithra",
    "jobTitle": "Yoga Consultant",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Yoga consultant with 15 years of experience in postnatal wellness and recovery.",
    "image": `${BASE_URL}/team/pavithra.jpg`,
  },
];

// ── BreadcrumbList Schema ──
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_URL}/` },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${BASE_URL}/blog` },
    { "@type": "ListItem", "position": 3, "name": "Join as Nurse", "item": `${BASE_URL}/nurses` },
    { "@type": "ListItem", "position": 4, "name": "Privacy Policy", "item": `${BASE_URL}/privacy-policy` },
  ],
};

// ── FAQPage Schema (M2 fix: enables FAQ rich results for healthcare sites) ──
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is postnatal home care and what does Cradlewell provide?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Postnatal home care is professional nursing support provided at your home after childbirth. Cradlewell sends certified, background-verified nurses directly to your home in Bangalore to support both mother and newborn. Services include newborn bathing, breastfeeding guidance, sleep training, postpartum recovery support, lactation consultation, vital signs monitoring, and daily health updates — all following ISO-certified care protocols.",
      },
    },
    {
      "@type": "Question",
      "name": "Is it safe to have a nurse at home for my newborn in Bangalore?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Every Cradlewell nurse undergoes thorough background verification, skill assessments, and in-person clinical training before being assigned to any home. Cradlewell is ISO 9001 and ISO 27001 certified, DPIIT recognized under Startup India, and registered with MCA — ensuring international quality and safety standards in every home visit.",
      },
    },
    {
      "@type": "Question",
      "name": "How much does postnatal home nursing care cost in Bangalore?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Cradlewell offers both Day Care (8-hour) and Night Care (9-hour) services with transparent pricing — no hidden charges. Pricing depends on the type and duration of care. Longer packages (30, 60, or 90 days) are more cost-effective. Contact us on WhatsApp at +91 9363893639 or book a free consultation call for an exact quote.",
      },
    },
    {
      "@type": "Question",
      "name": "What is the difference between a Cradlewell nurse and a japa maid or nanny?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A japa maid provides household help and basic baby care but has no medical training. A Cradlewell nurse is a certified healthcare professional trained in postnatal and neonatal care. Our nurses can monitor vital signs, identify early warning signs in both mother and baby, provide clinical breastfeeding support, manage umbilical cord care, and follow medically approved protocols.",
      },
    },
    {
      "@type": "Question",
      "name": "Can Cradlewell nurses help with C-section recovery at home?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Our nurses are trained to assist with C-section wound monitoring, postpartum hygiene, safe movement guidance, pain management support, and breastfeeding positions that avoid pressure on the incision area. They track recovery milestones and alert you immediately if any signs of infection or complications appear.",
      },
    },
    {
      "@type": "Question",
      "name": "Can your nurses help with breastfeeding problems and lactation support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Our nurses provide hands-on lactation guidance including correct latching techniques, feeding schedules, managing low milk supply, relieving engorgement, and identifying signs of mastitis early. We work closely with lactation consultants to ensure every mother gets the feeding support she needs.",
      },
    },
    {
      "@type": "Question",
      "name": "Can Cradlewell nurses monitor newborn jaundice at home?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Our nurses are trained to monitor jaundice levels through daily visual assessments, track feeding patterns and output, and identify when levels may require medical attention. We maintain close coordination with your pediatrician and escalate immediately if we observe any concerning signs.",
      },
    },
    {
      "@type": "Question",
      "name": "How soon can a nurse visit after hospital discharge in Bangalore?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Care can typically begin within 24-48 hours of booking confirmation. We recommend booking at least 1-2 weeks before your expected delivery date to secure your preferred time slot. For urgent post-discharge needs, contact us on WhatsApp at +91 9363893639 and we will do our best to arrange immediate support.",
      },
    },
    {
      "@type": "Question",
      "name": "Which areas in Bangalore does Cradlewell currently serve?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Cradlewell currently serves families across Bangalore including Koramangala, HSR Layout, Indiranagar, Whitefield, Bannerghatta Road, JP Nagar, Jayanagar, Electronic City, Marathahalli, Sarjapur Road, and surrounding areas. Contact us if you are outside our current coverage — we are expanding rapidly.",
      },
    },
    {
      "@type": "Question",
      "name": "How do I book a Cradlewell nurse and how quickly can care begin?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Booking takes less than 5 minutes. Book a free consultation call from our website, or chat on WhatsApp at +91 9363893639. During the consultation we understand your needs, recommend the right care plan, and confirm nurse availability. Care typically begins within 24-48 hours of booking confirmation.",
      },
    },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.png" />

        {/* H4 Performance: Preconnect to third-party origins to reduce TTFB */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Premium typography: Lexend (headings) + Source Sans 3 (body) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&family=Source+Sans+3:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />

        {/* H4 Performance: Preload hero image for LCP improvement */}
        <link rel="preload" as="image" href="/images/bannerimg.png" fetchPriority="high" />

        {/* Hide Zoho SalesIQ widget — replaced by AI chat */}
        <style>{`#zsiqwidget, .zsiq_flt_rel, .zsiq_theme1_float { display: none !important; }`}</style>

        {/* Google Site Verification */}
        <meta name="google-site-verification" content="8akbxzJkvsESfM46RB53TzV8NkmREJX7Q14wN4EJdhI" />

        {/* Font Awesome CDN */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />

        {/* Google Analytics (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-VX71D6T1WD"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-VX71D6T1WD');`,
          }}
        />

        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-P7VGGBDB');`,
          }}
        />

        {/* Meta Pixel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1065344801687565');fbq('track','PageView');`,
          }}
        />

        {/* SSR Schema — rendered server-side so AI crawlers and Googlebot see it in initial HTML */}

        {/* H2 fix: Unified MedicalOrganization + LocalBusiness under single @id with AggregateRating + areaServed */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />

        {/* WebSite schema with Sitelinks SearchBox */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />

        {/* M6 fix: Physician type for doctors, Nurse type for nurses, all referencing org @id */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchemas) }}
        />

        {/* BreadcrumbList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

        {/* M2 fix: FAQPage schema — enables FAQ rich results for healthcare sites */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P7VGGBDB"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>

        {/* Meta Pixel (noscript) */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1065344801687565&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>

        <LandingShell>{children}</LandingShell>
      </body>
    </html>
  );
}
