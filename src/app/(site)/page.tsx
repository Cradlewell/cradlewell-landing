import type { Metadata } from 'next';
import BackgroundBox from "@/components/BackgroundBox";
import FAQSection from "@/components/FAQSection";
import HeroBelow from "@/components/HeroBelow";
import HeroHeader1 from "@/components/HeroHeaderShape";
import PricingSection from "@/components/PricingSection";
import PromoTrialSection from "@/components/PromoTrialSection";
import StepsSection from "@/components/StepsSection";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import TestimonialsSection from "@/components/TestimonialsSection";
import TrustedByStrip from "@/components/TrustedByStrip";
import { FAQS } from "@/content/faqs";
import { BASE_URL, pageOpenGraph } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: pageOpenGraph("/"),
};

// Structured data that belongs to the homepage only (it was on every page).
// The FAQ comes from the same list the FAQ section shows.
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

// The leadership and care team. People without a published photo have no image.
const personSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Lokesh",
    "jobTitle": "CEO",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Chief Executive Officer and co-founder leading postpartum and newborn healthcare services at Cradlewell.",
    "sameAs": ["https://www.linkedin.com/in/lokesh"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Venu Annareddy",
    "jobTitle": "CFO",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Chief Financial Officer and co-founder at Cradlewell.",
    "sameAs": ["https://www.linkedin.com/in/venuannareddy"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Physician",
    "name": "Dr. Madhu Sudhan",
    "jobTitle": "COO",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Chief Operating Officer and Medical Doctor overseeing healthcare delivery for mothers and babies at Cradlewell.",
    "sameAs": ["https://www.linkedin.com/in/drmadhusudhan"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Physician",
    "name": "Dr. Vishnu Vardhan",
    "jobTitle": "CMO",
    "worksFor": { "@id": `${BASE_URL}/#organization` },
    "description": "Chief Medical Officer specializing in postnatal and newborn care at Cradlewell.",
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

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchemas) }} />
      <HeroHeader1 />
      <HeroBelow />
      <BackgroundBox />
      <TrustedByStrip />
      <StepsSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <PromoTrialSection />
      <StickyMobileCTA />
    </>
  );
}
