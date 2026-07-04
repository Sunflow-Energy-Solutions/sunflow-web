import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import Container from "@/components/ui/Container";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TikTokIcon,
  YoutubeIcon,
} from "@/components/icons/BrandIcons";

const socials = [
  { label: "Facebook", href: siteConfig.social.facebook, Icon: FacebookIcon },
  { label: "Instagram", href: siteConfig.social.instagram, Icon: InstagramIcon },
  { label: "TikTok", href: siteConfig.social.tiktok, Icon: TikTokIcon },
  { label: "LinkedIn", href: siteConfig.social.linkedin, Icon: LinkedinIcon },
  { label: "YouTube", href: siteConfig.social.youtube, Icon: YoutubeIcon },
];

const footerColumns = [
  {
    title: "Solutions",
    links: [
      { label: "Solar Solutions", href: "/solar" },
      { label: "Battery Storage", href: "/battery" },
      { label: "EV Charging", href: "/ev-charging" },
      { label: "Shop EV Chargers", href: "/ev-charging/shop" },
      { label: "Compare Chargers", href: "/ev-charging/compare" },
      { label: "Savings Calculator", href: "/#calculator" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Projects & Gallery", href: "/projects" },
      { label: "Blog", href: "/blog" },
      { label: "Contact Us", href: "/contact" },
      { label: "Free Quote", href: "/quote" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-mist-300">
      <Container className="grid grid-cols-1 gap-12 py-16 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center rounded-xl bg-white px-3 py-2">
            <Image
              src="/images/logo-cropped.png"
              alt={`${siteConfig.name} logo`}
              width={380}
              height={124}
              className="h-11 w-auto"
            />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-mist-400">
            Premium solar, battery storage and EV charging installations for homes,
            businesses and government across Melbourne and Victoria.
          </p>
          <div className="mt-6 flex items-center gap-2">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 text-mist-300 transition-colors hover:border-solar-500 hover:text-solar-400"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {footerColumns.map((col) => (
          <div key={col.title}>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
              {col.title}
            </h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-mist-400 transition-colors hover:text-solar-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
            Get in Touch
          </h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-solar-400" />
              {siteConfig.phoneHref ? (
                <a href={siteConfig.phoneHref} className="hover:text-solar-400">
                  {siteConfig.phone}
                </a>
              ) : (
                <span className="text-mist-400">{siteConfig.phone}</span>
              )}
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-solar-400" />
              <a href={`mailto:${siteConfig.email}`} className="hover:text-solar-400">
                {siteConfig.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-solar-400" />
              <span className="text-mist-400">{siteConfig.address}</span>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-3 py-6 text-xs text-mist-500 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved. {siteConfig.abn}
          </p>
          <div className="flex gap-5">
            <Link href="/contact" className="hover:text-solar-400">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-solar-400">Terms of Service</Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}
