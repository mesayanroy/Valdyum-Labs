'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';
import WalletConnect from '@/components/WalletConnect';
import gsap from 'gsap';

const BRAND_LOGO_SRC = '/brand/Valdyumlogo.png';

interface NavMenu {
  id: string;
  label: string;
  grid: boolean;
  items: string[];
  docsLinks?: Record<string, string>;
  isLink?: boolean;
  href?: string;
}

const navMenus: NavMenu[] = [
  {
    id: 'docs',
    label: 'Docs',
    grid: true,
    items: ['Quick Start', 'Architecture', 'Python SDK', 'CLI Reference'],
    docsLinks: {
      'Quick Start': '/docs#quickstart',
      'Architecture': '/docs#architecture',
      'Python SDK': '/docs#python-sdk',
      'CLI Reference': '/docs#cli',
    }
  },
  {
    id: 'dev',
    label: 'Dev',
    grid: true,
    items: ['CLI', 'Tooling', 'Template', 'Agents']
  },
  {
    id: 'org',
    label: 'Org',
    grid: false,
    items: ['Recruit', 'Security']
  },
  {
    id: 'faucet',
    label: 'Faucet',
    grid: true,
    items: ['RPC', 'Sol', 'URL']
  }
];

function NavDropdown({ menu, isOpen, isDarkHeroContext }: { menu: { grid: boolean; items: string[]; docsLinks?: Record<string, string> }, isOpen: boolean, isDarkHeroContext: boolean }) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dropdownRef.current) {
      if (isOpen) {
        gsap.to(dropdownRef.current, {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          duration: 0.4,
          ease: 'power3.out',
          overwrite: true,
          transformOrigin: 'top center'
        });
      } else {
        gsap.to(dropdownRef.current, {
          y: -10,
          autoAlpha: 0,
          scale: 0.96,
          duration: 0.3,
          ease: 'power2.inOut',
          overwrite: true
        });
      }
    }
  }, [isOpen]);

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.1)] border border-black/5 overflow-hidden p-2 invisible z-50"
      style={{ opacity: 0, transform: 'translateY(-10px) scale(0.96)', width: menu.grid ? '360px' : '220px' }}
    >
      <div className={menu.grid ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-1'}>
        {menu.items.map((item: string) => {
          const docHref = menu.docsLinks?.[item];
          return (
            <Link
              href={docHref || '#'}
              key={item}
              target={docHref ? '_blank' : undefined}
              rel={docHref ? 'noopener noreferrer' : undefined}
              className="flex flex-col justify-center p-3 rounded-xl hover:bg-[#fafafa] transition-colors group"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-sans text-[14px] font-medium text-[#111111] capitalize">{item}</span>
                {docHref ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="ml-2 opacity-40 group-hover:opacity-70 transition-opacity text-[#111]"><path d="M14 3h7v7h-2V6.41l-8.29 8.3-1.42-1.42L17.59 5H14V3zm-9 3h6V4H5c-1.11 0-2 .9-2 2v13c0 1.1.89 2 2 2h13c1.1 0 2-.9 2-2v-6h-2v6H5V6z"/></svg>
                ) : (
                  <span className="bg-[#799ee0]/15 text-[#799ee0] text-[9px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ml-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    Coming soon
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const isDarkHeroContext = pathname === '/' && !isScrolled;
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterMenu = (id: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setOpenDropdownId(id);
  };

  const handleMouseLeaveMenu = () => {
    hoverTimeout.current = setTimeout(() => {
      setOpenDropdownId(null);
    }, 150);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (pathname?.startsWith('/docs')) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Outer wrapper — always full width, handles top padding animation */}
      <div
        className="w-full flex justify-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          padding: isScrolled ? '14px 20px 0' : '0',
        }}
      >
        {/* Inner bar — morphs from flat full-width to floating card */}
        <div
          className="pointer-events-auto w-full relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            maxWidth: isScrolled ? '1100px' : '100%',
            padding: isScrolled ? '12px 28px' : '18px 40px',
            borderRadius: isScrolled ? '16px' : '0px',
            border: isScrolled ? '1px solid rgba(0, 0, 0, 0.07)' : '1px solid transparent',
            boxShadow: isScrolled
              ? '0 8px 32px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)'
              : 'none',
          }}
        >
          {/* Sibling Background layer for the blur */}
          <div
            className="absolute inset-0 transition-all duration-700 pointer-events-none -z-10"
            style={{
              borderRadius: isScrolled ? '16px' : '0px',
              background: isScrolled ? 'rgba(255, 255, 255, 0.88)' : 'transparent',
              backdropFilter: isScrolled ? 'blur(24px) saturate(180%)' : 'none',
              WebkitBackdropFilter: isScrolled ? 'blur(24px) saturate(180%)' : 'none',
            }}
          />

          <div className="flex items-center w-full relative z-10">
            {/* Logo */}
            <div className="flex-1 flex justify-start">
              <Link href="/" className="flex items-center group shrink-0 relative h-12 w-56">
                <Image
                  src={BRAND_LOGO_SRC}
                  alt="Valdyum logo"
                  fill
                  sizes="224px"
                  className={`object-contain object-left scale-[2] origin-left transition-all duration-300 ${isDarkHeroContext ? 'brightness-0 invert' : ''}`}
                  priority
                />
              </Link>
            </div>

            {/* Center Nav Links (Mega Menu) */}
            <div
              className="hidden lg:flex items-center justify-center gap-2 relative"
              onMouseLeave={handleMouseLeaveMenu}
            >
              {navMenus.map((menu) => {
                const isOpen = openDropdownId === menu.id;
                const linkColor = isDarkHeroContext
                  ? (isOpen ? 'text-white font-medium bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5')
                  : (isOpen ? 'text-[#111111] font-medium bg-black/5' : 'text-black/70 hover:text-[#111111] hover:bg-black/5');

                return (
                  <div
                    key={menu.id}
                    className="relative"
                    onMouseEnter={() => handleMouseEnterMenu(menu.id)}
                  >
                    {menu.isLink ? (
                      <Link
                        href={menu.href || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`relative z-10 px-4 py-2 rounded-full text-[14px] font-sans transition-all duration-300 whitespace-nowrap flex items-center gap-1.5 ${linkColor}`}
                      >
                        <span className="capitalize">{menu.label}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 opacity-60"><path d="M14 3h7v7h-2V6.41l-8.29 8.3-1.42-1.42L17.59 5H14V3zm-9 3h6V4H5c-1.11 0-2 .9-2 2v13c0 1.1.89 2 2 2h13c1.1 0 2-.9 2-2v-6h-2v6H5V6z"/></svg>
                      </Link>
                    ) : (
                      <>
                        <button
                          className={`relative z-10 px-4 py-2 rounded-full text-[14px] font-sans transition-all duration-300 whitespace-nowrap flex items-center gap-1.5 ${linkColor}`}
                        >
                          <span className="capitalize">{menu.label}</span>
                          <svg
                            width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"
                            className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                          >
                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <NavDropdown menu={menu} isOpen={isOpen} isDarkHeroContext={isDarkHeroContext} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Actions */}
            <div className="flex-1 flex justify-end items-center gap-3 shrink-0">
              <Link href="/build" aria-label="Start Building">
                <HoverBorderGradient
                  as="span"
                  containerClassName="cursor-pointer"
                  className={`whitespace-nowrap transition-colors duration-300 ${isDarkHeroContext ? 'bg-white text-black' : 'bg-[#111111] text-white'}`}
                >
                  Start Building
                </HoverBorderGradient>
              </Link>
              <WalletConnect />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
