import { Mail, Phone } from "lucide-react";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { siteConfig } from "@/lib/site-config";

export default function QuoteCtaBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-solar-500 via-solar-500 to-solar-600 py-20">
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-navy-950/10 blur-2xl" />
      <Container className="relative flex flex-col items-center gap-8 text-center lg:flex-row lg:justify-between lg:text-left">
        <Reveal className="max-w-xl">
          <h2 className="font-display text-balance text-3xl font-bold text-navy-950 sm:text-4xl">
            Ready to take control of your energy costs?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-navy-900/80 sm:text-lg">
            Get a free, no-obligation quote from Melbourne&rsquo;s trusted solar,
            battery and EV charging specialists.
          </p>
        </Reveal>

        <Reveal delay={120} className="flex flex-col items-center gap-4 lg:items-end">
          <Button href="/quote" variant="navy" size="lg" className="w-full sm:w-auto">
            Get My Free Quote
          </Button>
          <div className="flex flex-col items-center gap-2 text-sm font-medium text-navy-900 sm:flex-row sm:gap-5 lg:items-end">
            {siteConfig.phoneHref ? (
              <a href={siteConfig.phoneHref} className="flex items-center gap-1.5 hover:underline">
                <Phone className="h-4 w-4" /> {siteConfig.phone}
              </a>
            ) : (
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" /> {siteConfig.phone}
              </span>
            )}
            <a href={`mailto:${siteConfig.email}`} className="flex items-center gap-1.5 hover:underline">
              <Mail className="h-4 w-4" /> {siteConfig.email}
            </a>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
