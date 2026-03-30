import HowToJoin from '@/NurseComponents/HowToJoin'
import NurseBanner from '@/NurseComponents/NurseBanner'
import NurseFaq from '@/NurseComponents/NurseFaq'
import NurseFounder from '@/NurseComponents/NurseFounder'
import RealNurses from '@/NurseComponents/RealNurses'
import WhatYouWillDo from '@/NurseComponents/WhatYouWillDo'
import WhyChooseCradlewell from '@/NurseComponents/WhyChooseCradlewell'
import WhyNurseSec from '@/NurseComponents/WhyNurseSec'
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Join Our Certified Nursing Team | Work From Home | Cradlewell Bangalore",
  description:
    "Join Cradlewell's certified nursing team providing home-based newborn and postnatal care across Bangalore. Flexible shifts, professional growth, and meaningful work. Apply as a nurse today.",
  alternates: {
    canonical: "https://www.cradlewell.com/nurses",
  },
};

export default function Nurses() {
  return (
    <>
    <NurseBanner/>
    <WhyNurseSec/>
    <WhyChooseCradlewell/>
    <WhatYouWillDo/>
    <RealNurses/>
    <HowToJoin/>
    <NurseFounder/>
    <NurseFaq/>
    </>
  )}