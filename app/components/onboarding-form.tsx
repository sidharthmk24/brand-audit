'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { initialSubmissionSchema, detailsSubmissionSchema, detectAndSanitizeInput, INDUSTRY_OPTIONS } from '@/lib/validations/submission';

interface FieldErrors {
  [key: string]: string[] | undefined;
}

export default function OnboardingForm({ variant = 'hero' }: { variant?: 'hero' | 'cta' }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailsSubmitting, setIsDetailsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAbandoned, setIsAbandoned] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    name: '',
    email: '',
    phone: '',
    website: '',
    instagram: '',
  });

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

  // --- Step 1: Open Modal ---
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const result = initialSubmissionSchema.safeParse({ company_name: formData.company_name });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as FieldErrors);
      return;
    }

    setShowModal(true);
  };

  // --- Step 2: Submit Modal Details ---
  const handleDetailsSubmit = async (e?: React.FormEvent | Event, overrideData?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const dataToSubmit = overrideData || {
      company_name: formData.company_name,
      industry: formData.industry,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      instagram: formData.instagram,
    };

    const result = detailsSubmissionSchema.safeParse(dataToSubmit);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as FieldErrors);
      return;
    }

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

      setIsDetailsSubmitting(false);
      setShowModal(false);
      setIsAbandoned(overrideData ? true : false);
      setIsSuccess(true);
    } catch {
      setServerError('Network error. Failed to save details.');
      setIsDetailsSubmitting(false);
    }
  };

  // --- Step 2 Fallback: Modal Abandoned ---
  const handleAbandon = () => {
    setShowModal(false);
    setIsAbandoned(false);
    setIsSuccess(false);
    setFormData({ company_name: '', industry: '', name: '', email: '', phone: '', website: '', instagram: '' });
  };

  // --- Success State ---
  if (isSuccess) {
    return (
      <div className="flex justify-center z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card p-12 text-center max-w-lg w-full animate-pulse-glow"
        >
            <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {isAbandoned ? (
              <>
                <h3 className="section-heading text-2xl mb-3">Audit Running!</h3>
                <p className="text-muted leading-relaxed text-sm">
                  We are analyzing <span className="text-brand-quinary font-semibold block mt-1 break-all">{formData.company_name}</span>
                  in the background.
                </p>
                <p className="text-muted/70 leading-relaxed text-xs mt-3">
                  Feel free to submit again later and attach your email if you want the professional PDF version sent to your inbox!
                </p>
              </>
            ) : (
              <>
                <h3 className="section-heading text-2xl mb-3">Audit Initiated!</h3>
                <p className="text-muted leading-relaxed text-sm">
                  Our AI is currently auditing <span className="text-brand-quinary font-semibold block mt-1 break-all">{formData.company_name}</span>.
                </p>
                <p className="text-muted leading-relaxed text-sm mt-2">
                  A high-fidelity strategy roadmap PDF will be emailed to <strong className="text-white">{formData.email}</strong> within minutes.
                </p>
              </>
            )}

            <button
              onClick={() => {
                setIsSuccess(false);
                setIsAbandoned(false);
                setFormData({ company_name: '', industry: '', name: '', email: '', phone: '', website: '', instagram: '' });
              }}
              className="mt-8 text-sm text-brand-primary hover:text-brand-quinary transition-colors cursor-pointer"
            >
              Analyze another brand →
            </button>
          </motion.div>
      </div>
    );
  }

  // --- Form & Modal State ---
  return (
    <>
      {/* Primary Form Input Container */}
      <div className="w-full max-w-xl mx-auto z-20 relative px-4">
        <form onSubmit={handleInitialSubmit} className="flex flex-col sm:flex-row gap-3 w-full items-stretch">
          {/* Input field */}
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

          {/* Action Button */}
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

        {/* Server Error */}
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-lg bg-error/10 border border-error/20 p-3 text-xs text-error font-medium text-center"
          >
            {serverError}
          </motion.div>
        )}
      </div>

      {/* --- Details Capture Modal --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleAbandon}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              data-lenis-prevent
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative z-10 bg-white max-w-4xl w-full p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[95vh] rounded-3xl"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleAbandon}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-full transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                  Let&apos;s personalize your audit
                </h3>
                <p className="text-sm text-gray-600">
                  Provide your details to receive the high-fidelity strategy roadmap PDF.
                </p>
              </div>

              <form onSubmit={handleDetailsSubmit} className="space-y-6 text-left">
                
                {/* Brand Information */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Brand Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="modal_company_name" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                        Brand Name
                      </label>
                      <input
                        id="modal_company_name"
                        name="company_name"
                        type="text"
                        value={formData.company_name}
                        onChange={handleChange}
                        placeholder="Acme Inc."
                        className={`w-full px-3 py-2.5 rounded-xl outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-gray-900 text-sm ${fieldErrors.company_name ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
                      />
                      {fieldErrors.company_name && (
                        <p className="text-[11px] text-error font-medium">{fieldErrors.company_name[0]}</p>
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <label htmlFor="industry" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                        Industry <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="industry"
                        name="industry"
                        value={formData.industry}
                        onChange={handleChange}
                        className={`form-select w-full px-3 py-2.5 rounded-xl outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-gray-900 text-sm ${fieldErrors.industry ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
                      >
                        <option value="" className="bg-white text-gray-900">Select industry</option>
                        {INDUSTRY_OPTIONS.map((industry) => (
                          <option key={industry} value={industry} className="bg-white text-gray-900">
                            {industry}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.industry && (
                        <p className="text-[11px] text-error font-medium">{fieldErrors.industry[0]}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="website" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                        Website URL <span className="font-normal normal-case opacity-70">(optional)</span>
                      </label>
                      <input
                        id="website"
                        name="website"
                        type="text"
                        value={formData.website}
                        onChange={handleChange}
                        placeholder="https://yourwebsite.com"
                        className="w-full px-3 py-2.5 rounded-xl outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-gray-900 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Contact Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                        Full Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Jane Smith"
                        className={`w-full px-3 py-2.5 rounded-xl outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-gray-900 text-sm ${fieldErrors.name ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
                      />
                      {fieldErrors.name && (
                        <p className="text-[11px] text-error font-medium">{fieldErrors.name[0]}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="email" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="jane@company.com"
                        className={`w-full px-3 py-2.5 rounded-xl outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-gray-900 text-sm ${fieldErrors.email ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
                      />
                      {fieldErrors.email && (
                        <p className="text-[11px] text-error font-medium">{fieldErrors.email[0]}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="phone" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                        Phone Number <span className="font-normal normal-case opacity-70">(optional)</span>
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-3 py-2.5 rounded-xl outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-gray-900 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Socials */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="instagram" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                      Instagram <span className="font-normal normal-case opacity-70">(optional)</span>
                    </label>
                    <input
                      id="instagram"
                      name="instagram"
                      type="text"
                      value={formData.instagram}
                      onChange={handleChange}
                      placeholder="@yourbrand"
                      className="w-full px-3 py-2.5 rounded-xl outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-gray-900 text-sm"
                    />
                  </div>
                </div>


                {/* Submit Details Button */}
                <button
                  type="submit"
                  disabled={isDetailsSubmitting}
                  className={`btn-primary w-full text-sm font-bold py-4 mt-6 rounded-xl shadow-[0_0_20px_rgba(225,49,49,0.2)] ${isDetailsSubmitting ? 'btn-shimmer' : ''}`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {isDetailsSubmitting ? 'Submitting Details...' : 'Complete & Generate PDF Audit'}
                    {!isDetailsSubmitting && (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </span>
                </button>

                {/* <div className="flex flex-col sm:flex-row justify-end items-center mt-4 pt-4 border-t border-gray-200 gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Your details are 100% secure
                  </div>
                </div> */}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
