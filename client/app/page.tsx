'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LiveFeed from '@/components/LiveFeed';
import ProtocolFlow from '@/components/ProtocolFlow';
import HeroSection from '@/components/sections/HeroSection';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
}

// ── Data ──────────────────────────────────────────────────────────────────────

const AGENT_TEMPLATES = [
  {
    icon: '⚡',
    title: 'MEV Bot',
    desc: 'Front-running & sandwich detection on Solana DEX order books with sub-500ms latency.',
    tag: 'HIGH FREQ',
    color: 'from-[#00FFE5]/10 to-transparent',
    border: 'border-[rgba(0,255,229,0.15)]',
    href: '/build?template=mev_bot',
    image: '/background/mev.png'
  },
  {
    icon: '🔺',
    title: 'Arbitrage Tracker',
    desc: 'Triangular & cross-path arbitrage across Solana DEX with automated execution.',
    tag: 'ARBITRAGE',
    color: 'from-[#7b61ff]/10 to-transparent',
    border: 'border-[rgba(123,97,255,0.15)]',
    href: '/build?template=arb_tracker',
    image: '/background/arbitrage.png'
  },
  {
    icon: '👁',
    title: 'Mempool Monitor',
    desc: 'Real-time Solana transaction stream analysis via RPC SSE with configurable alerts.',
    tag: 'MONITORING',
    color: 'from-[#f59e0b]/10 to-transparent',
    border: 'border-[rgba(245,158,11,0.15)]',
    href: '/build?template=mempool_monitor',
    image: '/background/mempool.png'
  },
  {
    icon: '📈',
    title: 'Trading Bot',
    desc: 'Buy / sell / short strategies with grid & DCA modes, stop-loss, and take-profit.',
    tag: 'TRADING',
    color: 'from-[#4ade80]/10 to-transparent',
    border: 'border-[rgba(74,222,128,0.15)]',
    href: '/build?template=trading_bot',
    image: '/background/trading bot.png'
  },
  {
    icon: '🔀',
    title: 'Relayer',
    desc: 'Fee-bump transaction relay with 0x402 micropayment charging. Gasless UX for end users.',
    tag: 'RELAY',
    color: 'from-[#f87171]/10 to-transparent',
    border: 'border-[rgba(248,113,113,0.15)]',
    href: '/build?template=relayer',
    image: '/background/relayer.png'
  },
  {
    icon: '💧',
    title: 'Liquidity Tracker',
    desc: 'Order-book depth analysis with real-time slippage simulation across configurable pairs.',
    tag: 'DEFI',
    color: 'from-[#38bdf8]/10 to-transparent',
    border: 'border-[rgba(56,189,248,0.15)]',
    href: '/build?template=liquidity_tracker',
    image: '/background/liquidity.png'
  },
];

const PROTOCOL_FEATURES = [
  {
    icon: '💳',
    title: '0x402 Protocol',
    desc: 'HTTP 402 pay-per-request. Every agent API call automatically handles the challenge → Solana payment → retry dance.',
    color: 'text-[#f59e0b]',
  },
  {
    icon: '🔀',
    title: 'QStash Pub-Sub',
    desc: 'All agent events stream through 8 Upstash QStash topics — payments, trades, chain events, billing.',
    color: 'text-[#4ade80]',
  },
  {
    icon: '⛓️',
    title: 'Anchor On-Chain',
    desc: 'Agent identities and earnings are anchored on Solana via Anchor smart contracts.',
    color: 'text-[#7b61ff]',
  },
  {
    icon: '🦀',
    title: 'Rust SDK',
    desc: 'Six production-grade agent templates in Rust — gas-optimised, async, fully typed.',
    color: 'text-[#00FFE5]',
  },
];

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.55, ease: 'easeOut' as const },
  }),
};
// ── Split-text hover helper ──────────────────────────────────────────────────

