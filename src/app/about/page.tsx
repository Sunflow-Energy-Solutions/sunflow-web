import type { Metadata } from "next";
import { Compass, Eye, Target } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import QuoteCtaBanner from "@/components/home/QuoteCtaBanner";
import { coreValues } from "@/lib/faq-data";
import { SunburstMotif } from "@/components/icons/DecorativeArt";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Sunflow Energy Solutions — Melbourne's trusted team for solar, battery storage and EV charging installations across Victoria.",
};

const stats = [
  { value: "2,500+", label: "Systems Installed" },
  { value: "15+", label: "Years Combined Experience" },
  { value: "4.9/5", label: "Average Customer Rating" },
  { value: "100%", label: "Clean Energy Council Accredited" },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About Sunflow Energy Solutions"
        title="Melbourne's trusted partner for a smarter energy future"
        description="We're on a mission to make premium solar, battery and EV charging technology accessible, honest and genuinely worth investing in."
      />

      <section className="bg-white py-24 sm:py-28">
        <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our Story" title="Built by Victorians, for Victorians" />
            <div className="mt-6 space-y-4 text-base leading-relaxed text-mist-500">
              <Reveal delay={80}>
                <p>
                  Sunflow Energy Solutions was founded with a simple belief: switching to
                  clean energy shouldn&rsquo;t mean navigating confusing jargon, pushy sales
                  tactics or unreliable installations. We started as a small team of
                  licensed electricians and energy engineers in Melbourne, frustrated by
                  an industry that too often prioritised quick sales over long-term
                  performance.
                </p>
              </Reveal>
              <Reveal delay={150}>
                <p>
                  Today, we design and install solar, battery storage and EV charging
                  systems for homeowners, businesses and government bodies across
                  Victoria — backed by Clean Energy Council accreditation, premium
                  tier-1 equipment, and a genuine commitment to doing right by every
                  customer.
                </p>
              </Reveal>
              <Reveal delay={220}>
                <p>
                  We&rsquo;re proud to be a local business that shows up, answers the
                  phone, and stands behind our work for years after switch-on day.
                </p>
              </Reveal>
            </div>
          </div>

          <Reveal delay={100}>
            <div className="relative mx-auto aspect-square w-full max-w-sm">
              <SunburstMotif className="absolute inset-0 h-full w-full animate-spin-slow" />
              <div className="absolute inset-0 grid grid-cols-2 gap-4 p-10">
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col items-center justify-center text-center">
                    <span className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">{s.value}</span>
                    <span className="mt-1 text-xs font-medium text-mist-500">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-mist-50 py-24 sm:py-28">
        <Container>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { Icon: Compass, title: "Our Mission", desc: "To make premium, reliable clean energy technology accessible to every Victorian home, business and government body — through honest advice and expert installation." },
              { Icon: Eye, title: "Our Vision", desc: "A Victoria where every rooftop generates clean power, every home has energy independence, and every vehicle charges from the sun." },
              { Icon: Target, title: "Our Promise", desc: "Transparent pricing, accredited workmanship, and long-term support — so your investment keeps performing for decades to come." },
            ].map(({ Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 90}>
                <div className="h-full rounded-3xl border border-mist-200 bg-white p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-solar-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-navy-950">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mist-500">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-24 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="Core Values"
            title="Why customers trust Sunflow"
            description="These principles guide every quote, every install and every follow-up call."
            align="center"
          />
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {coreValues.map((value, i) => (
              <Reveal key={value.title} delay={i * 80}>
                <div className="flex h-full gap-4 rounded-2xl border border-mist-200 p-6">
                  <span className="font-display text-3xl font-bold text-solar-500/50">{`0${i + 1}`}</span>
                  <div>
                    <h3 className="font-display font-semibold text-navy-950">{value.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-mist-500">{value.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <QuoteCtaBanner />
    </>
  );
}
