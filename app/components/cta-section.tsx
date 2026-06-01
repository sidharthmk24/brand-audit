'use client';

import OnboardingForm from './onboarding-form';

export default function CtaSection() {
  return (
    <section className="bg-gradient-to-br from-[#4a0404] via-[#750b0b] to-[#e13131] py-32 text-center border-t border-white/5 relative" id="cta">
      {/* Optional dark overlay gradient for exact match */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20 pointer-events-none" />

      <div className="section-container relative z-10">
        <h2 className="text-white text-4xl sm:text-5xl font-medium tracking-tight mb-4">
          Ready to See What&apos;s
          <br className="hidden sm:block" />
          Holding You Back?
        </h2>
        
        <p className="text-white/80 text-sm sm:text-base mb-10 font-light">
          Free, expert brand audit delivered in 24 hours.
        </p>

        <div className="max-w-xl mx-auto">
          <OnboardingForm variant="cta" />
        </div>
      </div>
    </section>
  );
}
