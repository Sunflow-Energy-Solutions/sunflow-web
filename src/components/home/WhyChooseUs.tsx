import { Award, BadgeCheck, HeartHandshake, LineChart, ShieldCheck, Wrench } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

const reasons = [
  {
    icon: BadgeCheck,
    title: "Accredited Experts",
    desc: "Clean Energy Council accredited installers and licensed electricians on every job, residential to government scale.",
  },
  {
    icon: ShieldCheck,
    title: "Premium, Tier-1 Equipment",
    desc: "We only install proven, bankable panels, batteries and chargers backed by strong manufacturer warranties.",
  },
  {
    icon: LineChart,
    title: "Transparent, Honest Pricing",
    desc: "Itemised, obligation-free quotes with no hidden costs and no high-pressure sales tactics — ever.",
  },
  {
    icon: Wrench,
    title: "End-to-End Service",
    desc: "From design and approvals to installation, grid connection and ongoing maintenance — we handle it all.",
  },
  {
    icon: HeartHandshake,
    title: "Local & Long-Term Support",
    desc: "A genuine Melbourne-based team you can call for monitoring, servicing and warranty support for years to come.",
  },
  {
    icon: Award,
    title: "Residential, Commercial & Government",
    desc: "Trusted across every sector, from single homes to multi-site commercial rollouts and public infrastructure.",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-mist-50 py-24 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Why Choose Sunflow"
          title="Trusted expertise, engineered for results"
          description="We combine premium technology with honest advice and meticulous installation standards — so your investment performs for decades."
        />

        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={(i % 3) * 90}>
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-solar-400">
                  <Icon className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-navy-950">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-mist-500">{desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
