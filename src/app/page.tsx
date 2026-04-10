import type { Metadata } from 'next';
import BackgroundBox from "@/components/BackgroundBox";

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://www.cradlewell.com',
  },
};
import DarkBreakSection from "@/components/DarkBreakSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import FoundersCarousel from "@/components/FoundersCarousel";
import HeroBelow from "@/components/HeroBelow";
import HeroHeader1, { HeroHeaderShape } from "@/components/HeroHeaderShape";
import ModalController from "@/components/ModalController";
import PricingSection from "@/components/PricingSection";
import PromoTrialSection from "@/components/PromoTrialSection";
import StepsSection from "@/components/StepsSection";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import TestimonialsSection from "@/components/TestimonialsSection";
import TrustedByStrip from "@/components/TrustedByStrip";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function Home() {
  return (
    <>
      <HeroHeader1 />
      <HeroBelow />
      <BackgroundBox />
      <TrustedByStrip />
      <StepsSection />
      <PricingSection />
      <TestimonialsSection />
      <DarkBreakSection />
      <FoundersCarousel />
      <FAQSection />
      <PromoTrialSection />
      <WhatsAppWidget />
      <StickyMobileCTA />
    </>
  );
}
