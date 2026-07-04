import type { Metadata } from "next";
import { Clock, ShieldCheck, Sparkles } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import QuoteForm from "@/components/forms/QuoteForm";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Get a Free Quote",
  description:
    "Request a free, no-obligation solar, battery storage or EV charger quote from Sunflow Energy Solutions — Melbourne and Victoria-wide.",
};

const reassurances = [
  { Icon: Clock, title: "Fast Response", desc: "We reply to every enquiry within one business day." },
  { Icon: ShieldCheck, title: "No Obligation", desc: "Your quote is completely free, with zero pressure to proceed." },
  { Icon: Sparkles, title: "Tailored Advice", desc: "Every quote is customised to your property and energy goals." },
];

export default function QuotePage() {
  return (
    <>
      <PageHeader
        eyebrow="Free Quote"
        title="Get your free, no-obligation quote"
        description="Tell us a little about your property and energy goals — our consultants will do the rest."
      />

      <section className="bg-mist-50 py-24 sm:py-28">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {reassurances.map(({ Icon, title, desc }, i) => (
              <Reveal key={title} delay={i * 90}>
                <div className="flex gap-4 rounded-2xl border border-mist-200 bg-white p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-solar-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-navy-950">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-mist-500">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal delay={280}>
              <div className="rounded-2xl border border-mist-200 bg-navy-950 p-6 text-white">
                <p className="text-sm font-medium text-mist-300">Prefer to talk?</p>
                <p className="mt-1 font-display text-lg font-semibold">
                  {siteConfig.phoneHref ? (
                    <a href={siteConfig.phoneHref} className="hover:text-solar-400">{siteConfig.phone}</a>
                  ) : (
                    siteConfig.phone
                  )}
                </p>
                <p className="mt-2 text-sm text-mist-300">{siteConfig.email}</p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={100}>
            <QuoteForm />
          </Reveal>
        </Container>
      </section>
    </>
  );
}
