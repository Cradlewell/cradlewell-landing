// src/app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { ReactNode } from 'react';
import '@fontsource/outfit'; // Defaults to weight 400
import NavMenu from '@/components/NavMenu';
import Footer from '@/components/Footer';
import Script from 'next/script';
import { headers } from 'next/headers';
import NurseHeader from '@/components/NursesHeader';
import LayoutClient from '@/components/LayoutClient';

export const metadata = {
  title: 'Nurse-led Newborn & Postnatal Home Care – Trusted Support for Mothers & Baby in Bangalore | Cradlewell',
  description: 'Certified Nurses Deliver Hospital-grade Postnatal and Newborn Care in Bangalore, Right in Your Home. Trusted by New Mothers, Cradlewell Offers Baby Bathing, Feeding Support, Sleep Guidance, and Postpartum Recovery With Compassion and Expertise. Book Your Personalized Care Plan Today for Peace of Mind and Professional Support.',
  other: {
    keywords:
      'Newborn Home Care Bangalore, postnatal Home Care Nurse, nurse-led Maternity Care, baby Care Services Bangalore, postnatal Recovery Support, certified Postpartum Nurse, mother and Baby Care, professional Newborn Care, hospital-grade Home Care, postpartum Health Bangalore',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.png" />

          {/* Google Site Verification */}
  <meta
    name="google-site-verification"
    content="8akbxzJkvsESfM46RB53TzV8NkmREJX7Q14wN4EJdhI"
  />
        
        {/* Font Awesome CDN */}
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          rel="stylesheet"
        />

        {/* Google Analytics (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-VX71D6T1WD"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-VX71D6T1WD');
            `,
          }}
        />

        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-P7VGGBDB');`,
          }}
        />

        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1065344801687565');
            fbq('track', 'PageView');`,
          }}
        />

        {/* ✅ Local Business Schema */}
        <Script id="local-business-schema" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Midwifery",
            "name": "Cradlewell",
            "image": "https://www.cradlewell.com/images/logo.png",
            "@id": "",
            "url": "https://www.cradlewell.com/",
            "telephone": "9363893639",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Site No. 26, Laskar Hosur, Adugodi, Koramangala",
              "addressLocality": "Bangalore South",
              "postalCode": "560030",
              "addressCountry": "IN"
            },
            "openingHoursSpecification": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday"
              ],
              "opens": "00:00",
              "closes": "23:59"
            },
            "sameAs": [
              "https://www.facebook.com/share/1HRDvZY1K3/?mibextid=wwXIfr",
              "https://x.com/cradle_well?s=11",
              "https://www.instagram.com/cradlewell_care?igsh=b3pkOHBxMTIyMGF4",
              "https://www.linkedin.com/company/cradlewell/"
            ]
          })}
        </Script>

        {/* ✅ Website Schema */}
        <Script id="website-schema" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "WebSite",
            "name": "Cradlewell",
            "url": "https://www.cradlewell.com/",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://www.cradlewell.com/{search_term_string}",
              "query-input": "required name=search_term_string"
            }
          })}
        </Script>

