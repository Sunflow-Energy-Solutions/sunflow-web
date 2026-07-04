import { CheckCircle2 } from "lucide-react";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { SunburstMotif } from "@/components/icons/DecorativeArt";

const points = [
  "In-depth energy usage audit and bill analysis",
  "Independent advice — solar, battery, EV or all three",
  "Rebate and incentive eligibility assessment",
  "ROI and payback modelling tailored to your site",
];

export default function ConsultingSection() {
  return (
    <section className="bg-white py-24 sm:py-28">
      <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <SunburstMotif className="absolute inset-0 h-full w-full animate-spin-slow" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-display text-5xl font-bold text-navy-950">15+</span>
              <span className="mt-1 text-sm font-medium text-mist-500">Years combined<br />industry experience</span>
            </div>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-solar-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-navy-700">
              <span className="h-1.5 w-1.5 rounded-full bg-solar-500" />
              Energy Consultation
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display text-balance text-3xl font-semibold tracking-tight text-navy-950 sm:text-4xl">
              Not sure where to start? Talk to a real energy consultant.
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-4 text-lg leading-relaxed text-mist-500">
              Every property is different. Our consultants review your energy usage, budget
              and goals to recommend the right mix of solar, battery and EV charging —
              with clear numbers, not sales pressure.
            </p>
          </Reveal>

          <ul className="mt-8 space-y-3">
            {points.map((point, i) => (
              <Reveal key={point} delay={200 + i * 70}>
                <li className="flex items-start gap-3 text-navy-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-solar-500" />
                  <span>{point}</span>
                </li>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={480}>
            <div className="mt-9">
              <Button href="/quote" variant="navy" size="lg">
                Book a Free Consultation
              </Button>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
