"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import Container from "@/components/ui/Container";
import ShopGrid from "./ShopGrid";
import PowerFilterBar from "./PowerFilterBar";
import { residentialShopItems, commercialShopItems, accessoryShopItems } from "@/lib/shop-display";

const TABS = [
  { id: "residential", label: "Residential Chargers", items: residentialShopItems },
  { id: "commercial", label: "Commercial Chargers", items: commercialShopItems },
  { id: "accessories", label: "Accessories", items: accessoryShopItems },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ShopTabs() {
  const [tab, setTab] = useState<TabId>("residential");
  const [power, setPower] = useState<number | null>(null);
  const activeTab = TABS.find((t) => t.id === tab)!;

  const powerOptions = useMemo(
    () => Array.from(new Set(activeTab.items.flatMap((i) => i.powerValues))).sort((a, b) => a - b),
    [activeTab]
  );

  const filteredItems = useMemo(
    () => (power === null ? activeTab.items : activeTab.items.filter((i) => i.powerValues.includes(power))),
    [activeTab, power]
  );

  function selectTab(id: TabId) {
    setTab(id);
    setPower(null);
  }

  return (
    <div>
      <Container className="pt-12 sm:pt-16">
        <div className="flex flex-wrap gap-2 border-b border-mist-200 pb-px">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={clsx(
                "relative cursor-pointer rounded-t-xl px-5 py-3 text-sm font-semibold transition-colors",
                tab === t.id ? "bg-mist-50 text-navy-950" : "text-mist-500 hover:text-navy-800"
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs font-normal text-mist-400">({t.items.length})</span>
              {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-solar-500" />}
            </button>
          ))}
        </div>
      </Container>

      <div className="bg-mist-50 py-10 sm:py-12">
        <Container>
          <PowerFilterBar options={powerOptions} active={power} onChange={setPower} resultCount={filteredItems.length} />
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-mist-300 p-14 text-center text-mist-500">
              No products match this filter. Try a different power rating.
            </div>
          ) : (
            <ShopGrid items={filteredItems} />
          )}
        </Container>
      </div>
    </div>
  );
}
