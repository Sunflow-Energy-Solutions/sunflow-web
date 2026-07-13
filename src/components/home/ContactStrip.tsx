import { Mail, MapPin, Phone } from "lucide-react";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { siteConfig } from "@/lib/site-config";

const items = [
  { icon: Phone, label: "Call Us", value: siteConfig.phone, href: siteConfig.phoneHref || undefined },
  { icon: Mail, label: "Email Us", value: siteConfig.email, href: `mailto:${siteConfig.email}` },
  { icon: MapPin, label: "Service Area", value: siteConfig.address, href: "/contact" },
];

export default function ContactStrip() {
  return (
    <section className="border-t border-mist-200 bg-white py-16">
      <Container>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {items.map(({ icon: Icon, label, value, href }, i) => {
            const content = (
              <div className="flex items-center gap-4 rounded-2xl border border-mist-200 px-6 py-5 transition-colors hover:border-solar-500/50">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-900 text-solar-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">{label}</p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-navy-900">{value}</p>
                </div>
              </div>
            );
            return (
              <Reveal key={label} delay={i * 80}>
                {href ? (
                  <a href={href} className="block cursor-pointer">
                    {content}
                  </a>
                ) : (
                  content
                )}
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
