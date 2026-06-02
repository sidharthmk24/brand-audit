export default function FooterSection() {
  const currentYear = 2026; // Hardcoded to match screenshot, or use new Date().getFullYear()

  return (
    <footer className="bg-[#141414] py-8 sm:py-12" id="footer">
      <div className="section-container">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          
          {/* Copyright */}
          <p className="text-[11px] sm:text-xs text-[#666] font-medium tracking-wide">
            All Rights Reserved | Megamind Advertising Private Limited ©{currentYear}
          </p>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-[11px] sm:text-xs text-[#666] hover:text-white transition-colors font-medium tracking-wide"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="text-[11px] sm:text-xs text-[#666] hover:text-white transition-colors font-medium tracking-wide"
            >
              Privacy Policy
            </a>
          </div>
          
        </div>
      </div>
    </footer>
  );
}
