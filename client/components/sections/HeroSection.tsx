'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';

const dynamicWords = ['conquer', 'yield', 'scale', 'trade'];

export default function HeroSection() {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Initial measurement and setup
      if (textRef.current && containerRef.current && measureRef.current) {
        measureRef.current.innerText = dynamicWords[0];
        const initialWidth = measureRef.current.offsetWidth;
        gsap.set(containerRef.current, { width: initialWidth });
        gsap.set(textRef.current, { opacity: 1, y: 0, rotationX: 0 });
      }

      const interval = setInterval(() => {
        if (!textRef.current || !containerRef.current || !measureRef.current) return;

        // Animate current text out with a 3D flip
        gsap.to(textRef.current, {
          y: -40,
          opacity: 0,
          rotationX: 60,
          duration: 0.5,
          ease: "power2.in",
          onComplete: () => {
            // Change word
            indexRef.current = (indexRef.current + 1) % dynamicWords.length;
            const newWord = dynamicWords[indexRef.current];
            
            if (textRef.current && containerRef.current && measureRef.current) {
              textRef.current.innerText = newWord;
              measureRef.current.innerText = newWord;
              
              // Measure exact new width invisibly
              const newWidth = measureRef.current.offsetWidth;
              
              // Reset text to bottom starting position for entry
              gsap.set(textRef.current, { y: 40, opacity: 0, rotationX: -60 });
              
              // Smoothly animate the container's width (makes "made to" glide seamlessly)
              gsap.to(containerRef.current, {
                width: newWidth,
                duration: 0.9,
                ease: "power4.inOut"
              });

              // Smoothly animate the new text in with a slight spring
              gsap.to(textRef.current, {
                y: 0,
                opacity: 1,
                rotationX: 0,
                duration: 0.7,
                delay: 0.15,
                ease: "back.out(1.2)"
              });
            }
          }
        });
      }, 3500); // 3.5 seconds between words

      return () => clearInterval(interval);
    });

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative min-h-[100svh] bg-black font-sans text-white">
      {/* Full-screen video background (using existing sources but with a light overlay) */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster="/hero-video-poster.jpg"
      >
        <source src="/background/Backgroundvideo.mp4" type="video/mp4" />
      </video>

      {/* Smooth white fade at the bottom to merge seamlessly with the next section */}
      <div className="absolute bottom-0 left-0 right-0 h-0 bg-gradient-to-t from-[#f2fbff] to-transparent pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1400px] flex-col justify-center px-6 pt-24 pb-28 lg:px-12">
        
        {/* Main Center Content -> Right Aligned Content */}
        <div className="w-full flex-grow flex flex-col items-end justify-center text-right">
          {/* Subtle architectural rule / Subtitle */}
          <div className="mb-6 flex items-center justify-end gap-4">
            <span className="h-[1px] w-8 bg-white/30" />
            <span className="font-sans text-sm font-medium text-white/70 tracking-wide uppercase">
              Solana-native agent infrastructure
            </span>
          </div>

          <h1 className="mb-10 font-sans text-5xl md:text-7xl lg:text-[5.5rem] font-medium leading-[1.05] tracking-[-0.03em] text-white flex flex-col items-end">
            <span>AI agents,</span>
            <span className="flex items-baseline">
              <span>made to&nbsp;</span>
              <span ref={containerRef} className="relative inline-block overflow-visible whitespace-nowrap transition-none">
                {/* Zero-width space establishes proper text baseline without adding visual width */}
                &#8203;
                
                {/* Invisible measurement element */}
                <span ref={measureRef} className="absolute invisible left-0 top-0 pb-[0.25em] pr-2">
                  {dynamicWords[0]}
                </span>
                
                {/* Animated GSAP text element */}
                <span 
                  ref={textRef} 
                  className="absolute right-0 top-0 pb-[0.25em] pr-2 bg-gradient-to-r from-white via-[#e2e8f0] to-[#94a3b8] bg-clip-text text-transparent transform-gpu"
                  style={{ transformOrigin: "50% 50%" }}
                >
                  {dynamicWords[0]}
                </span>
              </span>
            </span>
          </h1>


        </div>

        {/* Bottom Stats Anchor (Matched to PRISM style, Right Aligned) */}
        <div className="flex flex-col md:flex-row justify-end gap-12 md:gap-24 pt-8 mt-auto w-full">
          {/* Stat 1 */}
          <div className="text-right">
            <div className="font-sans text-3xl md:text-4xl font-medium tracking-tight text-white">
              III
            </div>
            <div className="mt-2 font-sans text-xs font-medium text-white/60">
              Core / Alpha / Prime legions
            </div>
          </div>
          
          {/* Stat 2 */}
          <div className="text-right">
            <div className="font-sans text-3xl md:text-4xl font-medium tracking-tight text-white">
              $50k+
            </div>
            <div className="mt-2 font-sans text-xs font-medium text-white/60">
              Treasury flow
            </div>
          </div>

          {/* Stat 3 */}
          <div className="text-right">
            <div className="font-sans text-3xl md:text-4xl font-medium tracking-tight text-white">
              0x402
            </div>
            <div className="mt-2 font-sans text-xs font-medium text-white/60">
              Live revenue protocol
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
