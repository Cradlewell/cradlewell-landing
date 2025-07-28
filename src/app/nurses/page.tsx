import HowToJoin from '@/NurseComponents/HowToJoin'
import NurseBanner from '@/NurseComponents/NurseBanner'
import NurseFaq from '@/NurseComponents/NurseFaq'
import NurseFounder from '@/NurseComponents/NurseFounder'
import RealNurses from '@/NurseComponents/RealNurses'
import WhatYouWillDo from '@/NurseComponents/WhatYouWillDo'
import WhyChooseCradlewell from '@/NurseComponents/WhyChooseCradlewell'
import WhyNurseSec from '@/NurseComponents/WhyNurseSec'
import Head from 'next/head'

export default function Nurses() {
  return (
    <>
    <Head>
        <title>Nurses | Cradlewell</title>
    </Head>
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