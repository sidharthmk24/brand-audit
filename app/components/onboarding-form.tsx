'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { initialSubmissionSchema, detailsSubmissionSchema, INDUSTRY_OPTIONS } from '@/lib/validations/submission';

interface FieldErrors {
  [key: string]: string[] | undefined;
}

interface BrandSearchResult {
  name: string;
  websiteUrl: string;
  socialLinks: { platform: string; url: string }[];
}

type ModalStep = 'details' | 'cards';

const AI_TEXTS = [
  "Connecting to Google Search...",
  "Locating official website domain...",
  "Cross-referencing social media profiles...",
  "Compiling brand footprint..."
];

const PIPELINE_STEPS: Record<string, { 
  text: string; 
  subtext: string; 
  progress: number 
}> = {
  pending:    { 
    text: 'Submitting your brand...', 
    subtext: 'Setting up your audit session', 
    progress: 5 
  },
  scraping:   { 
    text: 'Scanning your website...', 
    subtext: 'Capturing screenshots and extracting brand content', 
    progress: 30 
  },
  analyzing:  { 
    text: 'Running AI analysis...', 
    subtext: 'Gemini is auditing your brand equity and competitors', 
    progress: 65 
  },
  generating: { 
    text: 'Building your report...', 
    subtext: 'Structuring findings and recommendations', 
    progress: 85 
  },
  complete:   { 
    text: 'Report ready!', 
    subtext: 'Your brand audit is complete', 
    progress: 100 
  },
};