{/* 3️⃣ MedicalOrganization Schema */}
        <Script id="medical-organization-schema" type="application/ld+json" strategy="afterInteractive">
          {`
            {
              "@context": "https://schema.org",
              "@type": "MedicalOrganization",
              "name": "Cradlewell",
              "alternateName": "Nurse-led Newborn & Postnatal Home Care – Trusted Support for Mothers & Baby in Bangalore",
              "url": "https://www.cradlewell.com/",
              "logo": "https://www.cradlewell.com/images/logo.png",
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "9363893639",
                "contactType": "customer service",
                "areaServed": "IN",
                "availableLanguage": ["en","Hindi"]
              },
              "sameAs": [
                "https://www.facebook.com/share/1HRDvZY1K3/?mibextid=wwXIfr",
                "https://x.com/cradle_well?s=11",
                "https://www.instagram.com/cradlewell_care?igsh=b3pkOHBxMTIyMGF4",
                "https://www.linkedin.com/company/cradlewell/",
                "https://www.cradlewell.com/"
              ]
            }
          `}
        </Script>

        {/* 4️⃣ Person Schema */}
        <Script id="person-schema" type="application/ld+json" strategy="afterInteractive">
          {`
            [
              {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": "Lokesh",
                "jobTitle": "CEO",
                "affiliation": {
                  "@type": "Organization",
                  "name": "Cradlewell",
                  "url": "https://www.cradlewell.com/"
                },
                "description": "Chief Executive Officer leading postpartum and newborn healthcare services.",
                "image": "https://www.cradlewell.com/images/lokesh.jpg",
                "sameAs": [
                  "https://www.linkedin.com/in/lokesh",
                  "https://www.twitter.com/lokesh"
                ]
              },
              {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": "Venu Annareddy",
                "jobTitle": "CFO",
                "affiliation": {
                  "@type": "Organization",
                  "name": "Cradlewell",
                  "url": "https://www.cradlewell.com/"
                },
                "description": "Chief Financial Officer and co-founder.",
                "image": "https://www.cradlewell.com/images/venu.jpg",
                "sameAs": ["https://www.linkedin.com/in/venuannareddy"]
              },
              {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": "Dr. Madhu Sudhan",
                "jobTitle": "COO",
                "affiliation": {
                  "@type": "Organization",
                  "name": "Cradlewell",
                  "url": "https://www.cradlewell.com/"
                },
                "description": "Chief Operating Officer, overseeing healthcare delivery for mothers and babies.",
                "image": "https://www.cradlewell.com/images/madhu.jpg",
                "sameAs": ["https://www.linkedin.com/in/drmadhusudhan"]
              },
              {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": "Dr. Vishnu Vardhan",
                "jobTitle": "CMO",
                "affiliation": {
                  "@type": "Organization",
                  "name": "Cradlewell",
                  "url": "https://www.cradlewell.com/"
                },
                "description": "Chief Medical Officer specializing in postnatal and newborn care.",
                "image": "https://www.cradlewell.com/images/vishnu.jpg",
                "sameAs": ["https://www.linkedin.com/in/drvishnuvardhan"]
              },
              {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": "Vijaya",
                "jobTitle": "Senior Nurse (Level III)",
                "affiliation": {
                  "@type": "Organization",
                  "name": "Cradlewell",
                  "url": "https://www.cradlewell.com/"
                },
                "description": "Senior nurse with 25 years of experience in mother and newborn care.",
                "image": "https://www.cradlewell.com/images/vijaya.jpg"
              },
              {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": "Sneha Marcel",
                "jobTitle": "Senior Nurse (Level I)",
                "affiliation": {
                  "@type": "Organization",
                  "name": "Cradlewell",
                  "url": "https://www.cradlewell.com/"
                },
                "description": "Senior nurse with 3 years of experience.",
                "image": "https://www.cradlewell.com/images/sneha.jpg"
              },
              {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": "Phelomit Lepcha",
                "jobTitle": "Junior Nurse",
                "affiliation": {
                  "@type": "Organization",
                  "name": "Cradlewell",
                  "url": "https://www.cradlewell.com/"
                },
                "description": "Junior nurse with 1 year of experience.",
                "image": "https://www.cradlewell.com/images/phelomit.jpg"
              },
              {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": "Pavithra",
                "jobTitle": "Yoga Consultant",
                "affiliation": {
                  "@type": "Organization",
                  "name": "Cradlewell",
                  "url": "https://www.cradlewell.com/"
                },
                "description": "Yoga consultant with 15 years of experience.",
                "image": "https://www.cradlewell.com/images/pavithra.jpg"
              }
            ]
          `}
        </Script>

        {/* 5️⃣ Breadcrumb Schema */}
        <Script id="breadcrumb-schema" type="application/ld+json" strategy="afterInteractive">
          {`
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {"@type":"ListItem","position":1,"name":"Home","item":"https://www.cradlewell.com/"},
                {"@type":"ListItem","position":2,"name":"Care Plans","item":"https://www.cradlewell.com/care-plans"},
                {"@type":"ListItem","position":3,"name":"Care Light","item":"https://www.cradlewell.com/care-plans/care-light"},
                {"@type":"ListItem","position":4,"name":"Care Plus","item":"https://www.cradlewell.com/care-plans/care-plus"},
                {"@type":"ListItem","position":5,"name":"Care Max","item":"https://www.cradlewell.com/care-plans/care-max"},
                {"@type":"ListItem","position":6,"name":"Book Your Slot","item":"https://www.cradlewell.com/book-slot"},
                {"@type":"ListItem","position":7,"name":"Meet Our Team","item":"https://www.cradlewell.com/team"},
                {"@type":"ListItem","position":8,"name":"Testimonials","item":"https://www.cradlewell.com/testimonials"}
              ]
            }
          `}
        </Script>

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

        {/* Meta Pixel noscript */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1065344801687565&ev=PageView&noscript=1"
          />
        </noscript>

        {/* Conditional Header */}
        <LayoutClient />
        <main>{children}</main>
        <Footer />

        {/* Zoho SalesIQ Chatbot */}
        <Script id="zoho-salesiq" strategy="afterInteractive">
          {`
            window.$zoho = window.$zoho || {};
            $zoho.salesiq = $zoho.salesiq || {
              ready: function () { }
            };
          `}
        </Script>
        <Script
          id="zoho-salesiq-widget"
          src="https://salesiq.zohopublic.in/widget?wc=siqff2837401ef098932e99f42c34a99d5032abb5c8efb6ffe3506b63bde446afdf"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
