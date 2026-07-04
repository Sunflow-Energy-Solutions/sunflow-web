import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import ContactForm from "@/components/forms/ContactForm";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Sunflow Energy Solutions for solar, battery storage and EV charging enquiries across Melbourne and Victoria.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact Us"
        title="Let's talk about your energy goals"
        description="Whether you're ready for a free quote or just have questions, our Melbourne-based team is here to help."
      />

      <section className="bg-white py-24 sm:py-28">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-8">
            <Reveal>
              <div className="rounded-3xl border border-mist-200 bg-mist-50 p-8">
                <h3 className="font-display text-lg font-semibold text-navy-950">Get in Touch</h3>
                <ul className="mt-5 space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-solar-600" />
                    {siteConfig.phoneHref ? (
                      <a href={siteConfig.phoneHref} className="font-medium text-navy-900 hover:text-solar-600">
                        {siteConfig.phone}
                      </a>
                    ) : (
                      <span className="font-medium text-navy-700">{siteConfig.phone}</span>
                    )}
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-solar-600" />
                    <a href={`mailto:${siteConfig.email}`} className="font-medium text-navy-900 hover:text-solar-600">
                      {siteConfig.email}
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-solar-600" />
                    <span className="font-medium text-navy-900">{siteConfig.address}</span>
                  </li>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-3xl border border-mist-200 p-8">
                <h3 className="font-display text-lg font-semibold text-navy-950">Service Areas</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {siteConfig.serviceAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-navy-900/5 px-3 py-1.5 text-xs font-medium text-navy-800"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div className="overflow-hidden rounded-3xl border border-mist-200">
                <iframe
                  title="Sunflow Energy Solutions service area map — Melbourne, Victoria"
                  src="https://www.google.com/maps?q=Melbourne,VIC,Australia&output=embed"
                  className="h-72 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </Reveal>
          </div>

          <Reveal delay={100}>
            <ContactForm />
          </Reveal>
        </Container>
      </section>
    </>
  );
}
