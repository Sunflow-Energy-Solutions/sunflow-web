import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import CompareTabs from "@/components/shop/CompareTabs";

export const metadata: Metadata = {
  title: "Compare EV Chargers",
  description:
    "Compare full specifications for residential and commercial EV chargers — phase, power, IP rating, solar-smart charging, load management, OCPP compatibility, bi-directional charging and price.",
};

export default function CompareChargersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Charger Comparison"
        title="Compare EV charger specifications side by side"
        description="A full technical reference for every charger we supply — filter by phase, IP rating, smart features and price to find the right fit before you buy."
      />

      <Container className="py-4 sm:py-6">
        <Link
          href="/ev-charging/shop"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-mist-200 px-4 py-2 text-sm font-medium text-navy-900 transition-colors hover:border-solar-500 hover:text-solar-600"
        >
          <ShoppingBag className="h-4 w-4" />
          Prefer a simple view? Browse the shop instead
        </Link>
      </Container>

      <CompareTabs />
    </>
  );
}
