import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { SolarPanelArt, BatteryArt, EVChargerArt } from "@/components/icons/DecorativeArt";

const services = [
  {
    title: "Solar Panel Installation",
    desc: "High-efficiency PV systems for residential, commercial and government sites — engineered to maximise generation and long-term savings.",
    href: "/solar",
    Art: SolarPanelArt,
  },
  {
    title: "Battery Storage Systems",
    desc: "Store your solar energy and stay powered through outages with smart BESS systems built for energy independence.",
    href: "/battery",
    Art: BatteryArt,
  },
  {
    title: "EV Charger Installation",
    desc: "Fast, safe, solar-smart EV charging for homes, workplaces and fleet depots — plus a full range to shop online.",
    href: "/ev-charging",
    Art: EVChargerArt,
  },
];

export default function ServicesOverview() {
  return (
    <section className="bg-white py-24 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="What We Do"
          title="One partner for solar, battery and EV charging"
          description="From your first consultation to switch-on day and beyond, Sunflow Energy Solutions delivers end-to-end clean energy systems across Victoria."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {services.map(({ title, desc, href, Art }, i) => (
            <Reveal key={title} delay={i * 90}>
              <Link
                href={href}
                className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-mist-200 bg-mist-50 p-8 transition-all duration-300 hover:-translate-y-1.5 hover:border-solar-500/40 hover:shadow-2xl hover:shadow-navy-900/10"
              >
                <div className="absolute -right-8 -top-8 h-40 w-40 opacity-90 transition-transform duration-500 group-hover:scale-110">
                  <Art className="h-full w-full" />
                </div>
                <div className="relative mt-24">
                  <h3 className="font-display text-xl font-semibold text-navy-950">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mist-500">{desc}</p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors group-hover:text-solar-600">
                    Learn more
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
