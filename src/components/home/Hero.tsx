import Image from "next/image";
import { ShieldCheck, Star, MapPin } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";

const trustBadges = [
  { icon: ShieldCheck, label: "Clean Energy Council Accredited" },
  { icon: Star, label: "5-Star Customer Rated" },
  { icon: MapPin, label: "Melbourne & Victoria-Wide" },
];

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950">
      <div className="absolute inset-0">
        <Image
          src="/images/hero-home.png"
          alt="Modern designer home in Melbourne featuring rooftop solar panels, a home battery unit and an EV charger with an electric car plugged in"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-navy-950/10" />
      </div>

      <Container className="relative flex min-h-[560px] flex-col justify-center py-16 sm:min-h-[620px] sm:py-20 lg:min-h-[680px]">
        <div className="max-w-2xl rounded-3xl bg-navy-950/55 p-6 shadow-2xl shadow-navy-950/30 backdrop-blur-md sm:p-8 lg:p-9">
          <Reveal>
            <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-solar-400 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-solar-500" />
              Residential &middot; Commercial &middot; Government
            </span>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="font-display text-balance text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-[3.4rem]">
              Power Your World,
              <span className="text-solar-400"> The Smart Way</span>
            </h1>
          </Reveal>

          <Reveal delay={170}>
            <p className="mt-6 text-balance text-lg leading-relaxed text-mist-200 sm:text-xl">
              Premium solar panels, home battery storage and EV charger installation
              for Victorian homes, businesses and government — designed, engineered
              and installed by local experts you can trust.
            </p>
          </Reveal>

          <Reveal delay={250}>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button href="/quote" size="lg">
                Get Your Free Quote
              </Button>
              <Button href="/solar" variant="outline-light" size="lg">
                Explore Our Solutions
              </Button>
            </div>
          </Reveal>

          <Reveal delay={330}>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-8">
              {trustBadges.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-sm font-medium text-mist-200">
                  <Icon className="h-5 w-5 text-solar-400" />
                  {label}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
