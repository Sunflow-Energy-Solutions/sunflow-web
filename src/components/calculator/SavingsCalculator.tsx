"use client";

import { useMemo, useState } from "react";
import { Calculator, Leaf, PiggyBank, TrendingUp } from "lucide-react";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";

const PROPERTY_TYPES = [
  { label: "Residential", value: "residential", ratePerKw: 1350 },
  { label: "Commercial", value: "commercial", ratePerKw: 1550 },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SavingsCalculator() {
  const [bill, setBill] = useState(350);
  const [propertyType, setPropertyType] = useState<"residential" | "commercial">("residential");
  const [hasBattery, setHasBattery] = useState(false);

  const results = useMemo(() => {
    const monthlyBill = bill;
    const annualBill = monthlyBill * 12;
    const offsetRate = propertyType === "residential" ? 0.82 : 0.75;
    const annualSavings = annualBill * offsetRate * (hasBattery ? 1.12 : 1);
    const recommendedKw = Math.max(4, Math.round((monthlyBill / 45) * 2) / 2);
    const rate = PROPERTY_TYPES.find((p) => p.value === propertyType)!.ratePerKw;
    const systemCost = recommendedKw * rate + (hasBattery ? 9500 : 0);
    const paybackYears = systemCost / annualSavings;
    const co2TonnesPerYear = recommendedKw * 1.4;

    return {
      annualSavings: Math.round(annualSavings),
      tenYearSavings: Math.round(annualSavings * 10),
      recommendedKw,
      systemCost: Math.round(systemCost),
      paybackYears: Math.max(1.5, Math.round(paybackYears * 10) / 10),
      co2TonnesPerYear: Math.round(co2TonnesPerYear * 10) / 10,
    };
  }, [bill, propertyType, hasBattery]);

  return (
    <section id="calculator" className="bg-mist-50 py-24 sm:py-28 scroll-mt-24">
      <Container>
        <SectionHeading
          eyebrow="Savings Calculator"
          title="See what solar could save you"
          description="Get an instant, ballpark estimate — then request a free, no-obligation quote for exact numbers tailored to your property."
        />

        <Reveal delay={100}>
          <div className="mt-14 grid grid-cols-1 gap-0 overflow-hidden rounded-3xl border border-mist-200 bg-white shadow-xl shadow-navy-900/5 lg:grid-cols-2">
            <div className="p-8 sm:p-10">
              <div className="mb-6 flex items-center gap-2 text-navy-900">
                <Calculator className="h-5 w-5 text-solar-600" />
                <h3 className="font-display text-lg font-semibold">Tell us about your property</h3>
              </div>

              <label className="block text-sm font-medium text-navy-800">
                Property type
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setPropertyType(type.value as "residential" | "commercial")}
                    className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                      propertyType === type.value
                        ? "border-navy-900 bg-navy-900 text-white"
                        : "border-mist-200 text-navy-700 hover:border-navy-300"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <label htmlFor="bill" className="mt-6 block text-sm font-medium text-navy-800">
                Average monthly electricity bill: <span className="font-semibold text-solar-600">{formatCurrency(bill)}</span>
              </label>
              <input
                id="bill"
                type="range"
                min={80}
                max={1500}
                step={10}
                value={bill}
                onChange={(e) => setBill(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-mist-200 accent-solar-500"
              />
              <div className="mt-1 flex justify-between text-xs text-mist-400">
                <span>$80</span>
                <span>$1,500+</span>
              </div>

              <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-mist-200 px-4 py-3 text-sm font-medium text-navy-800 hover:border-navy-300">
                <input
                  type="checkbox"
                  checked={hasBattery}
                  onChange={(e) => setHasBattery(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-solar-500"
                />
                Include a home battery in my estimate
              </label>
            </div>

            <div className="flex flex-col justify-between bg-navy-950 p-8 text-white sm:p-10">
              <div>
                <p className="text-sm font-medium text-mist-300">Your estimated results</p>
                <div className="mt-5 grid grid-cols-2 gap-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-solar-400">
                      <PiggyBank className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Annual savings</span>
                    </div>
                    <p className="mt-1.5 font-display text-2xl font-bold sm:text-3xl">
                      {formatCurrency(results.annualSavings)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-solar-400">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">10-year savings</span>
                    </div>
                    <p className="mt-1.5 font-display text-2xl font-bold sm:text-3xl">
                      {formatCurrency(results.tenYearSavings)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-mist-400">Recommended system</span>
                    <p className="mt-1.5 font-display text-xl font-semibold">{results.recommendedKw} kW</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-mist-400">Est. payback period</span>
                    <p className="mt-1.5 font-display text-xl font-semibold">{results.paybackYears} yrs</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm text-mist-200">
                  <Leaf className="h-4 w-4 shrink-0 text-solar-400" />
                  Cuts approx. {results.co2TonnesPerYear} tonnes of CO&#8322; per year
                </div>
              </div>

              <Button href="/quote" size="lg" className="mt-8 w-full justify-center">
                Get My Accurate Free Quote
              </Button>
              <p className="mt-3 text-center text-xs text-mist-400">
                Estimate only. Final pricing confirmed after a free site assessment.
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
