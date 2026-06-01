'use client';

export default function HowItWorksSection() {
  const STEPS = [
    {
      number: '01',
      title: 'Submit Your Brand',
      description: 'Enter your brand\'s website or Instagram handle and fill in a few quick details. Takes under 30 seconds.',
    },
    {
      number: '02',
      title: 'We Run the Audit',
      description: 'Our AI analyses 50+ data points across brand identity, visual consistency, tone, and audience alignment.',
    },
    {
      number: '03',
      title: 'Receive Your Report',
      description: 'Your detailed PDF report lands in your inbox within 24 hours — completely free.',
    },
  ];

  return (
    <section className="bg-white py-24" id="how-it-works">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h3 className="text-[#e13131] text-xs font-bold uppercase tracking-[0.15em] mb-4">
            Simple Process
          </h3>
          
          <h2 className="text-[#1a1a1a] text-4xl sm:text-5xl font-medium tracking-tight">
            How It Works
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center mt-12">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col items-center">
              {/* Step Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e13131] text-white text-xl font-semibold mb-6 shadow-md shadow-red-500/20">
                {step.number}
              </div>

              {/* Step Content */}
              <h4 className="text-[#1a1a1a] text-lg font-semibold mb-3">
                {step.title}
              </h4>
              <p className="text-[#4a4a4a] text-sm leading-relaxed max-w-[260px] mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
