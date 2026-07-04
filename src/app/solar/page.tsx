import type { Metadata } from "next";
import { Building2, Home, Sun, TrendingDown, ShieldCheck, Zap } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import FaqAccordion from "@/components/ui/FaqAccordion";
import QuoteCtaBanner from "@/components/home/QuoteCtaBanner";
import { SolarPanelArt } from "@/components/icons/DecorativeArt";
import { solarFaqs } from "@/lib/faq-data";

export const metadata: Metadata = {
  title: "Solar Solutions",
  description:
    "Residential and commercial solar panel installation across Melbourne and Victoria. High-efficiency PV systems, transparent pricing, and expert installation.",
};

const benefits = [
  { Icon: TrendingDown, title: "Slash Your Energy Bills", desc: "Cut your electricity costs by up to 90% with a correctly sized, high-efficiency solar system." },
  { Icon: Zap, title: "Energy Independence", desc: "Generate your own clean power and rely less on the grid and rising energy prices." },
  { Icon: ShieldCheck, title: "Long-Term Reliability", desc: "Tier-1 panels and inverters backed by 10–30 year warranties and CEC-accredited installation." },
  { Icon: Sun, title: "Boost Property Value", desc: "Solar systems are proven to increase resale value and buyer appeal for homes and commercial sites." },
];

export default function SolarPage() {
  return (
    <>
      <PageHeader
        eyebrow="Solar Solutions"
        title="High-performance solar, engineered for Victorian conditions"
        description="From single-storey homes to large commercial rooftops, we design and install solar PV systems that maximise generation and long-term savings."
      />

      <section className="bg-white py-24 sm:py-28">
        <Container className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="flex h-full flex-col rounded-3xl border border-mist-200 bg-mist-50 p-8 sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-solar-400">
                <Home className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold text-navy-950">Residential Solar</h3>
              <p className="mt-3 text-base leading-relaxed text-mist-500">
                Tailored home solar systems sized to your household&rsquo;s energy use, roof
                orientation and future plans — including EV charging and battery storage.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-navy-800">
                {["6.6kW – 13.3kW systems for most homes", "Solar Victoria rebate & interest-free loan support", "Single-day installation by licensed electricians", "Real-time monitoring via app"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-solar-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button href="/quote" size="md">Get Residential Quote</Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="flex h-full flex-col rounded-3xl border border-mist-200 bg-navy-950 p-8 text-white sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-solar-500 text-navy-950">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold">Commercial &amp; Government Solar</h3>
              <p className="mt-3 text-base leading-relaxed text-mist-300">
                Large-scale rooftop and ground-mount solar for offices, warehouses, retail,
                schools and government facilities — with full engineering and compliance support.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-mist-200">
                {["30kW – 500kW+ commercial-scale systems", "Grant & incentive application support", "Multi-site rollout project management", "Detailed ROI & payback modelling"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-solar-400" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button href="/quote" size="md">Get Commercial Quote</Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-mist-50 py-24 sm:py-28">
        <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Why Go Solar" title="The benefits of switching to solar" />
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {benefits.map(({ Icon, title, desc }, i) => (
                <Reveal key={title} delay={i * 90}>
                  <div className="flex gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-solar-600 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-navy-950">{title}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-mist-500">{desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={100}>
            <SolarPanelArt className="mx-auto h-72 w-72" />
          </Reveal>
        </Container>
      </section>

      <section className="bg-white py-24 sm:py-28">
        <Container className="max-w-3xl">
          <SectionHeading eyebrow="FAQ" title="Solar questions, answered" align="center" />
          <div className="mt-12">
            <FaqAccordion items={solarFaqs} />
          </div>
        </Container>
      </section>

      <QuoteCtaBanner />
    </>
  );
}
