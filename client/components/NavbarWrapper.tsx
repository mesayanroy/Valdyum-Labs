'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function NavbarWrapper() {
  const pathname = usePathname();

  // Hide Navbar on specific pages
  const hideOn = ['/build', '/marketplace', '/trading', '/dashboard', '/workflow', '/agents'];
  if (hideOn.some(path => pathname?.startsWith(path))) {
    return null;
  }

  return <Navbar />;
}
