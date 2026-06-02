'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import OnboardingForm from './onboarding-form';

gsap.registerPlugin(ScrollTrigger);

const HERO_FEATURES = [
  {
    icon: (
      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
    title: 'Brand Identity',
    description: 'Ensure visual consistency',
  },
  {
    icon: (
      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    title: 'Tone Analysis',
    description: 'Align your brand voice',
  },
  {
    icon: (
      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Audience Alignment',
    description: 'Resonate with your market',
  },
  {
    icon: (
      <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
    ),
    title: 'Social Presence',
    description: 'Evaluate your engagement',
  },
];

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const formWrapperRef = useRef<HTMLDivElement>(null);
  const cardsWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Staggered entrance animation
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: 15, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5 }
      )
        .fromTo(
          headlineRef.current,
          { opacity: 0, y: 35 },
          { opacity: 1, y: 0, duration: 0.7 },
          '-=0.3'
        )
        .fromTo(
          subRef.current,
          { opacity: 0, y: 25 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.4'
        )
        .fromTo(
          formWrapperRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.4'
        )
        .fromTo(
          cardsWrapperRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.4'
        );

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 pt-28 pb-16"
      id="hero"
    >
      {/* Red Dot Badge */}
      <div
        ref={badgeRef}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-950/30 px-4 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-red-500 opacity-0"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Free Expert Brand Audit
      </div>

      {/* Headline */}
      <h1
        ref={headlineRef}
        className="section-heading text-white font-light text-4xl sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl mx-auto tracking-tight opacity-0 leading-[1.1]"
      >
        Find Out Why Your
        <br />
        Brand Isn&apos;t <span className="text-red-500">Growing.</span>
      </h1>

      {/* Subtext */}
      <p
        ref={subRef}
        className="mt-6 max-w-2xl text-base sm:text-lg text-muted/80 leading-relaxed opacity-0"
      >
        Get a detailed PDF report on your brand identity, visual consistency, tone and positioning —
        <br className="hidden sm:inline" /> delivered within 24 hours.
      </p>

      {/* Embedded Form Widget */}
      <div
        ref={formWrapperRef}
        className="w-full max-w-2xl mx-auto mt-10 opacity-0 z-[60] relative"
      >
        <OnboardingForm variant="hero" />
      </div>

      {/* Hero Features */}
      <div 
        ref={cardsWrapperRef} 
        className="w-full max-w-4xl mx-auto mt-12 opacity-0 z-20"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {HERO_FEATURES.map((feature) => (
            <div key={feature.title} className="bg-[#1a1a1a]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-5 text-left flex flex-col items-start hover:border-white/10 transition-colors cursor-default">
              <div className="mb-3">
                {feature.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
              <p className="text-xs text-muted/70">{feature.description}</p>
            </div>
          ))}
        </div>
        
        {/* <p className="text-[10px] tracking-[0.2em] font-medium text-muted/50 uppercase">
          Trusted by 200+ Businesses Nationwide
        </p> */}
      </div>
    </section>
  );
}
