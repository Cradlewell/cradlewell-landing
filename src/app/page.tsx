import BackgroundBox from "@/components/BackgroundBox";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import FoundersCarousel from "@/components/FoundersCarousel";
import HeroBelow from "@/components/HeroBelow";
import HeroHeader1, { HeroHeaderShape } from "@/components/HeroHeaderShape";
import { ModalProvider } from "@/components/ModalContext";
import ModalController from "@/components/ModalController";
import NavMenu from "@/components/NavMenu";
import PricingSection from "@/components/PricingSection";
import PromoTrialSection from "@/components/PromoTrialSection";
import StepsSection from "@/components/StepsSection";
import TeamCarousel from "@/components/TeamCarousel";
import TestimonialsSection from "@/components/TestimonialsSection";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import '@fortawesome/fontawesome-free/css/all.min.css';


export default function Home() {
  return (
   <>
   {/* <NavMenu/> */}
  <ModalProvider>
    <HeroHeader1/>
    <HeroBelow/>
    <BackgroundBox/>
    <ModalController/>
    <StepsSection/>
    <TestimonialsSection/>
    <FoundersCarousel/>
    {/* <TeamCarousel/> */} 
    <FAQSection/>
    <PromoTrialSection/>
    <WhatsAppWidget/>
    {/* <Footer/> */}
  </ModalProvider>
    </>

  );
}
