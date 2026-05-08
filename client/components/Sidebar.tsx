'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarLinks = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/marketplace',
    label: 'Marketplace',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    href: '/trading',
    label: 'Trading',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: '/agents',
    label: 'Own Agents',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: '/build',
    label: 'Build Agent',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  {
    href: '/workflow',
    label: 'Valdyum Workflow',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" />
        <rect x="3" y="16" width="5" height="5" rx="1" /><rect x="16" y="16" width="5" height="5" rx="1" />
        <line x1="8" y1="5.5" x2="16" y2="5.5" /><line x1="5.5" y1="8" x2="5.5" y2="16" />
        <line x1="18.5" y1="8" x2="18.5" y2="16" /><line x1="8" y1="18.5" x2="16" y2="18.5" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-16 bottom-0 z-40 w-56 bg-[rgba(18,12,8,0.95)] border-r border-[rgba(212,175,55,0.18)] flex flex-col py-6 px-3 overflow-y-auto">
      <p className="font-mono text-[10px] text-[#cbb38b] uppercase tracking-widest px-3 mb-3">Imperium</p>
      <nav className="flex flex-col gap-0.5">
        {sidebarLinks.map((link) => {
          const active = pathname ? pathname === link.href || pathname.startsWith(link.href + '/') : false;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono transition-all ${
                active
                  ? 'text-[#d4af37] bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.3)]'
                  : 'text-[#9c8871] hover:text-[#f5e7d1] hover:bg-[rgba(255,255,255,0.04)]'
              }`}
            >
              <span className={active ? 'text-[#d4af37]' : 'text-[#7c6a55]'}>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pt-6 border-t border-[rgba(255,255,255,0.04)]">
        <p className="font-mono text-[9px] text-[#7c6a55] leading-relaxed">
          Valdyum v0.2<br />
          Testnet · 0x402 Protocol
        </p>
      </div>
    </aside>
  );
}
