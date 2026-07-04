import Hero from "@/components/home/Hero";
import ServicesOverview from "@/components/home/ServicesOverview";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import ProcessSteps from "@/components/home/ProcessSteps";
import ConsultingSection from "@/components/home/ConsultingSection";
import SavingsCalculator from "@/components/calculator/SavingsCalculator";
import QuoteCtaBanner from "@/components/home/QuoteCtaBanner";
import ContactStrip from "@/components/home/ContactStrip";

export default function Home() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <WhyChooseUs />
      <ProcessSteps />
      <ConsultingSection />
      <SavingsCalculator />
      <QuoteCtaBanner />
      <ContactStrip />
    </>
  );
}
