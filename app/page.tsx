import AnimatedBackground from '@/app/components/ui/animated-background';
import Header from '@/app/components/header';
import HeroSection from '@/app/components/hero-section';
import HowItWorksSection from '@/app/components/how-it-works-section';
import CtaSection from '@/app/components/cta-section';
import FooterSection from '@/app/components/footer-section';
import FeaturesSection from './components/features-section';

export default function Home() {
  return (
    <>
      <AnimatedBackground />
      <Header />

      <main className="relative z-10 flex-1">
        <HeroSection />
         <FeaturesSection />
        <HowItWorksSection />
        <CtaSection />
      </main>

      <div className="relative z-10">
        <FooterSection />
      </div>
    </>
  );
}
