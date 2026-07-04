import type { Metadata } from "next";
import { Battery, Building2, Home, MapPin, Sun, Zap } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import QuoteCtaBanner from "@/components/home/QuoteCtaBanner";
import BeforeAfterSlider from "@/components/projects/BeforeAfterSlider";

export const metadata: Metadata = {
  title: "Projects & Gallery",
  description:
    "Browse recent Sunflow Energy Solutions installations, before & after transformations and case studies across residential, commercial and government sites in Victoria.",
};

const installations = [
  { name: "Berwick Family Home", type: "Residential Solar + Battery", size: "10kW + 13.5kWh", Icon: Home },
  { name: "Richmond Retail Fitout", type: "Commercial Solar", size: "85kW", Icon: Building2 },
  { name: "Geelong Council Depot", type: "Government EV Charging", size: "6-bay 22kW", Icon: Zap },
  { name: "Brighton Coastal Residence", type: "Residential Solar + EV", size: "8.8kW + 7kW Charger", Icon: Sun },
  { name: "Dandenong Logistics Hub", type: "Commercial Battery Storage", size: "120kWh", Icon: Battery },
  { name: "Ballarat Family Home", type: "Residential Solar", size: "13.3kW", Icon: Home },
];

const caseStudies = [
  {
    title: "Cutting a Richmond retailer's demand charges by 38%",
    summary:
      "An 85kW commercial rooftop system paired with load monitoring reduced peak demand charges and delivered payback in under 4 years.",
    stats: [{ label: "Annual savings", value: "$24,600" }, { label: "Payback period", value: "3.8 yrs" }],
  },
  {
    title: "Whole-home energy independence in Brighton",
    summary:
      "Solar, battery and EV charging installed together gave this beachside family near-total energy independence, even through summer blackouts.",
    stats: [{ label: "Grid reliance cut", value: "91%" }, { label: "Backup runtime", value: "3+ days" }],
  },
  {
    title: "Geelong Council fleet electrification rollout",
    summary:
      "A 6-bay commercial charging hub with load management now powers the council's growing EV fleet without straining local infrastructure.",
    stats: [{ label: "Vehicles supported", value: "24" }, { label: "Rollout time", value: "6 weeks" }],
  },
];

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Projects & Gallery"
        title="Real installations across Melbourne and Victoria"
        description="Explore recent solar, battery and EV charging projects — from single homes to commercial and government sites."
      />

      <section className="bg-white py-24 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="Before & After"
            title="See the transformation"
            description="Drag the slider to compare before and after our installation teams get to work."
          />
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            <Reveal>
              <BeforeAfterSlider title="Berwick Family Home" location="Berwick, VIC — 10kW Solar + Battery" />
            </Reveal>
            <Reveal delay={100}>
              <BeforeAfterSlider title="Richmond Retail Fitout" location="Richmond, VIC — 85kW Commercial Solar" />
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="bg-mist-50 py-24 sm:py-28">
        <Container>
          <SectionHeading eyebrow="Recent Installations" title="A snapshot of our recent work" />
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {installations.map(({ name, type, size, Icon }, i) => (
              <Reveal key={name} delay={i * 70}>
                <div className="flex h-full flex-col rounded-2xl border border-mist-200 bg-white p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-solar-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display font-semibold text-navy-950">{name}</h3>
                  <p className="mt-1 text-sm text-mist-500">{type}</p>
                  <p className="mt-3 text-sm font-medium text-solar-600">{size}</p>
                  <p className="mt-4 flex items-center gap-1.5 text-xs text-mist-400">
                    <MapPin className="h-3.5 w-3.5" /> Victoria, Australia
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-24 sm:py-28">
        <Container>
          <SectionHeading eyebrow="Case Studies" title="The results speak for themselves" />
          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {caseStudies.map((cs, i) => (
              <Reveal key={cs.title} delay={i * 100}>
                <div className="flex h-full flex-col rounded-3xl border border-mist-200 bg-mist-50 p-8">
                  <h3 className="font-display text-lg font-semibold leading-snug text-navy-950">{cs.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-mist-500">{cs.summary}</p>
                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-mist-200 pt-5">
                    {cs.stats.map((stat) => (
                      <div key={stat.label}>
                        <p className="font-display text-xl font-bold text-solar-600">{stat.value}</p>
                        <p className="text-xs text-mist-500">{stat.label}</p>
                      </div>
                    ))}
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
