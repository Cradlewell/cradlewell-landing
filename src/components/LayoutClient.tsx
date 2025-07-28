// components/LayoutClient.tsx
'use client';

import { usePathname } from 'next/navigation';
import NavMenu from './NavMenu';
import NurseHeader from './NursesHeader';

export default function LayoutClient() {
  const pathname = usePathname();
  const isNursePage = pathname.startsWith('/nurses');

  return isNursePage ? <NurseHeader /> : <NavMenu />;
}