/** Ref callback: splits text into chars, adds scroll entrance + hover wave */
function splitTextRef(
  el: HTMLElement | null,
  opts?: { color?: string; hoverColor?: string; entrance?: boolean; delay?: number }
) {
  if (!el || el.dataset.split) return;
  el.dataset.split = 'true';
  const { color = '#111111', hoverColor = '#799ee0', entrance = true, delay = 0 } = opts || {};

  const text = el.textContent || '';
  el.innerHTML = '';
  text.split(' ').forEach((word, wordIdx, wordsArr) => {
    // Group characters in a nowrap span so words don't break across lines
    const wordSpan = document.createElement('span');
    wordSpan.style.display = 'inline-block';
    wordSpan.style.whiteSpace = 'nowrap';

    word.split('').forEach((char) => {
      const charSpan = document.createElement('span');
      charSpan.textContent = char;
      charSpan.className = 'char-split';
      charSpan.style.display = 'inline-block';
      charSpan.style.willChange = 'transform';
      wordSpan.appendChild(charSpan);
    });

    el.appendChild(wordSpan);

    if (wordIdx < wordsArr.length - 1) {
      const spaceSpan = document.createElement('span');
      spaceSpan.innerHTML = '\u00A0';
      spaceSpan.className = 'char-split';
      spaceSpan.style.display = 'inline-block';
      el.appendChild(spaceSpan);
    }
  });

  const chars = el.querySelectorAll('.char-split');

  if (entrance) {
    gsap.from(chars, {
      y: 50, opacity: 0, duration: 0.5, stagger: 0.03, delay,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' }
    });
  }

  el.addEventListener('mouseenter', () => {
    gsap.to(chars, { y: -6, color: hoverColor, duration: 0.2, stagger: 0.025, ease: 'power2.out' });
  });
  el.addEventListener('mouseleave', () => {
    gsap.to(chars, { y: 0, color, duration: 0.35, stagger: 0.02, ease: 'power2.inOut' });
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const transitionRef = useRef<HTMLDivElement>(null);
  const transitionOverlayRef = useRef<HTMLDivElement>(null);
  const transitionContentRef = useRef<HTMLDivElement>(null);

  // Initialize Lenis Smooth Scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0, 0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
    };
  }, []);

  // Initialize GSAP Horizontal Scroll & Global Snapping
  useGSAP(() => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container) return;

    let hasAnimated = false;
    // eslint-disable-next-line prefer-const
    let sdkAnim: gsap.core.Tween | null = null;

    // Master Timeline: Horizontal Scroll + Curtain Sweep + SDK Section Slide Up
    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "+=5000",
        scrub: 1,
        pin: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // Smooth entry and exit logic using independent tweens
          if (self.progress > 0.92 && !hasAnimated) {
            hasAnimated = true;

            // The elements we want to animate (must query them since we are in the scrollTrigger context)
            const content = document.querySelector('[data-anim="sdk-container"]');
            if (content) {
              const elements = [
                content.querySelector('[data-anim="sdk-image"]'),
                content.querySelector('[data-anim="sdk-heading"]'),
                content.querySelector('[data-anim="sdk-code"]')
              ];
              gsap.to(elements, {
                y: 0,
                autoAlpha: 1,
                scale: 1,
                duration: 0.9,
                ease: 'back.out(1.2)',
                stagger: 0.15,
                overwrite: true
              });
            }
          } else if (self.progress < 0.91 && hasAnimated) {
            hasAnimated = false;

            const content = document.querySelector('[data-anim="sdk-container"]');
            if (content) {
              const elements = [
                content.querySelector('[data-anim="sdk-image"]'),
                content.querySelector('[data-anim="sdk-heading"]'),
                content.querySelector('[data-anim="sdk-code"]')
              ];
              // Smooth, simultaneous fade-out (no stagger) so the left-side bust vanishes instantly
              gsap.to(elements, {
                y: 60,
                autoAlpha: 0,
                scale: 0.96,
                duration: 0.4,
                ease: 'power2.inOut',
                stagger: 0,
                overwrite: true
              });
            }
          }
        },
        snap: {
          snapTo: (progress) => {
            // Only snap the horizontal slides (0, 0.3, 0.6).
            // Leave the curtain wipe and SDK slide-up free from snapping.
            if (progress <= 0.65) {
              const points = [0, 0.3, 0.6];
              return points.reduce((prev, curr) =>
                Math.abs(curr - progress) < Math.abs(prev - progress) ? curr : prev
              );
            }
            return progress;
          },
          duration: { min: 0.2, max: 0.5 },
          delay: 0.1,
          ease: "power2.inOut",
        }
      }
    });

    // Phase 1: Horizontal Scroll (60% of timeline -> 3000px)
    masterTl.to(track, {
      x: () => -(window.innerWidth * 2),
      ease: "none",
      duration: 0.6
    });

    // Phase 2: Curtain Wipe (20% of timeline -> 1000px)
    const overlay = transitionOverlayRef.current;
    const content = transitionContentRef.current;

    if (overlay && content) {
      // Half-moon curved curtain wipe using clip-path
      gsap.set(overlay, {
        clipPath: 'circle(0% at 100% 50%)',
        backgroundColor: '#f2fbff',
        transform: 'none' // Override any inline styles
      });

      // Set container statically, we will animate the children directly to prevent nested transform jitter
      // Added data-anim attribute for the onUpdate query
      content.setAttribute('data-anim', 'sdk-container');
      gsap.set(content, { yPercent: 0, visibility: 'visible', opacity: 1 });

      // Reset the elements inside for a cool 'pop-in' entry animation later
      const sdkElements = [
        content.querySelector('[data-anim="sdk-image"]'),
        content.querySelector('[data-anim="sdk-heading"]'),
        content.querySelector('[data-anim="sdk-code"]')
      ];
      // Use autoAlpha to prevent invisible elements from catching pointer events
      gsap.set(sdkElements, { y: 150, autoAlpha: 0, scale: 0.96 });

      // Phase 2: Curved Curtain sweep covers the screen
      // Duration 0.40 consumes the rest of the scroll, ensuring maximum smoothness
      masterTl.to(overlay, {
        clipPath: 'circle(150% at 100% 50%)',
        ease: 'none',
        duration: 0.40
      }, 0.6);

      // Removed the physical content slide-up (Phase 3) as the time-based pop-in is much smoother
      // and nested scrubbed transforms cause jitter.
    }

    // Custom Cursor tracking
    const cursor = document.getElementById('custom-cursor');
    const moveCursor = (e: MouseEvent) => {
      if (cursor) {
        gsap.to(cursor, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.15,
          ease: 'power2.out'
        });
      }
    };
    window.addEventListener('mousemove', moveCursor);

    // 3. Global Vertical Snapping
    const sections = gsap.utils.toArray<HTMLElement>('section');
    if (sections.length === 0) return;

    let snapPoints: number[] = [];
    let horizStart = 0;
    let horizEnd = 0;
    // eslint-disable-next-line prefer-const
    let transStart = 0;
    // eslint-disable-next-line prefer-const
    let transEnd = 0;

    const calculateSnapPoints = () => {
      const maxScroll = ScrollTrigger.maxScroll(window);
      if (maxScroll === 0) return;

      snapPoints = sections.map((sec) => {
        const st = ScrollTrigger.create({ trigger: sec, start: 'top top' });
        const startPos = st.start;
        st.kill();
        return startPos / maxScroll;
      });

      // Map out the horizontal + transition section boundaries to prevent vertical snapping inside it
      const horizSt = ScrollTrigger.create({ trigger: container, start: 'top top' });
      horizStart = horizSt.start / maxScroll;
      horizEnd = (horizSt.start + 5000) / maxScroll;
      horizSt.kill();
    };

    ScrollTrigger.addEventListener('refresh', calculateSnapPoints);
    calculateSnapPoints();

    ScrollTrigger.create({
      start: 0,
      end: 'max',
      snap: {
        snapTo: (progress) => {
          if (snapPoints.length === 0) return progress;

          // Disable global vertical snap when inside the horizontal/transition area
          if (progress > horizStart + 0.005 && progress < horizEnd - 0.005) {
            return progress;
          }

          // Disable snap when scrolling into the footer (past the last section)
          const lastSnapPoint = Math.max(...snapPoints);
          if (progress > lastSnapPoint + 0.01) {
            return progress;
          }

          return snapPoints.reduce((prev, curr) =>
            Math.abs(curr - progress) < Math.abs(prev - progress) ? curr : prev
          );
        },
        duration: { min: 0.2, max: 0.6 },
        delay: 0.15,
        ease: 'power1.inOut',
      },
    });

    return () => {
      ScrollTrigger.removeEventListener('refresh', calculateSnapPoints);
      window.removeEventListener('mousemove', moveCursor);
    };
  });

  return (
    <div className="min-h-screen bg-[#f2fbff] text-[#111111] overflow-x-hidden cursor-none">
      {/* Custom Cursor */}
      <div
        id="custom-cursor"
        className="fixed top-0 left-0 w-2.5 h-2.5 bg-white rounded-full pointer-events-none z-[999] mix-blend-difference"
        style={{ transform: 'translate(-50%, -50%)' }}
      />

      <HeroSection />

      {/* ── MASTER HORIZONTAL SCROLL SECTION ────── */}
      <section ref={containerRef} className="relative w-full h-[100svh] bg-[#f2fbff] z-10 overflow-hidden">
        <div ref={trackRef} className="flex h-full w-[300vw] will-change-transform">

          {/* SLIDE 1: The Problem (100vw) */}
          <div className="w-screen h-[100svh] flex-shrink-0 flex flex-col px-6 lg:px-12 relative overflow-hidden">

            {/* Background Video */}
            <video
              className="absolute inset-0 h-full w-full object-cover z-0"
              autoPlay
              muted
              loop
              playsInline
            >
              <source src="/background/BackgroundVideooo.mp4" type="video/mp4" />
            </video>

            {/* Dark overlay to ensure text contrast against bright video areas */}
            <div className="absolute inset-0 z-[1]" style={{
              background: 'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.3) 100%)'
            }} />

            {/* Content Layer */}
            <div className="relative w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 lg:gap-24 items-center h-full pt-24 pb-8 z-10">

              {/* Left Column: Headline */}
              <div className="lg:w-1/2 flex flex-col justify-center h-auto lg:h-full pt-8 lg:pt-0 pl-4 lg:pl-12 shrink-0">
                <div className="flex items-center gap-4 mb-8">
                  <span className="h-[1px] w-8 bg-white/30" />
                  <span className="font-sans text-xs font-semibold tracking-widest text-white/50 uppercase">The Problem</span>
                </div>
                <h2 className="font-sans font-medium tracking-tighter text-white leading-[0.9] cursor-default" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)' }}>
                  <span ref={(el) => splitTextRef(el, { color: '#ffffff', hoverColor: '#799ee0' })}>The old world</span>
                  <br />
                  <span className="text-white/90" ref={(el) => splitTextRef(el, { color: 'rgba(255,255,255,0.9)', hoverColor: '#799ee0', delay: 0.12 })}>is broken.</span>
                </h2>
                <div className="mt-12 xl:mt-20 hidden lg:block">
                  <p className="text-xl font-medium text-white/90 leading-relaxed italic max-w-md">
                    &quot;Every developer starting from zero. Every edge dying in isolation.&quot;
                  </p>
                </div>
              </div>

              {/* Right Column: 3 Items */}
              <div className="lg:w-1/2 flex flex-col justify-center gap-6 md:gap-8 pr-4 lg:pr-12 flex-1 min-h-0 overflow-y-auto py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {[
                  {
                    num: 'I',
                    title: 'NO VERIFIABLE HISTORY',
                    desc: 'Agents have no permanent, auditable record of what they&lsquo;ve done.'
                  },
                  {
                    num: 'II',
                    title: 'NO STRATEGY PRIVACY',
                    desc: 'Strategies are exposed and can&rsquo;t be protected.'
                  },
                  {
                    num: 'III',
                    title: 'NO MONETIZATION LAYER',
                    desc: 'No way to earn from the agents you build.'
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 md:gap-6 items-start group cursor-default p-2 lg:p-4 transition-all duration-300">
                    <span className="font-mono text-xl md:text-2xl text-white/30 group-hover:text-white transition-colors duration-500 font-semibold tracking-widest mt-1 w-10 md:w-14 shrink-0">{item.num}</span>
                    <div className="flex-1">
                      <h3 className="font-sans text-xl md:text-2xl font-medium text-white group-hover:text-[#799ee0] transition-colors duration-500 mb-2 tracking-tight">{item.title}</h3>
                      <p className="font-sans text-base text-white/60 leading-relaxed max-w-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}

                <div className="mt-4 lg:hidden block">
                  <p className="text-lg font-medium text-white/50 leading-relaxed italic">
                    &quot;Every developer starting from zero. Every edge dying in isolation.&quot;
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* SLIDE 2: 0x402 Core Architecture */}
          <div className="w-screen h-[100svh] flex-shrink-0 flex flex-col px-4 md:px-8 lg:px-12 relative overflow-hidden">
            {/* Background image */}
            <img
              src="/background/slide2.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 0 }}
            />

            <div className="w-full h-full max-w-[1400px] mx-auto flex flex-col px-6 lg:px-12 pt-16 lg:pt-20 pb-8 relative" style={{ zIndex: 2 }}>

              {/* HEADER ROW: Label + Headline (left) + Description (right) */}
              <div className="shrink-0 mb-3 lg:mb-4 max-w-5xl w-full">
                {/* Section label */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="h-[1px] w-10 bg-[#2a2218]/25" />
                  <span className="font-mono text-xs font-medium text-[#2a2218]/50 tracking-[0.2em] uppercase" style={{ textShadow: '0 1px 8px rgba(255,255,255,0.6)' }}>
                    Core Architecture
                  </span>
                </div>

                {/* Headline + Description side by side */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-12">
                  <h2 className="font-sans font-medium tracking-tight text-[#2a2218] leading-[0.92] cursor-default" style={{ fontSize: 'clamp(2.8rem, 5.5vw, 6rem)', textShadow: '0 2px 16px rgba(255,255,255,0.7)' }}>
                    <span ref={(el) => splitTextRef(el, { color: '#2a2218' })}>0x402 × QStash</span>
                    <br />
                    <span ref={(el) => splitTextRef(el, { color: 'rgba(42,34,24,0.35)', delay: 0.1 })}>× Solana.</span>
                  </h2>
                  <p className="lg:max-w-sm text-base lg:text-lg font-medium text-[#2a2218]/60 leading-relaxed pb-1 shrink-0" style={{ textShadow: '0 1px 10px rgba(255,255,255,0.6)' }}>
                    The complete payment-to-execution pipeline powering every agent interaction.
                    Gasless UX, fully verified, all on-chain.
                  </p>
                </div>
              </div>

              {/* MAIN CARD: Frosted glass style */}
              <div className="relative flex flex-col lg:flex-row overflow-hidden rounded-3xl flex-1 min-h-0 max-w-5xl mr-auto w-full"
                style={{
                  background: 'rgba(255, 252, 247, 0.82)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(194, 170, 130, 0.35)',
                }}
              >

                {/* Content - Pushed to the right visually */}
                <div className="p-4 md:p-5 lg:p-6 flex flex-col justify-center lg:w-[45%] relative z-10 overflow-y-auto ml-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="font-mono text-[10px] md:text-[11px] text-[#b8a070] mb-2 tracking-[0.2em]">01</div>

                  <h3 className="font-sans text-2xl md:text-3xl font-medium mb-2 tracking-tight text-[#2a2218] leading-tight cursor-default">
                    <span ref={(el) => splitTextRef(el, { color: '#2a2218' })}>Execution</span>
                    <br />
                    <span ref={(el) => splitTextRef(el, { color: '#2a2218', delay: 0.1 })}>Pipeline.</span>
                  </h3>

                  <p className="font-sans text-xs md:text-sm text-[#2a2218]/50 mb-4 max-w-sm leading-snug">
                    Five core components orchestrate the lifecycle of an agent. From the initial
                    HTTP 402 challenge, to Solana payment verification, to QStash event broadcasting.
                  </p>

                  <div className="flex flex-col gap-1.5 md:gap-2">
                    {[
                      { title: 'Agent SDK', desc: 'Rust / 0x402 client' },
                      { title: '0x402 Protocol', desc: 'HTTP 402 → Solana TX' },
                      { title: 'Platform API', desc: 'Next.js · Anchor verify' },
                      { title: 'QStash Pub-Sub', desc: 'Upstash · 8 topics' },
                      { title: 'Dashboard', desc: 'Real-time · Ably' },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-2 md:gap-3">
                        <span className="text-[#b8a070] text-[10px] shrink-0">✦</span>
                        <span className="font-sans font-semibold text-[#2a2218] text-xs md:text-sm">{step.title}</span>
                        <span className="font-sans text-xs md:text-sm text-[#2a2218]/30">—</span>
                        <span className="font-sans text-xs md:text-sm text-[#2a2218]/50">{step.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vertical divider */}
                <div className="hidden lg:block absolute right-[45%] top-8 bottom-8 w-px bg-[#c2aa82]/25" style={{ zIndex: 10 }} />

                {/* Image - Pushed to the left visually with right-fade mask */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-full lg:w-[60%] pointer-events-none"
                  style={{
                    maskImage: 'linear-gradient(to left, transparent 0%, black 30%)',
                    WebkitMaskImage: 'linear-gradient(to left, transparent 0%, black 30%)'
                  }}
                >
                  <img
                    src="/background/0x402.png"
                    alt="0x402 Architecture"
                    className="w-full h-full object-cover object-[15%_center]"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* SLIDE 3: The Legion */}
          <div className="w-screen h-[100svh] flex-shrink-0 flex flex-col px-6 lg:px-12 relative overflow-hidden pb-12 lg:pb-0">
            {/* Background image */}
            <img
              src="/background/slide3.png"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 0 }}
            />

            <div className="w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row-reverse gap-8 lg:gap-16 items-center h-full pt-24 pb-8 relative z-10">

              {/* Right Column (Visually): Headline */}
              <div className="lg:w-[35%] flex flex-col justify-center h-auto lg:h-full pt-8 lg:pt-0 lg:pl-8 relative shrink-0">
                {/* Ultra-soft white circular glow to ensure text readability without hard edges */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[130%] bg-white/50 rounded-full blur-[100px] pointer-events-none z-0" />

                <div className="relative z-10 flex flex-col">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="h-[1px] w-8 bg-black/30" />
                    <span className="font-sans text-sm font-medium text-black/50">The Legion</span>
                  </div>
                  <h2 className="font-sans font-medium tracking-tight text-[#111111] leading-[0.9] cursor-default" style={{ fontSize: 'clamp(3rem, 6vw, 7rem)' }}>
                    <span ref={(el) => splitTextRef(el)}>Build.</span>
                    <br />
                    <span ref={(el) => splitTextRef(el, { delay: 0.1 })}>Deploy.</span>
                    <br />
                    <span ref={(el) => splitTextRef(el, { delay: 0.2 })}>Earn.</span>
                  </h2>
                  <p className="mt-6 xl:mt-8 text-sm md:text-base xl:text-lg font-medium text-[#111111]/70 leading-relaxed max-w-sm">
                    Six production-grade Rust agents ready to be deployed. Complete with 0x402 billing, gas optimization, and on-chain intelligence.
                  </p>
                </div>
              </div>

              {/* Left Column (Visually): Bento Grid */}
              <div className="lg:w-[65%] w-full relative lg:pt-4 flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] lg:pr-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 xl:gap-5 w-full pb-8" style={{ gridAutoRows: 'minmax(180px, 1fr)' }}>
                  {AGENT_TEMPLATES.map((tmpl, i) => {
                    let bentoClass = "col-span-1 row-span-1 flex-col justify-between p-5 md:p-6";
                    if (i === 0) {
                      bentoClass = "col-span-1 md:col-span-2 md:row-span-2 flex-col justify-between p-6 md:p-8";
                    }

                    return (
                      <Link
                        key={tmpl.title}
                        href={tmpl.href}
                        className={`relative overflow-hidden border border-[#111111] bg-white hover:shadow-[0_15px_40px_rgba(0,0,0,0.06)] rounded-[20px] flex transition-all duration-500 group z-10 ${bentoClass}`}
                      >
                        {/* Background Image overlay */}
                        <div 
                          className="absolute right-0 bottom-0 z-0 pointer-events-none transition-transform duration-700 group-hover:scale-[1.03]" 
                          style={{ width: i === 0 || i === 1 ? '100%' : '65%', height: '100%' }}
                        >
                          <img 
                            src={tmpl.image} 
                            alt={tmpl.title} 
                            className={`w-full h-full mix-blend-multiply ${
                              i === 0 ? 'object-contain object-right-bottom scale-[1.25] translate-x-[2%] translate-y-[10%] opacity-[0.65]' : 
                              i === 1 ? 'object-contain object-right-bottom scale-[1.3] translate-x-[5%] translate-y-[15%] opacity-[0.65]' : 
                              'object-contain object-bottom opacity-[0.85]'
                            }`}
                          />
                        </div>

                        {i === 0 ? (
                          <>
                            <div className="flex items-center justify-between w-full relative z-10">
                              <div className="w-2.5 h-2.5 bg-[#111111] group-hover:bg-[#799ee0] transition-colors duration-500 rounded-[1px]" />
                              <span className="font-mono text-xl font-medium text-black/20 tracking-wider">01</span>
                            </div>
                            <div className="mt-auto relative z-10 max-w-[70%]">
                              <span className="font-sans text-[10px] md:text-[11px] font-semibold text-black/40 tracking-wider uppercase mb-2 block">{tmpl.tag}</span>
                              <h3 className="font-sans text-3xl md:text-4xl font-medium text-[#111111] group-hover:text-[#799ee0] transition-colors duration-500 mb-3 tracking-tight">{tmpl.title}</h3>
                              <p className="font-sans text-sm md:text-base text-black/60 leading-relaxed max-w-sm">{tmpl.desc}</p>

                              <div className="mt-6 pt-5 border-t border-black/5 flex items-center gap-2">
                                <span className="font-sans text-[10px] md:text-xs font-semibold tracking-wide uppercase text-black/30 group-hover:text-[#799ee0] transition-colors duration-500">Deploy Template</span>
                                <span className="text-black/30 group-hover:text-[#799ee0] transition-colors transform group-hover:translate-x-1 duration-500">→</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between w-full mb-4 relative z-10">
                              <div className="w-1.5 h-1.5 bg-[#111111]/30 group-hover:bg-[#799ee0] transition-colors duration-500 rounded-[1px]" />
                              <span className="font-mono text-[10px] font-medium text-black/20 tracking-wider">0{i + 1}</span>
                            </div>
                            <div className="mt-auto relative z-10 max-w-[90%]">
                              <h3 className="font-sans text-base md:text-lg font-medium text-[#111111] mb-1 group-hover:text-[#799ee0] transition-colors duration-500 tracking-tight">{tmpl.title}</h3>
                              <p className="font-sans text-xs md:text-[13px] text-black/50 leading-relaxed line-clamp-3">{tmpl.desc}</p>
                            </div>
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Light overlay curtain - curved half-moon sweep right to left */}
        <div
          ref={transitionOverlayRef}
          className="absolute inset-0 z-10 will-change-transform"
        />

        {/* SDK Preview content - slides up from below over the curtain. z-index 20 so it's above the curtain! */}
        <div
          ref={transitionContentRef}
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          style={{ visibility: 'hidden' }}
        >
          <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 pointer-events-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-15 xl:gap-20 items-center">

              {/* Arch Window Image - 2 cols */}
              <div className="lg:col-span-2 flex items-center justify-center lg:pr-12" data-anim="sdk-image">
                <div className="relative group cursor-pointer">
                  {/* Subtle glow behind */}
                  <div className="absolute -inset-10 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-full rounded-full bg-[#799ee0]/8 blur-[60px] group-hover:bg-[#799ee0]/15 transition-all duration-700" />
                  </div>

                  <div className="relative w-[320px] md:w-[380px] lg:w-[400px] transition-all duration-700 ease-out group-hover:scale-[1.03]">
                    <img
                      src="/background/p1.png"
                      alt="Valdyum"
                      className="w-full h-auto object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.12)] transition-all duration-700 ease-out group-hover:drop-shadow-[0_35px_50px_rgba(0,0,0,0.2)] mix-blend-multiply"
                    />
                  </div>
                </div>
              </div>

              {/* Code preview - 3 cols */}
              <div className="lg:col-span-3">
                <div className="mb-8" data-anim="sdk-heading">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="h-[1px] w-6 bg-black/30" />
                    <span className="font-sans text-xs font-semibold tracking-wider uppercase text-black/40">
                      SDK Preview
                    </span>
                  </div>
                  <h3 className="font-sans text-4xl font-medium tracking-tight text-[#111111] cursor-default">
                    <span ref={(el) => splitTextRef(el)}>Three Lines to Go Live</span>
                  </h3>
                </div>

                <div className="rounded-[20px] bg-[#0c0914] shadow-2xl overflow-hidden font-mono text-sm border border-white/5" data-anim="sdk-code">
                  {/* Window chrome */}
                  <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                      <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                      <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                    </div>
                    <span className="text-[13px] text-white/40 font-medium font-mono tracking-wide">deploy.ts</span>
                  </div>

                  <pre className="p-6 md:p-8 overflow-x-auto text-[14px] leading-relaxed text-white/80">
                    <code><span className="text-white/40 italic">{"// "}Permissionless factory - any strategy, any time</span>{"\n"}
                      <span className="text-[#c084fc]">const</span> <span className="text-[#e2e8f0]">agent</span> <span className="text-[#c084fc]">=</span> <span className="text-[#c084fc]">await</span> <span className="text-[#e2e8f0]">valdyum.</span><span className="text-[#799ee0]">deploy</span><span className="text-[#e2e8f0]">{'{'}</span>{"\n"}
                      <span className="text-[#e2e8f0]">  template:</span> <span className="text-[#34d399]">{"\"mev_bot\""}</span><span className="text-[#e2e8f0]">,</span> <span className="text-white/40 italic">{"// "}Solana DEX</span>{"\n"}
                      <span className="text-[#e2e8f0]">  pair:</span> <span className="text-[#34d399]">{"\"SOL/USDC\""}</span>{"\n"}
                      <span className="text-[#e2e8f0]">{"}"});</span>{"\n\n"}
                      <span className="text-white/40">{"->"}</span> <span className="text-[#34d399]">AgentContract</span> <span className="text-white/40">at</span> <span className="text-[#e2e8f0]">C...42E</span></code>
                  </pre>

                  <div className="px-6 py-5 border-t border-white/5 bg-white/[0.02] flex items-center gap-4 pointer-events-auto">
                    <Link href="/docs/sdk" className="group flex items-center gap-2 font-sans text-xs font-semibold tracking-wide uppercase text-white/40 hover:text-white transition-colors">
                      Full SDK docs <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                    <span className="text-white/10">·</span>
                    <Link href="/build" className="group flex items-center gap-2 font-sans text-xs font-semibold tracking-wide uppercase text-white/40 hover:text-white transition-colors">
                      Use template <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -- CTA BANNER ---- */}
      <section className="min-h-[100svh] w-full flex items-center justify-center relative py-24 lg:py-0 overflow-hidden">
        {/* Background Image Layer (Behind the card) */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/background/p2.png"
            alt="Ship Today Background"
            className="w-full h-full object-cover"
          />
          {/* Faint white overlay to ensure dark text is readable across all parts of the image */}
          <div className="absolute inset-0 bg-white/20" />

          {/* Light fade at the top to merge seamlessly with the previous section */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#f2fbff] to-transparent" />

          {/* Light fade at the bottom to merge seamlessly with the Founders section */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#f2fbff] to-transparent" />
        </div>

        <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative w-full"
          >
            <div className="relative z-10 py-24 text-center flex flex-col items-center">
              <div className="flex items-center gap-4 mb-6">
                <span className="h-[1px] w-6 bg-black/20" />
                <span className="font-sans text-xs font-semibold tracking-widest uppercase text-black/50">
                  Ship Today
                </span>
                <span className="h-[1px] w-6 bg-black/20" />
              </div>

              <h2 className="font-sans text-5xl md:text-6xl font-medium tracking-tight text-[#111111] mb-6 cursor-default">
                <span ref={(el) => splitTextRef(el)}>From idea to on-chain revenue</span>
                <br className="hidden md:block" />
                <span ref={(el) => splitTextRef(el, { delay: 0.15 })}> in minutes.</span>
              </h2>

              <p className="font-sans text-lg text-black/60 leading-relaxed mb-10 max-w-2xl mx-auto">
                Connect your Phantom wallet, pick a Rust template, configure strategy params,
                deploy on Anchor — and start earning SOL per request automatically via 0x402.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/build"
                  className="group relative px-10 py-4 font-sans text-xs font-semibold tracking-wide uppercase rounded-full overflow-hidden text-white bg-[#111111] hover:bg-[#799ee0] transition-colors duration-500"
                >
                  <span className="relative flex items-center gap-2">
                    Start Building
                    <span className="transform group-hover:translate-x-1 transition-transform duration-500">→</span>
                  </span>
                </Link>
                <Link
                  href="/agents"
                  className="group flex items-center gap-2 px-10 py-4 font-sans text-xs font-semibold tracking-wide uppercase border border-black/10 text-[#111111] rounded-full hover:border-[#111111] hover:bg-black/5 transition-all duration-500"
                >
                  Browse Agents
                  <span className="transform group-hover:translate-x-1 transition-transform duration-500 text-black/30 group-hover:text-[#111111]">→</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* -- DECORATIVE STRING / THREAD ANIMATION ---- */}
      {/* -- FOUNDERS SECTION ---- */}
      <section className="relative max-w-[1400px] mx-auto px-6 lg:px-12 pb-32 pt-16 overflow-visible">

        {/* Thread SVG — behind everything */}
        <svg
          ref={(el) => {
            if (!el || el.dataset.animated) return;
            el.dataset.animated = 'true';

            setTimeout(() => {
              const path = el.querySelector('#thread-path') as SVGPathElement;
              if (!path) return;

              // Fallback to 2500 if getTotalLength returns 0 due to rendering timing
              const length = path.getTotalLength() || 2500;

              gsap.fromTo(path,
                { strokeDasharray: length, strokeDashoffset: length },
                {
                  strokeDashoffset: 0,
                  ease: 'power1.inOut',
                  scrollTrigger: {
                    trigger: el.closest('section'),
                    start: 'top 50%',
                    end: 'bottom 60%',
                    scrub: 1,
                  }
                }
              );
            }, 100);
          }}
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1400 500"
          fill="none"
          preserveAspectRatio="none"
          style={{ zIndex: 0 }}
        >
          {/* Path starts lower-left, avoids top-left title, sweeps through cards area */}
          <path
            id="thread-path"
            d="M -20 400 
               C 60 350, 150 300, 250 320 
               C 380 345, 420 450, 480 400 
               C 540 350, 500 200, 600 220 
               C 700 240, 750 350, 850 300 
               C 950 250, 920 130, 1020 160 
               C 1120 190, 1100 330, 1200 280 
               C 1300 230, 1350 150, 1440 180"
            stroke="#111111"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Founders content — above the thread */}
        <div className="relative flex flex-col lg:flex-row gap-16 lg:gap-24" style={{ zIndex: 1 }}>

          {/* Left Column: Title */}
          <div className="lg:w-1/3 flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <span className="h-[1px] w-8 bg-black/30" />
              <span className="font-sans text-xs font-semibold tracking-widest text-black/40 uppercase">Who We Are</span>
            </div>
            <h2 className="font-sans text-5xl md:text-7xl font-medium tracking-tight text-[#111111] leading-[0.9] cursor-default">
              <span ref={(el) => splitTextRef(el)}>The</span>
              <br />
              <span ref={(el) => splitTextRef(el, { color: 'rgba(0,0,0,0.3)', delay: 0.12 })}>Founders.</span>
            </h2>
          </div>

          {/* Right Column: Founder Profiles */}
          <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Founder 1 */}
            <div className="group border border-[#111111] bg-white rounded-[20px] p-8 flex flex-col justify-between transition-all duration-500 hover:shadow-[0_15px_40px_rgba(0,0,0,0.06)]">
              <div className="w-full h-64 mb-8 overflow-hidden rounded-xl bg-[#fafafa]">
                <img src="/Founder.png" alt="Sayan Roy" className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out" />
              </div>
              <div>
                <h3
                  className="font-sans text-3xl font-medium text-[#111111] tracking-tight mb-1"
                  ref={(el) => {
                    if (!el || el.dataset.split) return;
                    el.dataset.split = 'true';
                    const text = el.textContent || '';
                    el.innerHTML = '';
                    text.split('').forEach((char) => {
                      const span = document.createElement('span');
                      span.textContent = char === ' ' ? '\u00A0' : char;
                      span.style.display = 'inline-block';
                      span.style.willChange = 'transform';
                      el.appendChild(span);
                    });
                    const chars = el.querySelectorAll('span');
                    el.addEventListener('mouseenter', () => {
                      gsap.to(chars, { y: -5, color: '#799ee0', duration: 0.2, stagger: 0.025, ease: 'power2.out' });
                    });
                    el.addEventListener('mouseleave', () => {
                      gsap.to(chars, { y: 0, color: '#111111', duration: 0.3, stagger: 0.02, ease: 'power2.inOut' });
                    });
                  }}
                >Sayan Roy</h3>
                <span className="font-mono text-xs font-semibold tracking-widest text-black/40 uppercase mb-6 block">Founder</span>

                <div className="flex items-center gap-4 pt-6 border-t border-black/10">
                  <Link href="#" className="font-sans text-xs font-semibold tracking-wide uppercase text-black/40 hover:text-[#799ee0] transition-colors">
                    LinkedIn →
                  </Link>
                  <span className="text-black/10">·</span>
                  <Link href="#" className="font-sans text-xs font-semibold tracking-wide uppercase text-black/40 hover:text-[#799ee0] transition-colors">
                    X (Twitter) →
                  </Link>
                </div>
              </div>
            </div>

            {/* Founder 2 */}
            <div className="group border border-[#111111] bg-white rounded-[20px] p-8 flex flex-col justify-between transition-all duration-500 hover:shadow-[0_15px_40px_rgba(0,0,0,0.06)]">
              <div className="w-full h-64 mb-8 overflow-hidden rounded-xl bg-[#fafafa]">
                <img src="/Co-Founder.png" alt="Satish Jalan" className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out" />
              </div>
              <div>
                <h3
                  className="font-sans text-3xl font-medium text-[#111111] tracking-tight mb-1"
                  ref={(el) => {
                    if (!el || el.dataset.split) return;
                    el.dataset.split = 'true';
                    const text = el.textContent || '';
                    el.innerHTML = '';
                    text.split('').forEach((char) => {
                      const span = document.createElement('span');
                      span.textContent = char === ' ' ? '\u00A0' : char;
                      span.style.display = 'inline-block';
                      span.style.willChange = 'transform';
                      el.appendChild(span);
                    });
                    const chars = el.querySelectorAll('span');
                    el.addEventListener('mouseenter', () => {
                      gsap.to(chars, { y: -5, color: '#799ee0', duration: 0.2, stagger: 0.025, ease: 'power2.out' });
                    });
                    el.addEventListener('mouseleave', () => {
                      gsap.to(chars, { y: 0, color: '#111111', duration: 0.3, stagger: 0.02, ease: 'power2.inOut' });
                    });
                  }}
                >Satish Jalan</h3>
                <span className="font-mono text-xs font-semibold tracking-widest text-black/40 uppercase mb-6 block">Co-Founder</span>

                <div className="flex items-center gap-4 pt-6 border-t border-black/10">
                  <Link href="#" className="font-sans text-xs font-semibold tracking-wide uppercase text-black/40 hover:text-[#799ee0] transition-colors">
                    LinkedIn →
                  </Link>
                  <span className="text-black/10">·</span>
                  <Link href="#" className="font-sans text-xs font-semibold tracking-wide uppercase text-black/40 hover:text-[#799ee0] transition-colors">
                    X (Twitter) →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* -- FOOTER ---- */}
      <footer id="waitlist" className="w-full bg-[#799ee0] text-white pt-24 flex flex-col justify-between overflow-hidden relative" style={{ minHeight: '65vh' }}>
        <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-12 flex-grow flex flex-col lg:flex-row gap-16 lg:gap-24 mb-16">

          {/* Left Side: Links Grid */}
          <div
            className="grid grid-cols-2 gap-8 md:gap-12 w-full lg:w-1/2"
            ref={(el) => {
              if (!el || el.dataset.animated) return;
              el.dataset.animated = 'true';

              setTimeout(() => {
                const columns = el.children;
                gsap.fromTo(columns,
                  { y: 30, opacity: 0 },
                  {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: 'power3.out',
                    scrollTrigger: {
                      trigger: el.closest('footer'),
                      start: 'top 60%',
                      toggleActions: 'play none none reverse'
                    }
                  }
                );
              }, 100);
            }}
          >

            {/* Column 1 */}
            <div className="flex flex-col">
              <h4 className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase mb-5 border-t border-white/30 pt-4 text-white">RESOURCES (Coming Soon) </h4>
              <ul className="flex flex-col gap-2 font-sans text-xs text-white/60">
                <li><span className="flex items-center justify-between cursor-not-allowed">Agent Framework <span className="text-[9px] text-[#799ee0] uppercase tracking-widest bg-[#799ee0]/10 px-2 py-0.5 rounded-full">Coming soon</span></span></li>
                <li><span className="flex items-center justify-between cursor-not-allowed">Solana Payments <span className="text-[9px] text-[#799ee0] uppercase tracking-widest bg-[#799ee0]/10 px-2 py-0.5 rounded-full">Coming soon</span></span></li>
                <li><span className="flex items-center justify-between cursor-not-allowed">Rust SDK <span className="text-[9px] text-[#799ee0] uppercase tracking-widest bg-[#799ee0]/10 px-2 py-0.5 rounded-full">Coming soon</span></span></li>
                <li><span className="flex items-center justify-between cursor-not-allowed">Smart Contracts <span className="text-[9px] text-[#799ee0] uppercase tracking-widest bg-[#799ee0]/10 px-2 py-0.5 rounded-full">Coming soon</span></span></li>
              </ul>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col">
              <h4 className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase mb-5 border-t border-white/30 pt-4 text-white">SOCIALS</h4>
              <ul className="flex flex-col gap-2 font-sans text-xs text-white/80">
                <li><Link href="https://x.com/ValdyumLabs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-3"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> Twitter / X</Link></li>
                <li><Link href="https://www.linkedin.com/company/valdyum-labs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-3"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.924 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> LinkedIn</Link></li>
                <li><Link href="https://discord.gg/MTWHBwgP" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-3"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0788.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" /></svg> Discord</Link></li>
              </ul>
            </div>

          </div>

          {/* Right Side: Waitlist */}
          <div className="w-full lg:w-1/2 flex flex-col justify-start lg:pl-16 border-t lg:border-t-0 lg:border-l border-white/20 pt-12 lg:pt-0">
            <span className="font-sans text-[9px] font-bold tracking-[0.2em] uppercase mb-5 border-t border-white/30 pt-4 text-white">WAITLIST</span>
            <h3 className="font-sans text-4xl md:text-5xl font-medium tracking-tight text-white leading-[1.1] mb-4">
              Be first on<br />the rate curve.
            </h3>
            <p className="font-sans text-sm text-white/80 mb-8 max-w-sm">
              Early access to the terminal, fixed-rate markets, and protocol updates.
            </p>

            <form className="relative group w-full max-w-md" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="you@domain.com"
                className="w-full bg-transparent border-b border-white/30 pb-3 text-base text-white placeholder:text-white/40 focus:outline-none focus:border-white transition-colors rounded-none"
                required
              />
              <button
                type="submit"
                className="absolute right-0 bottom-3 text-white/50 group-hover:text-white hover:text-white transition-colors"
                aria-label="Join Waitlist"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Massive Text with overlaid copyright — text inside D curve like ROME's O */}
        <div className="w-full relative overflow-hidden mt-auto" style={{ height: '15vw' }}>
          <div className="absolute z-10 pointer-events-none" style={{ top: '20%', left: '50%', transform: 'translateX(-50%)' }}>

          </div>
          <h1
            className="text-[18vw] leading-none font-serif text-white text-center w-full whitespace-nowrap tracking-tighter"
            ref={(el) => {
              if (!el || el.dataset.animated) return;
              el.dataset.animated = 'true';

              const text = el.textContent || '';
              el.innerHTML = '';

              // Premium Split Text Reveal
              text.trim().split('').forEach((char) => {
                // Wrapper for clipping
                const wrapper = document.createElement('span');
                wrapper.style.display = 'inline-block';
                wrapper.style.overflow = 'hidden';
                wrapper.style.verticalAlign = 'bottom';
                wrapper.style.paddingTop = '10px'; // Prevent descender clipping just in case

                // Actual letter to animate
                const inner = document.createElement('span');
                inner.textContent = char;
                inner.style.display = 'inline-block';
                inner.style.willChange = 'transform';

                wrapper.appendChild(inner);
                el.appendChild(wrapper);
              });

              const chars = el.querySelectorAll('span > span');

              setTimeout(() => {
                gsap.fromTo(chars,
                  { y: '100%' },
                  {
                    y: '0%',
                    duration: 1.2,
                    stagger: 0.08,
                    ease: 'power4.out',
                    scrollTrigger: {
                      trigger: el.closest('footer'),
                      start: 'top 50%',
                      toggleActions: 'play none none reverse'
                    }
                  }
                );
              }, 100);
            }}
          >
            VALDYUM
          </h1>
        </div>
      </footer>
    </div>
  );
}
