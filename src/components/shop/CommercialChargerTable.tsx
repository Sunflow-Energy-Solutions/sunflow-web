"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownAZ, ArrowDownWideNarrow, ArrowUpWideNarrow, Maximize2, Minimize2, SlidersHorizontal, X } from "lucide-react";
import clsx from "clsx";
import { commercialChargers } from "@/lib/commercial-chargers";
import { chargerToCartProduct } from "@/lib/products";
import { formatChargerPrice } from "@/lib/charger-utils";
import { useCart } from "@/lib/cart-context";
import FeatureIcon from "./FeatureIcon";
import FilterPillGroup from "./FilterPillGroup";
import FilterCheckbox from "./FilterCheckbox";
import PriceRangeFilter from "./PriceRangeFilter";
import ChargerThumbnail from "./ChargerThumbnail";
import ChargerTableShell from "./ChargerTableShell";

type SortMode = "name" | "price-asc" | "price-desc";

const PHASE_OPTIONS = ["Single", "Three", "Both"] as const;
const HEADER_CELL = "sticky top-0 z-20 bg-navy-950 px-4 py-3.5 font-display font-semibold whitespace-nowrap";

export default function CommercialChargerTable() {
  const { addItem } = useCart();
  const prices = commercialChargers.map((c) => c.price).filter((p): p is number => p !== null);
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const ipRatings = Array.from(new Set(commercialChargers.map((c) => c.ipRating))).sort();
  const chargerTypes = Array.from(new Set(commercialChargers.map((c) => c.chargerType))).sort();

  const [chargerType, setChargerType] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [ipRating, setIpRating] = useState<string | null>(null);
  const [loadManagementOnly, setLoadManagementOnly] = useState(false);
  const [ocppOnly, setOcppOnly] = useState(false);
  const [bidirectionalOnly, setBidirectionalOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(priceMax);
  const [sort, setSort] = useState<SortMode>("name");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const isPriceFiltered = maxPrice < priceMax;
    const list = commercialChargers.filter((c) => {
      if (chargerType && c.chargerType !== chargerType) return false;
      if (phase && c.phase !== phase) return false;
      if (ipRating && c.ipRating !== ipRating) return false;
      if (loadManagementOnly && !c.loadManagement) return false;
      if (ocppOnly && !c.ocppCompatible) return false;
      if (bidirectionalOnly && !c.bidirectional) return false;
      if (isPriceFiltered) {
        if (c.price === null || c.price > maxPrice) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      if (sort === "price-asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
      if (sort === "price-desc") return (b.price ?? -Infinity) - (a.price ?? -Infinity);
      return a.brand.localeCompare(b.brand);
    });
  }, [chargerType, phase, ipRating, loadManagementOnly, ocppOnly, bidirectionalOnly, maxPrice, sort, priceMax]);

  const resetFilters = () => {
    setChargerType(null);
    setPhase(null);
    setIpRating(null);
    setLoadManagementOnly(false);
    setOcppOnly(false);
    setBidirectionalOnly(false);
    setMaxPrice(priceMax);
  };

  const filterPanel = (
    <div className="space-y-6 rounded-3xl border border-mist-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-navy-950">Filter Chargers</h3>
        <button type="button" onClick={resetFilters} className="cursor-pointer text-xs font-medium text-solar-600 hover:underline">
          Reset all
        </button>
      </div>
      <PriceRangeFilter min={priceMin} max={priceMax} value={maxPrice} onChange={setMaxPrice} />
      <FilterPillGroup label="Charger Type" options={chargerTypes} active={chargerType} onChange={setChargerType} />
      <FilterPillGroup label="Phase" options={PHASE_OPTIONS} active={phase} onChange={setPhase} />
      <FilterPillGroup label="IP Rating" options={ipRatings} active={ipRating} onChange={setIpRating} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">Features</p>
        <div className="mt-2.5 space-y-2">
          <FilterCheckbox label="Load / Power Management" checked={loadManagementOnly} onChange={setLoadManagementOnly} />
          <FilterCheckbox label="OCPP Compatible" checked={ocppOnly} onChange={setOcppOnly} />
          <FilterCheckbox label="Bi-directional (V2G/V2H)" checked={bidirectionalOnly} onChange={setBidirectionalOnly} />
        </div>
      </div>
    </div>
  );

  const expandButton = (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-mist-200 px-3 py-1.5 text-xs font-medium text-navy-700 hover:border-navy-300"
    >
      {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      {expanded ? "Collapse" : "Expand"}
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm text-mist-500">{filtered.length} chargers</p>
        <div className="flex items-center gap-2">
          {expandButton}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-mist-200 px-4 py-2 text-sm font-medium text-navy-900"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:mt-0 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <div className="sticky top-24">{filterPanel}</div>
        </div>

        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="absolute inset-0 bg-navy-950/50" onClick={() => setMobileFiltersOpen(false)} aria-hidden="true" />
            <div className="relative ml-auto h-full w-full max-w-xs overflow-y-auto bg-mist-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display font-semibold text-navy-950">Filters</h3>
                <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters" className="cursor-pointer rounded-full p-2 hover:bg-mist-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {filterPanel}
            </div>
          </div>
        )}

        <div>
          <div className="hidden items-center justify-between lg:flex">
            <p className="text-sm text-mist-500">{filtered.length} chargers found</p>
            <div className="flex items-center gap-1.5">
              {expandButton}
              <span className="mx-1 h-4 w-px bg-mist-200" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setSort("name")}
                className={clsx("flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", sort === "name" ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 text-navy-700")}
              >
                <ArrowDownAZ className="h-3.5 w-3.5" /> Name
              </button>
              <button
                type="button"
                onClick={() => setSort("price-asc")}
                className={clsx("flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", sort === "price-asc" ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 text-navy-700")}
              >
                <ArrowUpWideNarrow className="h-3.5 w-3.5" /> Price: Low
              </button>
              <button
                type="button"
                onClick={() => setSort("price-desc")}
                className={clsx("flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", sort === "price-desc" ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 text-navy-700")}
              >
                <ArrowDownWideNarrow className="h-3.5 w-3.5" /> Price: High
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-mist-300 p-14 text-center text-mist-500">
              No chargers match your filters. Try resetting them.
            </div>
          ) : (
            <ChargerTableShell
              title="Commercial Chargers"
              subtitle={`${filtered.length} chargers found`}
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
            >
              <table className="w-full min-w-[2500px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-navy-950 text-white">
                    <th scope="col" className={clsx(HEADER_CELL, "sticky left-0 z-30")}>Charger</th>
                    <th scope="col" className={HEADER_CELL}>Price</th>
                    <th scope="col" className={HEADER_CELL}>Type</th>
                    <th scope="col" className={HEADER_CELL}>Phase</th>
                    <th scope="col" className={HEADER_CELL}>Power</th>
                    <th scope="col" className={HEADER_CELL}>Ports</th>
                    <th scope="col" className={HEADER_CELL}>IP</th>
                    <th scope="col" className={HEADER_CELL}>Dimensions</th>
                    <th scope="col" className={HEADER_CELL}>Weight</th>
                    <th scope="col" className={HEADER_CELL}>Cable Length</th>
                    <th scope="col" className={HEADER_CELL}>Display</th>
                    <th scope="col" className={HEADER_CELL}>Load Mgmt</th>
                    <th scope="col" className={HEADER_CELL}>Multi-user</th>
                    <th scope="col" className={HEADER_CELL}>Internet</th>
                    <th scope="col" className={HEADER_CELL}>App Control</th>
                    <th scope="col" className={HEADER_CELL}>OCPP</th>
                    <th scope="col" className={HEADER_CELL}>V2G/V2H</th>
                    <th scope="col" className={HEADER_CELL}>Operating Temp</th>
                    <th scope="col" className={HEADER_CELL}>Warranty</th>
                    <th scope="col" className={HEADER_CELL}>Origin</th>
                    <th scope="col" className={HEADER_CELL}>&nbsp;</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-200">
                  {filtered.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-mist-50"}>
                      <th scope="row" className="sticky left-0 z-10 bg-inherit px-4 py-3.5 font-medium text-navy-950">
                        <Link href={`/ev-charging/shop/${c.id}`} className="flex cursor-pointer items-center gap-3 hover:text-solar-600">
                          <ChargerThumbnail
                            kind={c.chargerType.toLowerCase().includes("dc") ? "commercial-dc" : "commercial-ac"}
                            brand={c.brand}
                            photoUrl={c.photoUrl}
                            photoFit={c.photoFit}
                            className="h-12 w-12 shrink-0 rounded-lg"
                            badgeClassName="-bottom-1 -right-1 h-5 w-5"
                            initialsClassName="text-xs"
                          />
                          <div className="whitespace-nowrap">
                            {c.brand}
                            <div className="text-xs font-normal text-mist-500">{c.variant}</div>
                          </div>
                        </Link>
                      </th>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-navy-950">
                        {formatChargerPrice(c.price, c.priceDisplay)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-mist-600">{c.chargerType}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-mist-600">{c.phase}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-mist-600">{c.power}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-mist-600">{c.numberOfPorts}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-mist-600">{c.ipRating}</td>
                      <td className="w-44 whitespace-normal px-4 py-3.5 text-mist-600">{c.dimensions}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-mist-600">{c.weight}</td>
                      <td className="w-40 whitespace-normal px-4 py-3.5 text-mist-600">{c.cableLength}</td>
                      <td className="w-36 whitespace-normal px-4 py-3.5 text-mist-600">{c.display}</td>
                      <td className="px-4 py-3.5"><FeatureIcon active={c.loadManagement} label="Load Management" /></td>
                      <td className="px-4 py-3.5"><FeatureIcon active={c.multiUser} label="Multi-user Support" /></td>
                      <td className="px-4 py-3.5"><FeatureIcon active={c.internetConnection} label="Internet Connection" /></td>
                      <td className="px-4 py-3.5"><FeatureIcon active={c.appControl} label="App Control" /></td>
                      <td className="px-4 py-3.5"><FeatureIcon active={c.ocppCompatible} label="OCPP Compatible" /></td>
                      <td className="px-4 py-3.5"><FeatureIcon active={c.bidirectional} label="Bi-directional" /></td>
                      <td className="w-40 whitespace-normal px-4 py-3.5 text-mist-600">{c.operatingTemp}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-mist-600">{c.warrantyYears}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-mist-600">{c.countryOfManufacture}</td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {c.price !== null ? (
                          <button
                            type="button"
                            onClick={() => addItem(chargerToCartProduct(c))}
                            className="cursor-pointer rounded-full bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-solar-500 hover:text-navy-950"
                          >
                            Add to Cart
                          </button>
                        ) : (
                          <a
                            href="/quote"
                            className="inline-block cursor-pointer rounded-full border border-navy-900 px-3.5 py-2 text-xs font-semibold text-navy-900 transition-colors hover:bg-navy-900 hover:text-white"
                          >
                            Get Quote
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ChargerTableShell>
          )}
        </div>
      </div>
    </div>
  );
}
