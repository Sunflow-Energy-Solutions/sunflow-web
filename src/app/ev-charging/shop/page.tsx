import type { Metadata } from "next";
import Link from "next/link";
import { Rows3 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import ShopTabs from "@/components/shop/ShopTabs";

export const metadata: Metadata = {
  title: "Shop EV Chargers & Accessories",
  description:
    "Browse and buy home and commercial EV chargers, cables and accessories online. Professional installation is arranged after checkout.",
};

export default function ShopPage() {
  return (
    <>
      <PageHeader
        eyebrow="Shop EV Chargers"
        title="Buy your EV charger online"
        description="Browse our full range of residential and commercial chargers and accessories, then add to cart. Professional installation is arranged after checkout."
      />

      <Container className="py-4 sm:py-6">
        <Link
          href="/ev-charging/compare"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-mist-200 px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:border-solar-500 hover:text-solar-600"
        >
          <Rows3 className="h-4 w-4" />
          Need full specs? Compare every charger side by side
        </Link>
      </Container>

      <ShopTabs />
    </>
  );
}
