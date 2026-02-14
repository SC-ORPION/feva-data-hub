import HeroSection from '@/components/landing/HeroSection';
import NetworksSection from '@/components/landing/NetworksSection';
import WhyChooseUs from '@/components/landing/WhyChooseUs';
import ResellerSection from '@/components/landing/ResellerSection';
import PricingSection from '@/components/landing/PricingSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import CTASection from '@/components/landing/CTASection';

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <NetworksSection />
      <WhyChooseUs />
      <ResellerSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
    </main>
  );
}
