"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown, ShoppingCart, Phone } from "lucide-react";
import clsx from "clsx";
import { navLinks, siteConfig } from "@/lib/site-config";
import Button from "@/components/ui/Button";
import { useCart } from "@/lib/cart-context";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  const { itemCount, openCart } = useCart();

  const [renderedPathname, setRenderedPathname] = useState(pathname);
  if (pathname !== renderedPathname) {
    setRenderedPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-navy-950/95 shadow-lg shadow-navy-950/10 backdrop-blur-md"
          : "bg-navy-950"
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center rounded-xl bg-white px-3 py-2 shadow-sm">
          <Image
            src="/images/logo-cropped.png"
            alt={`${siteConfig.name} logo`}
            width={380}
            height={124}
            priority
            className="h-10 w-auto sm:h-12"
          />
          <span className="sr-only">{siteConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <div
              key={link.href}
              className="relative"
              onMouseEnter={() => link.children && setOpenDropdown(link.href)}
              onMouseLeave={() => link.children && setOpenDropdown(null)}
            >
              <Link
                href={link.href}
                className={clsx(
                  "flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-solar-400"
                    : "text-mist-100 hover:text-white"
                )}
              >
                {link.label}
                {link.children && <ChevronDown className="h-3.5 w-3.5" />}
              </Link>
              {link.children && openDropdown === link.href && (
                <div className="absolute left-0 top-full pt-2">
                  <div className="w-52 overflow-hidden rounded-xl border border-white/10 bg-navy-900 py-2 shadow-xl">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block px-4 py-2.5 text-sm text-mist-100 hover:bg-navy-800 hover:text-solar-400"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={openCart}
            aria-label={`Open cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            className="relative hidden cursor-pointer rounded-full p-2.5 text-mist-100 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-solar-500 text-[10px] font-bold text-navy-950">
                {itemCount}
              </span>
            )}
          </button>
          <Button href="/quote" size="sm" className="hidden sm:inline-flex">
            Get Free Quote
          </Button>
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="cursor-pointer rounded-full p-2.5 text-white transition-colors hover:bg-white/10 lg:hidden"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-navy-950 lg:hidden">
          <div className="space-y-1 px-5 py-4">
            {navLinks.map((link) => (
              <div key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-mist-100 hover:bg-white/5 hover:text-solar-400"
                >
                  {link.label}
                </Link>
                {link.children && (
                  <div className="ml-4 space-y-1 border-l border-white/10 pl-3">
                    {link.children.slice(1).map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block rounded-lg px-3 py-2 text-sm text-mist-300 hover:text-solar-400"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={openCart}
                className="relative inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-medium text-white"
              >
                <ShoppingCart className="h-4 w-4" /> Cart
                {itemCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-solar-500 text-[11px] font-bold text-navy-950">
                    {itemCount}
                  </span>
                )}
              </button>
              <Button href="/quote" size="sm" className="flex-1">
                Get Free Quote
              </Button>
            </div>
            {siteConfig.phoneHref && (
              <a href={siteConfig.phoneHref} className="mt-3 flex items-center gap-2 px-3 text-sm text-mist-300">
                <Phone className="h-4 w-4" /> {siteConfig.phone}
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
