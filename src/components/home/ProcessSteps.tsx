import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { processSteps } from "@/lib/faq-data";

export default function ProcessSteps() {
  return (
    <section className="relative overflow-hidden bg-navy-950 py-24 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <Container className="relative">
        <SectionHeading
          eyebrow="How It Works"
          title="Your journey to energy independence, in 4 steps"
          description="A simple, transparent process from first contact to a fully commissioned system — with our team supporting you at every stage."
          light
        />

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, i) => (
            <Reveal key={step.step} delay={i * 100}>
              <div className="relative h-full rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
                <span className="font-display text-4xl font-bold text-white/10">{step.step}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-mist-300">{step.desc}</p>
                {i < processSteps.length - 1 && (
                  <div className="absolute -right-4 top-1/2 hidden h-px w-8 -translate-y-1/2 bg-gradient-to-r from-solar-500/60 to-transparent lg:block" />
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={420}>
          <div className="mt-14 flex justify-center">
            <Button href="/quote" size="lg">
              Start Your Free Consultation
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
