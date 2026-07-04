import type { Metadata } from "next";
import { Building2, Home, ShoppingBag, Zap } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import QuoteCtaBanner from "@/components/home/QuoteCtaBanner";
import { EVChargerArt } from "@/components/icons/DecorativeArt";
import { evVehicleCompatibility } from "@/lib/faq-data";

export const metadata: Metadata = {
  title: "EV Charging",
  description:
    "Home, commercial and government EV charger installation across Melbourne and Victoria. Solar-smart, load-managed charging, plus a full online shop.",
};

export default function EvChargingPage() {
  return (
    <>
      <PageHeader
        eyebrow="EV Charging"
        title="Fast, safe EV charging for home, work and fleet"
        description="From single home chargers to multi-bay commercial and government charging hubs, we design, supply and install EV charging solutions across Victoria."
      />

      <section className="bg-white py-24 sm:py-28">
        <Container className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="flex h-full flex-col rounded-3xl border border-mist-200 bg-mist-50 p-8 sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-900 text-solar-400">
                <Home className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold text-navy-950">Home Charging</h3>
              <p className="mt-3 text-base leading-relaxed text-mist-500">
                Charge overnight at a fraction of public charging costs. Our home chargers
                integrate with solar for smart, low-cost charging.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-navy-800">
                {["7kW – 22kW single & three-phase options", "Solar-smart excess-power charging", "Wall or freestanding pedestal mount", "App control & scheduling"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-solar-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button href="/quote" size="md">Get Home Charger Quote</Button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="flex h-full flex-col rounded-3xl border border-mist-200 bg-navy-950 p-8 text-white sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-solar-500 text-navy-950">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold">Commercial &amp; Government Charging</h3>
              <p className="mt-3 text-base leading-relaxed text-mist-300">
                Multi-bay charging for staff, customers, fleets and public sites — with
                load management to protect your electrical infrastructure.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-mist-200">
                {["Dual and multi-outlet charging stations", "DC fast charging for fleet depots", "Dynamic load management", "OCPP backend & RFID billing integration"].map((item) => (
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
          <Reveal>
            <EVChargerArt className="mx-auto h-72 w-72" />
          </Reveal>
          <div>
            <SectionHeading eyebrow="Shop Online" title="Buy your EV charger directly from us" />
            <p className="mt-4 text-base leading-relaxed text-mist-500">
              Browse our full range of home and commercial EV chargers and accessories,
              then order online — professional installation is arranged right after
              checkout. Need the full technical specs first? Compare every charger
              side by side.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/ev-charging/shop" size="lg" icon={<ShoppingBag className="h-4 w-4" />}>
                Shop EV Chargers
              </Button>
              <Button href="/ev-charging/compare" variant="outline" size="lg">
                Compare Chargers
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white py-24 sm:py-28">
        <Container>
          <SectionHeading
            eyebrow="Vehicle Compatibility"
            title="Compatible with every major EV on Australian roads"
            description="Our chargers support all Type 2 (AC) and CCS2 (DC) compatible vehicles sold in Australia — including these popular makes and models."
          />
          <Reveal delay={100}>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-mist-200">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-navy-950 text-white">
                    <th scope="col" className="px-5 py-4 font-display font-semibold">Make</th>
                    <th scope="col" className="px-5 py-4 font-display font-semibold">Popular Models</th>
                    <th scope="col" className="px-5 py-4 font-display font-semibold">Connector Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-200">
                  {evVehicleCompatibility.map((v, i) => (
                    <tr key={v.make} className={i % 2 === 0 ? "bg-white" : "bg-mist-50"}>
                      <th scope="row" className="flex items-center gap-2 px-5 py-4 font-medium text-navy-950">
                        <Zap className="h-4 w-4 text-solar-500" /> {v.make}
                      </th>
                      <td className="px-5 py-4 text-mist-600">{v.models}</td>
                      <td className="px-5 py-4 text-mist-600">{v.connector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <p className="mt-4 text-xs text-mist-400">
            Not sure if your vehicle is compatible? Contact us and we&rsquo;ll confirm before you order.
          </p>
        </Container>
      </section>

      <QuoteCtaBanner />
    </>
  );
}