export default function OnboardingForm({ variant = 'hero' }: { variant?: 'hero' | 'cta' }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetailsSubmitting, setIsDetailsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Used for final submit animation
  const [aiTextIndex, setAiTextIndex] = useState(0);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState<string>('pending');
  const [progress, setProgress] = useState(5);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [modalStep, setModalStep] = useState<ModalStep>('details');
  const [searchResults, setSearchResults] = useState<BrandSearchResult[]>([]);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState<number | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    industry: [] as string[],
    name: '',
    email: '',
    phone: '',
    website: '',
    instagram: '',
  });

  // Cycle fake analyzing text for searching state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSearching) {
      interval = setInterval(() => {
        setAiTextIndex((prev) => (prev + 1) % AI_TEXTS.length);
      }, 1500);

      return () => clearInterval(interval);
    } else {
      setAiTextIndex(0);
    }
  }, [isSearching]);

  // Real-time polling
  useEffect(() => {
    if (!isAnalyzing || !leadId) return;
    
    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${leadId}`);
        const data = await res.json();
        
        if (data.success) {
          const step = data.pipeline_step || data.status;
          setPipelineStep(step);
          setProgress(PIPELINE_STEPS[step]?.progress || 5);
          
          if (
            data.status === 'awaiting_review' || 
            data.pipeline_step === 'complete'
          ) {
            setIsAnalyzing(false);
            setIsSuccess(true);
            return;
          }
          
          if (data.status === 'failed') {
            setIsAnalyzing(false);
            setServerError('Audit failed. Please try again.');
            return;
          }
        }
      } catch (e) {
        console.error('Status poll failed:', e);
        // Don't stop polling on network error — just try again
      }
    };

    poll(); // immediate first call
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [isAnalyzing, leadId]);

  const toggleIndustry = (ind: string) => {
    setFormData((prev) => {
      const isSelected = prev.industry.includes(ind);
      let newIndustry = isSelected 
        ? prev.industry.filter(i => i !== ind)
        : [...prev.industry, ind];
      
      return { ...prev, industry: newIndustry };
    });
    if (fieldErrors.industry) {
      setFieldErrors((prev) => ({ ...prev, industry: undefined }));
    }
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (fieldErrors[name]) {
        setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [fieldErrors]
  );

  // --- Initial Hero Submit ---
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const result = initialSubmissionSchema.safeParse({ company_name: formData.company_name });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as FieldErrors);
      return;
    }

    setModalStep('details');
    setShowModal(true);
  };

  // --- Step 1 to Step 2: Search Brands ---
  const handleSearchBrands = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    if (formData.industry.length === 0) {
      setFieldErrors({ industry: ['Please select at least one industry'] });
      return;
    }

    const dataToValidate = {
      company_name: formData.company_name,
      industry: formData.industry.join(', '),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      instagram: formData.instagram,
    };

    const result = detailsSubmissionSchema.safeParse(dataToValidate);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as FieldErrors);
      return;
    }

    setIsSearching(true);
    setServerError(null);
    
    try {
      // Run the fetch AND a minimum delay in parallel so the user gets to see the animation
      const [res] = await Promise.all([
        fetch('/api/search-brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandName: formData.company_name, industry: formData.industry.join(', ') })
        }),
        new Promise(resolve => setTimeout(resolve, 5000)) // Force minimum 5 seconds for animation
      ]);
      
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to search brands');
      }

      setSearchResults(data.brands || []);
      setModalStep('cards');
      setSelectedBrandIndex(null);
      setIsManualEntry(false);
    } catch (err: any) {
      console.error(err);
      // Fallback to manual entry if search fails entirely
      setSearchResults([]);
      setModalStep('cards');
      setIsManualEntry(true);
    } finally {
      setIsSearching(false);
    }
  };

  // --- Final Submit (from cards step) ---
  const handleConfirmAndSubmit = async () => {
    setServerError(null);
    setFieldErrors({});

    let finalData = { ...formData };

    if (!isManualEntry && selectedBrandIndex !== null) {
      const brand = searchResults[selectedBrandIndex];
      const insta = brand.socialLinks.find(s => s.platform.toLowerCase() === 'instagram')?.url || '';
      
      finalData = {
        ...finalData,
        company_name: brand.name || finalData.company_name,
        website: brand.websiteUrl || finalData.website,
        instagram: insta || finalData.instagram
      };
      setFormData(finalData);
    }

    const dataToSubmit = {
      company_name: finalData.company_name,
      industry: finalData.industry.join(', '),
      name: finalData.name,
      email: finalData.email,
      phone: finalData.phone,
      website: finalData.website,
      instagram: finalData.instagram,
    };

    setIsDetailsSubmitting(true);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.error && typeof data.error === 'object') {
          setFieldErrors(data.error);
        } else {
          setServerError(data.error || 'Failed to submit details.');
        }
        setIsDetailsSubmitting(false);
        return;
      }

      setLeadId(data.leadId);
      setPipelineStep('pending');
      setProgress(5);
      setIsDetailsSubmitting(false);
      setIsAnalyzing(true);
      
    } catch {
      setServerError('Network error. Failed to save details.');
      setIsDetailsSubmitting(false);
    }
  };

  const handleAbandon = () => {
    if (!isAnalyzing && !isSearching) {
      setShowModal(false);
      setIsSuccess(false);
      setModalStep('details');
    }
  };

  // Reusable AI Animation Component
  const AiAnimation = () => {
    let displayText = '';
    let displaySubtext = '';
    let animKey = '';

    if (isSearching) {
      displayText = AI_TEXTS[aiTextIndex];
      displaySubtext = "Usually takes 30-60 seconds.";
      animKey = `search-${aiTextIndex}`;
    } else {
      const currentStep = PIPELINE_STEPS[pipelineStep] || PIPELINE_STEPS.pending;
      displayText = currentStep.text;
      displaySubtext = currentStep.subtext;
      animKey = `analyze-${pipelineStep}`;
    }

    return (
      <div className="py-12 flex flex-col items-center justify-center min-h-[300px] px-4">
        
        {/* Glowing Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-16 h-16 border-4 border-gray-100 border-t-brand-primary rounded-full mb-8 shadow-[0_0_20px_rgba(225,49,49,0.3)]"
        />

        {/* Step text — animates when step changes */}
        <div className="h-8 relative overflow-hidden w-full max-w-sm text-center">
          <AnimatePresence mode="popLayout">
            <motion.h3
              key={animKey}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-lg font-bold text-gray-900 absolute w-full"
            >
              {displayText}
            </motion.h3>
          </AnimatePresence>
        </div>
        
        {/* Subtext */}
        <p className="text-gray-500 text-sm mt-4 text-center">
          {displaySubtext}
        </p>
      </div>
    );
  };

  // --- Success State ---
  if (isSuccess && showModal) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 bg-white p-12 text-center max-w-lg w-full rounded-3xl shadow-2xl"
        >
          <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900 mb-3">Audit Initiated!</h3>
          <p className="text-gray-600 leading-relaxed text-sm">
            Our AI is currently auditing <span className="text-brand-primary font-semibold block mt-1 break-all">{formData.company_name}</span>.
          </p>
          <p className="text-gray-600 leading-relaxed text-sm mt-2">
            A high-fidelity strategy roadmap PDF will be emailed to <strong className="text-gray-900">{formData.email}</strong> within minutes.
          </p>
          <button
            onClick={() => {
              setIsSuccess(false);
              setShowModal(false);
              setFormData({ company_name: '', industry: [], name: '', email: '', phone: '', website: '', instagram: '' });
              setModalStep('details');
            }}
            className="mt-8 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors font-bold"
          >
            Analyze another brand →
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Primary Form Input Container */}
      <div className="w-full max-w-xl mx-auto z-20 relative px-4">
        <form onSubmit={handleInitialSubmit} className="flex flex-col sm:flex-row gap-3 w-full items-stretch">
          <div className="flex-1 relative flex items-stretch">
            <input
              id="company_name"
              name="company_name"
              type="text"
              value={formData.company_name}
              onChange={handleChange}
              placeholder="Enter your Brand Name"
              className={`form-input text-base py-3.5 px-4 h-12 w-full rounded-xl outline-none ${
                variant === 'cta' 
                  ? 'bg-white text-black border-transparent focus:border-transparent focus:ring-0 placeholder:text-gray-400' 
                  : 'bg-[#1c1c1c] text-white border-white/10 placeholder:text-gray-500'
              } ${fieldErrors.company_name ? 'form-input-error' : ''}`}
              autoComplete="off"
              required
            />
            {fieldErrors.company_name && variant === 'hero' && (
              <p className="absolute left-0 -bottom-6 text-xs text-error font-medium">
                {fieldErrors.company_name[0]}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`h-12 text-base font-semibold px-8 whitespace-nowrap rounded-xl transition-all ${
              variant === 'cta' 
                ? 'bg-[#111] text-white hover:bg-black shadow-lg border border-white/10' 
                : 'btn-primary shadow-[0_0_20px_rgba(225,49,49,0.35)]'
            } ${isSubmitting ? 'btn-shimmer' : ''}`}
          >
            <span>{variant === 'cta' ? 'Audit' : 'Get Free Audit'}</span>
          </button>
        </form>
      </div>

      {/* --- Multi-Step Details Capture Modal --- */}
      <AnimatePresence mode="wait">
        {showModal && !isSuccess && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleAbandon}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-10 bg-white max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[95vh] rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              {!isAnalyzing && !isSearching && (
                <button
                  type="button" onClick={handleAbandon}
                  className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-full transition-all cursor-pointer shadow-sm"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              <div className="overflow-y-auto flex-1 p-6 sm:p-8">
                {/* Rendering State Logic */}
              {(isSearching || isAnalyzing) ? (
                <AiAnimation />
              ) : modalStep === 'details' ? (
                /* Step 1: All Contact Details + Brand Name + Industry */
                <div>
                  <div className="text-center mb-8">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Provide Your Details</h3>
                    <p className="text-sm text-gray-600">Give us some info so our AI can find your digital footprint.</p>
                  </div>

                  <form onSubmit={handleSearchBrands} className="space-y-6 max-w-lg mx-auto text-left">
                    <div className="space-y-4">
                      {/* Brand Info */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-3">Brand Information</h4>
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-gray-500 uppercase">Brand Name <span className="text-red-500">*</span></label>
                            <input
                              name="company_name" type="text"
                              value={formData.company_name} onChange={handleChange}
                              className={`w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm ${fieldErrors.company_name ? 'border-red-500' : ''}`}
                            />
                            {fieldErrors.company_name && <p className="text-[11px] text-error font-medium">{fieldErrors.company_name[0]}</p>}
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[11px] font-bold text-gray-500 uppercase">Industry <span className="text-red-500">*</span></label>
                            <div className="flex flex-wrap gap-2">
                              {INDUSTRY_OPTIONS.map((ind) => (
                                <button
                                  key={ind}
                                  type="button"
                                  onClick={() => toggleIndustry(ind)}
                                  className={`px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-full border transition-all ${
                                    formData.industry.includes(ind)
                                      ? 'bg-[#111] border-[#111] text-white shadow-md'
                                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                                  }`}
                                >
                                  {ind}
                                </button>
                              ))}
                            </div>
                            {fieldErrors.industry && <p className="text-[11px] text-error font-medium">{fieldErrors.industry[0]}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-3">Contact Details</h4>
                        <div className="space-y-4">
                          <div className="space-y-4 sm:flex sm:space-y-0 sm:gap-4">
                            <div className="space-y-1.5 flex-1">
                              <label className="block text-[11px] font-bold text-gray-500 uppercase">Full Name</label>
                              <input
                                name="name" type="text" placeholder="Jane Smith"
                                value={formData.name} onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm ${fieldErrors.name ? 'border-red-500' : ''}`}
                              />
                              {fieldErrors.name && <p className="text-[11px] text-error font-medium">{fieldErrors.name[0]}</p>}
                            </div>

                            <div className="space-y-1.5 flex-1">
                              <label className="block text-[11px] font-bold text-gray-500 uppercase">Phone Number <span className="opacity-70">(optional)</span></label>
                              <input
                                name="phone" type="tel" placeholder="+1 (555)"
                                value={formData.phone} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-gray-500 uppercase">Email Address <span className="text-red-500">*</span></label>
                            <input
                              name="email" type="email" placeholder="jane@company.com"
                              value={formData.email} onChange={handleChange}
                              className={`w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm ${fieldErrors.email ? 'border-red-500' : ''}`}
                            />
                            {fieldErrors.email && <p className="text-[11px] text-error font-medium">{fieldErrors.email[0]}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Links Info */}
                      {/* <div>
                        <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-3">Digital Footprint (Optional)</h4>
                        <p className="text-xs text-gray-500 mb-3">You can manually provide these or we will search for them in the next step.</p>
                        <div className="space-y-4 sm:flex sm:space-y-0 sm:gap-4">
                          <div className="space-y-1.5 flex-1">
                            <label className="block text-[11px] font-bold text-gray-500 uppercase">Website URL</label>
                            <input
                              name="website" type="text" placeholder="https://"
                              value={formData.website} onChange={handleChange}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <label className="block text-[11px] font-bold text-gray-500 uppercase">Instagram URL</label>
                            <input
                              name="instagram" type="text" placeholder="https://"
                              value={formData.instagram} onChange={handleChange}
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm"
                            />
                          </div>
                        </div>
                      </div> */}
                    </div>

                    {serverError && (
                      <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium text-center">
                        {serverError}
                      </div>
                    )}

                    <div className="pt-4">
                      <button
                        type="submit" disabled={isSearching}
                        className={`w-full btn-primary py-4 rounded-xl font-bold shadow-[0_0_20px_rgba(225,49,49,0.2)]`}
                      >
                        Find My Brand
                      </button>
                    </div>
                  </form>
                </div>
              ) : modalStep === 'cards' ? (
                /* Step 2: AI Generated Cards */
                <div>
                  <div className="text-center mb-8">
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Is this your brand?</h3>
                    <p className="text-sm text-gray-600">We found these digital footprints matching your details.</p>
                  </div>

                  <div className="space-y-4 max-w-xl mx-auto">
                    {searchResults.length > 0 ? searchResults.map((brand, idx) => (
                      <div 
                        key={idx}
                        onClick={() => { setSelectedBrandIndex(idx); setIsManualEntry(false); }}
                        className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                          selectedBrandIndex === idx && !isManualEntry 
                            ? 'border-brand-primary bg-brand-primary/5 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="font-bold text-gray-900 text-lg">{brand.name || formData.company_name}</div>
                        <a 
                          href={brand.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-brand-primary font-medium mt-1 hover:underline inline-block"
                        >
                          {brand.websiteUrl}
                        </a>
                        {brand.socialLinks && brand.socialLinks.length > 0 && (
                          <div className="flex gap-2 mt-3 flex-wrap justify-center max-w-[90%]">
                            {(() => {
                              const grouped: Record<string, string[]> = {};
                              brand.socialLinks.forEach(s => {
                                const p = s.platform.toUpperCase();
                                if (!grouped[p]) grouped[p] = [];
                                if (!grouped[p].includes(s.url)) grouped[p].push(s.url);
                              });
                              return Object.entries(grouped).map(([platform, urls], i) => (
                                urls.length === 1 ? (
                                  <a 
                                    key={i} 
                                    href={urls[0]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] sm:text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1 rounded-lg uppercase tracking-wide transition-colors shadow-sm"
                                  >
                                    {platform}
                                  </a>
                                ) : (
                                  <div key={i} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                                    <select 
                                      onChange={(e) => { if (e.target.value) window.open(e.target.value, '_blank'); e.target.value = ''; }}
                                      className="text-[10px] sm:text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-3 py-1 rounded-lg uppercase tracking-wide transition-colors shadow-sm appearance-none pr-7 cursor-pointer outline-none max-w-[130px] text-ellipsis"
                                      style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="%234b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 5 6 8 9 5"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                                    >
                                      <option value="">{platform} ({urls.length})</option>
                                      {urls.map((url, urlIdx) => (
                                        <option key={urlIdx} value={url}>{url.replace('https://', '').replace('http://', '').replace('www.', '')}</option>
                                      ))}
                                    </select>
                                  </div>
                                )
                              ));
                            })()}
                          </div>
                        )}
                        <div className={`absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedBrandIndex === idx && !isManualEntry ? 'border-brand-primary bg-brand-primary' : 'border-gray-300'
                        }`}>
                          {selectedBrandIndex === idx && !isManualEntry && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm text-center">
                        We couldn&apos;t automatically find matching brands. Please enter your details manually.
                      </div>
                    )}

                    <div 
                      onClick={() => { setIsManualEntry(true); setSelectedBrandIndex(null); }}
                      className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                        isManualEntry 
                          ? 'border-brand-primary bg-brand-primary/5 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="font-bold text-gray-900 text-lg">None of the above / Enter Manually</div>
                      <div className={`absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isManualEntry ? 'border-brand-primary bg-brand-primary' : 'border-gray-300'
                      }`}>
                        {isManualEntry && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isManualEntry && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 pb-2 space-y-4">
                            <div className="space-y-1.5">
                              <label className="block text-[11px] font-bold text-gray-500 uppercase">Website URL</label>
                              <input
                                name="website" type="text" placeholder="https://yourwebsite.com"
                                value={formData.website} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[11px] font-bold text-gray-500 uppercase">Main Social URL (e.g. Instagram/LinkedIn)</label>
                              <input
                                name="instagram" type="text" placeholder="https://instagram.com/yourbrand"
                                value={formData.instagram} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {serverError && (
                      <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium text-center">
                        {serverError}
                      </div>
                    )}

                    <div className="flex gap-3 mt-8">
                      <button
                        type="button" onClick={() => setModalStep('details')}
                        className="px-6 py-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button" onClick={handleConfirmAndSubmit}
                        disabled={(selectedBrandIndex === null && !isManualEntry) || isDetailsSubmitting}
                        className={`flex-1 btn-primary py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Confirm & Generate Report
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}