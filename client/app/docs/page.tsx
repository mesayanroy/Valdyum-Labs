'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ReactLenis } from 'lenis/react';
import gsap from 'gsap';
import { SIDEBAR, SECTIONS } from './content';

/* ── tiny markdown-ish renderer ─────────────────────────────────────── */
function Md({ src, isDark }: { src: string; isDark: boolean }) {
  const d = isDark;
  const lines = src.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const inlineCode = (text: string) => {
    const parts = text.split(/`([^`]+)`/g);
    return parts.map((p, idx) =>
      idx % 2 === 1 ? (
        <code key={idx} className={`${d ? 'bg-white/10 text-[#799ee0]' : 'bg-black/5 text-[#799ee0]'} px-1.5 py-0.5 rounded text-[13px] font-mono`}>{p}</code>
      ) : (
        <span key={idx}>{boldItalic(p)}</span>
      )
    );
  };

  const boldItalic = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((p, idx) =>
      idx % 2 === 1 ? <strong key={idx} className={`font-semibold ${d ? 'text-white' : 'text-[#111]'}`}>{p}</strong> : p
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={key++} className={`rounded-xl overflow-hidden border my-4 ${d ? 'border-white/10' : 'border-black/10'}`}>
          {lang && <div className={`px-4 py-2 text-xs font-mono border-b ${d ? 'border-white/10 text-white/40 bg-[#0a0a0a]' : 'border-black/10 text-black/40 bg-gray-100'}`}>{lang}</div>}
          <div className={`p-5 font-mono text-[13px] leading-relaxed overflow-x-auto ${d ? 'bg-[#0d0d0d] text-white/80' : 'bg-[#111] text-white/90'}`}>
            <pre className="whitespace-pre">{codeLines.join('\n')}</pre>
          </div>
        </div>
      );
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1]?.includes('---')) {
      const headers = line.split('|').map(c => c.trim()).filter(Boolean);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(lines[i].split('|').map(c => c.trim()).filter(Boolean));
        i++;
      }
      elements.push(
        <div key={key++} className="overflow-x-auto my-4">
          <table className={`w-full text-[13px] border ${d ? 'border-white/10' : 'border-black/10'}`}>
            <thead>
              <tr className={d ? 'bg-white/[0.05]' : 'bg-black/[0.03]'}>
                {headers.map((h, hi) => (
                  <th key={hi} className={`text-left px-4 py-2.5 font-semibold border-b ${d ? 'border-white/10 text-white/80' : 'border-black/10 text-[#111]'}`}>{inlineCode(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={`${d ? 'border-white/5' : 'border-black/5'} border-b last:border-0`}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-4 py-2.5 ${d ? 'text-white/60' : 'text-black/60'}`}>{inlineCode(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Blockquote / Note
    if (line.startsWith('>')) {
      const text = line.slice(1).trim();
      elements.push(
        <div key={key++} className={`border-l-2 border-[#799ee0] pl-4 py-3 my-4 ${d ? 'bg-[#799ee0]/5' : 'bg-[#799ee0]/5'}`}>
          <p className={`text-[14px] leading-relaxed ${d ? 'text-white/70' : 'text-black/70'}`}>{inlineCode(text)}</p>
        </div>
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      const id = line.slice(3).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      elements.push(<h2 key={key++} id={id} className={`text-xl font-semibold mt-10 mb-4 scroll-mt-32 ${d ? 'text-white' : 'text-[#111]'}`}>{line.slice(3).trim()}</h2>);
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className={`text-base font-semibold mt-8 mb-3 ${d ? 'text-white/90' : 'text-[#111]'}`}>{line.slice(4).trim()}</h3>);
      i++;
      continue;
    }

    // Bullet
    if (line.startsWith('- ')) {
      const bullets: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        bullets.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className={`space-y-2 my-4 pl-5 list-disc ${d ? 'marker:text-white/30 text-white/60' : 'marker:text-black/30 text-black/60'} text-[14px] leading-relaxed`}>
          {bullets.map((b, bi) => <li key={bi}>{inlineCode(b)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className={`space-y-2 my-4 pl-5 list-decimal ${d ? 'marker:text-white/30 text-white/60' : 'marker:text-black/30 text-black/60'} text-[14px] leading-relaxed`}>
          {items.map((item, ii) => <li key={ii}>{inlineCode(item)}</li>)}
        </ol>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Paragraph
    elements.push(<p key={key++} className={`text-[15px] leading-relaxed my-3 ${d ? 'text-white/60' : 'text-black/60'}`}>{inlineCode(line)}</p>);
    i++;
  }

  return <>{elements}</>;
}

/* ── Icons ──────────────────────────────────────────────────────────── */
const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;

/* ── Page ───────────────────────────────────────────────────────────── */
export default function DocsPage() {
  const [activeTopic, setActiveTopic] = useState('welcome');
  const [isDark, setIsDark] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Read hash from URL on mount to open the right topic
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && SECTIONS[hash]) {
      setActiveTopic(hash);
    }
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(contentRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" });
    }
  }, [activeTopic]);

  const section = SECTIONS[activeTopic];
  const toc = useMemo(() => {
    if (!section) return [];
    const headings = section.content.split('\n').filter(l => l.startsWith('## ')).map(l => {
      const text = l.slice(3).trim();
      return { id: text.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: text };
    });
    return headings;
  }, [activeTopic, section]);

  if (!section) return null;

  return (
    <ReactLenis root options={{ smoothWheel: true, duration: 1.2 }}>
      <div className={`min-h-screen transition-colors duration-500 font-sans ${isDark ? 'bg-[#111111] text-white' : 'bg-[#fafafa] text-[#111]'}`}>

        {/* Navbar */}
        <nav className={`sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-colors duration-500 ${isDark ? 'border-white/[0.08] bg-[#111]/80' : 'border-black/[0.08] bg-[#fafafa]/80'}`}>
          <div className="flex h-[60px] items-center px-4 md:px-8">
            <Link href="/" className="flex items-center relative h-12 w-56 shrink-0 mr-4">
              <Image src="/brand/Valdyumlogo.png" alt="Valdyum" fill sizes="224px" className={`object-contain object-left scale-[2] origin-left ${isDark ? 'brightness-0 invert' : ''}`} priority />
            </Link>

            <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border flex-1 max-w-md transition-colors cursor-text ${isDark ? 'bg-[#1a1a1c] border-white/5 text-white/40' : 'bg-gray-50 border-black/5 text-black/40'}`}>
              <SearchIcon /><span className="text-[13px]">Search...</span>
              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-white/10 text-white/50' : 'bg-black/5 text-black/50'}`}>Ctrl K</span>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <button onClick={() => setIsDark(!isDark)} className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isDark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/5'}`} aria-label="Toggle dark mode">
                {isDark ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>}
              </button>
              <Link href="/" className={`text-[13px] font-semibold px-4 py-1.5 rounded-lg transition-colors ${isDark ? 'bg-[#799ee0] text-black hover:bg-white' : 'bg-[#111] text-white hover:bg-[#799ee0]'}`}>
                Launch App <span className="ml-0.5 opacity-60">›</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="flex max-w-[1400px] mx-auto relative">
          {/* Left Sidebar */}
          <aside data-lenis-prevent className={`hidden lg:block w-[260px] shrink-0 border-r h-[calc(100vh-60px)] sticky top-[60px] overflow-y-auto py-8 px-6 transition-colors duration-500 ${isDark ? 'border-white/[0.08]' : 'border-black/[0.08]'}`}
            style={{ scrollbarWidth: 'thin', scrollbarColor: isDark ? 'rgba(255,255,255,0.15) transparent' : 'rgba(0,0,0,0.15) transparent' }}>

            {SIDEBAR.map((group, gi) => (
              <div key={gi} className="mb-8">
                <h4 className={`font-semibold text-[13px] mb-3 ${isDark ? 'text-white' : 'text-[#111]'}`}>{group.category}</h4>
                <ul className="space-y-1 text-[14px]">
                  {group.items.map(item => (
                    <li key={item.id}>
                      <button onClick={() => { setActiveTopic(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`w-full text-left px-3 py-1.5 -ml-3 rounded-md transition-all duration-200 ${
                          activeTopic === item.id
                            ? (isDark ? 'text-white bg-white/[0.08] font-medium' : 'text-[#799ee0] bg-[#799ee0]/10 font-medium')
                            : (isDark ? 'text-white/60 hover:text-white hover:bg-white/[0.04]' : 'text-black/60 hover:text-[#111] hover:bg-black/5')
                        }`}>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 px-6 md:px-12 lg:px-20 py-12 lg:py-16 pb-32">
            <div className="max-w-[700px]" ref={contentRef}>
              <span className="font-semibold text-[13px] mb-3 block text-[#799ee0]">{section.category}</span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{section.title}</h1>
              <p className={`text-lg leading-relaxed mb-10 ${isDark ? 'text-white/60' : 'text-black/60'}`}>{section.subtitle}</p>
              <div className={`h-px w-full mb-10 ${isDark ? 'bg-white/[0.08]' : 'bg-black/[0.08]'}`} />
              <Md src={section.content} isDark={isDark} />
            </div>
          </main>

          {/* Right Sidebar */}
          <aside className="hidden xl:block w-[240px] shrink-0 h-[calc(100vh-60px)] sticky top-[60px] py-16 pr-8 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isDark ? 'text-white/40' : 'text-black/40'}><path d="M4 6h16M4 12h16M4 18h7"/></svg>
              <h4 className={`font-semibold text-[13px] ${isDark ? 'text-white' : 'text-[#111]'}`}>On this page</h4>
            </div>
            <ul className="space-y-3 text-[13px] pl-5 relative">
              <div className={`absolute left-0 top-0 bottom-0 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
              {toc.map((anchor, ai) => (
                <li key={anchor.id} className="relative">
                  {ai === 0 && <div className="absolute -left-[21px] top-0 bottom-0 w-0.5 bg-[#799ee0]" />}
                  <a href={`#${anchor.id}`} className={`block transition-colors ${ai === 0 ? 'text-[#799ee0]' : (isDark ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black')}`}>{anchor.label}</a>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </ReactLenis>
  );
}
