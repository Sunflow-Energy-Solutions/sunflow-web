import type { Metadata } from "next";
import { BatteryCharging, Check, CloudLightning, PiggyBank, ShieldAlert, Zap } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import QuoteCtaBanner from "@/components/home/QuoteCtaBanner";
import { BatteryArt } from "@/components/icons/DecorativeArt";

export const metadata: Metadata = {
  title: "Battery Storage",
  description:
    "Home and commercial battery energy storage systems (BESS) for energy independence and blackout backup power across Melbourne and Victoria.",
};

const benefits = [
  { Icon: PiggyBank, title: "Maximise Solar Savings", desc: "Store excess solar generated during the day and use it at night instead of buying grid power." },
  { Icon: ShieldAlert, title: "Blackout Backup Power", desc: "Keep essential circuits running during outages with automatic battery backup." },
  { Icon: Zap, title: "Energy Independence", desc: "Reduce reliance on the grid and protect yourself from rising electricity prices." },
  { Icon: CloudLightning, title: "Smart Energy Management", desc: "App-based monitoring and smart charging/discharging to optimise your energy use and tariffs." },
];

const products = [
  {
    name: "Sunflow Home 10",
    capacity: "10.2 kWh",
    best: "Small–medium households",
    features: ["Wall or floor mount", "10-year performance warranty", "Backup power for essential circuits", "App monitoring & scheduling"],
  },
  {
    name: "Sunflow Home 15",
    capacity: "15.3 kWh",
    best: "Larger households & EV owners",
    features: ["Whole-home backup capable", "Expandable in 5kWh modules", "10-year performance warranty", "Solar + EV smart integration"],
    featured: true,
  },
  {
    name: "Sunflow Commercial Modular",
    capacity: "30 kWh – 200 kWh+",
    best: "Business & government sites",
    features: ["Fully modular & scalable", "Demand-charge reduction", "Remote fleet monitoring", "Grant & incentive support"],
  },
];

export default function BatteryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Battery Storage"
        title="Store the sun. Power your home, day or night."
        description="Home and commercial battery energy storage systems (BESS) that turn your solar into round-the-clock energy independence."
      />

      <section className="bg-white py-24 sm:py-28">
        <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <Reveal>
            <BatteryArt className="mx-auto h-72 w-72" />
          </Reveal>
          <div>
            <SectionHeading eyebrow="Why Add a Battery" title="Get more from every panel you own" />
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {benefits.map(({ Icon, title, desc }, i) => (
                <Reveal key={title} delay={i * 90}>
                  <div className="flex gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-solar-400">
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
        </Container>
      </section>

      <section className="bg-navy-950 py-24 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="Energy Independence"
            title="Backup power when you need it most"
            description="Victorian summers bring storms and grid instability. A Sunflow battery keeps your fridge, lights and essential circuits running automatically — no generator required."
            light
          />
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { stat: "< 20ms", label: "Automatic switchover to backup power" },
              { stat: "72+ hrs", label: "Typical essential-circuit backup runtime*" },
              { stat: "24/7", label: "Remote monitoring via the Sunflow app" },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 100}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-7 text-center">
                  <p className="font-display text-3xl font-bold text-solar-400">{item.stat}</p>
                  <p className="mt-2 text-sm text-mist-300">{item.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-mist-400">
            *Runtime varies based on battery size, connected loads and usage patterns.
          </p>
        </Container>
      </section>

      <section className="bg-mist-50 py-24 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="Product Options"
            title="Battery systems for every property"
            description="From single-home backup to multi-site commercial storage — we'll help you choose the right capacity for your needs."
            align="center"
          />
          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {products.map((p, i) => (
              <Reveal key={p.name} delay={i * 100}>
                <div
                  className={`flex h-full flex-col rounded-3xl border p-8 ${
                    p.featured
                      ? "border-solar-500 bg-white shadow-xl shadow-solar-500/10 lg:-translate-y-3"
                      : "border-mist-200 bg-white"
                  }`}
                >
                  {p.featured && (
                    <span className="mb-4 w-fit rounded-full bg-solar-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-navy-950">
                      Most Popular
                    </span>
                  )}
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-solar-400">
                    <BatteryCharging className="h-5.5 w-5.5" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-navy-950">{p.name}</h3>
                  <p className="mt-1 text-sm font-medium text-solar-600">{p.capacity} usable capacity</p>
                  <p className="mt-1 text-sm text-mist-500">Best for: {p.best}</p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-navy-800">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-solar-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Button href="/quote" variant={p.featured ? "solar" : "outline"} className="w-full justify-center">
                      Get a Quote
                    </Button>
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
