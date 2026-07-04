"use client";

import { useState } from "react";
import clsx from "clsx";
import Container from "@/components/ui/Container";
import ResidentialChargerTable from "./ResidentialChargerTable";
import CommercialChargerTable from "./CommercialChargerTable";
import { residentialChargers } from "@/lib/residential-chargers";
import { commercialChargers } from "@/lib/commercial-chargers";

const TABS = [
  { id: "residential", label: "Residential Chargers" },
  { id: "commercial", label: "Commercial Chargers" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CompareTabs() {
  const [tab, setTab] = useState<TabId>("residential");

  return (
    <div>
      <Container className="pt-12 sm:pt-16">
        <div className="flex flex-wrap gap-2 border-b border-mist-200 pb-px">
          {TABS.map((t) => {
            const count = t.id === "residential" ? residentialChargers.length : commercialChargers.length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  "relative cursor-pointer rounded-t-xl px-5 py-3 text-sm font-semibold transition-colors",
                  tab === t.id ? "bg-mist-50 text-navy-950" : "text-mist-500 hover:text-navy-800"
                )}
              >
                {t.label}
                <span className="ml-1.5 text-xs font-normal text-mist-400">({count})</span>
                {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-solar-500" />}
              </button>
            );
          })}
        </div>
      </Container>

      <div className="bg-mist-50">
        {tab === "residential" && (
          <Container className="py-10 sm:py-12">
            <ResidentialChargerTable />
          </Container>
        )}
        {tab === "commercial" && (
          <Container className="py-10 sm:py-12">
            <CommercialChargerTable />
          </Container>
        )}
      </div>
    </div>
  );
}
