import type { ReactNode } from "react";
import Script from "next/script";
import { Lexend, Source_Sans_3 } from "next/font/google";
import LandingShell from "@/components/LandingShell";
// Bootstrap + site styles load only for the public site. The CRM has its own
// Tailwind design system, and
// Bootstrap's !important spacing utilities (px-3, gap-2…) would override it.
// Order matters: globals.css must come after Bootstrap so site styles win.
import "bootstrap/dist/css/bootstrap.min.css";
import "../globals.css";

// Everything below is for the public website only, so the CRM doesn't load
// tracking, SEO schema or the site fonts.
// React hoists the <link> tags into <head>; the scripts run where they are.

const BASE_URL = "https://www.cradlewell.com";

// Fonts are served from this site (no request to Google Fonts before the page
// can show text). Both are variable fonts: one file covers every weight.
const lexend = Lexend({ subsets: ["latin"], display: "swap" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], style: ["normal", "italic"], display: "swap" });

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
// (No SearchAction: the site has no search page for it to point at.)
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Cradlewell",
  "url": BASE_URL,
  "publisher": { "@id": `${BASE_URL}/#organization` },
};

// Marketing tags. Google Tag Manager loads GA4, the Google Ads tag and the
// Meta Pixel (with their page views), so they are not loaded separately here
// any more: that counted every page view twice. GTM and the Pixel library load
// once the page has finished loading, so they no longer compete with the page
// for the first seconds. The small stubs below are set up straight away, so
// events fired before then (form opens, leads) are queued, not lost.
const GTM_ID = "GTM-P7VGGBDB";
const META_PIXEL_ID = "1065344801687565";

const trackingStubs = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
!function(f){if(f.fbq)return;var n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window);
fbq('init','${META_PIXEL_ID}');`;

const loadTrackers = `(function(w,d){w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
function add(src){var s=d.createElement('script');s.async=true;s.src=src;d.head.appendChild(s);}
add('https://www.googletagmanager.com/gtm.js?id=${GTM_ID}');
add('https://connect.facebook.net/en_US/fbevents.js');})(window,document);`;

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Self-hosted fonts (next/font): the CSS refers to them through these variables */}
      <style>{`:root{--font-lexend:${lexend.style.fontFamily};--font-source-sans:${sourceSans.style.fontFamily};}`}</style>

      {/* Hide Zoho SalesIQ widget — replaced by AI chat */}
      <style>{`#zsiqwidget, .zsiq_flt_rel, .zsiq_theme1_float { display: none !important; }`}</style>

      <script dangerouslySetInnerHTML={{ __html: trackingStubs }} />
      <Script id="marketing-tags" strategy="lazyOnload">{loadTrackers}</Script>

      {/* SSR Schema — rendered server-side so crawlers see it in the initial HTML.
          Page-specific schema (FAQ, team, breadcrumbs, articles) lives on its own page. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      {/* Google Tag Manager (noscript) */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
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
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>

      <LandingShell>{children}</LandingShell>
    </>
  );
}
