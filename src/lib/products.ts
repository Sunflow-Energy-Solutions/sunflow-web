import type { CommercialCharger, ResidentialCharger } from "./charger-types";

export type Product = {
  id: string;
  name: string;
  category: "Home Charger" | "Commercial Charger" | "Accessory";
  phase: "Single Phase" | "Three Phase" | "Both" | "N/A";
  powerKw: number;
  ipRating: string;
  solarSmart: boolean;
  loadManagement: boolean;
  connector: "Type 2" | "Type 1" | "CCS2" | "N/A";
  mount: "Wall" | "Pedestal" | "N/A";
  price: number;
  image: string;
  blurb: string;
  features: string[];
};

export const products: Product[] = [
  {
    id: "acc-cable-type2",
    name: "Type 2 to Type 2 Charging Cable (7m)",
    category: "Accessory",
    phase: "N/A",
    powerKw: 0,
    ipRating: "N/A",
    solarSmart: false,
    loadManagement: false,
    connector: "Type 2",
    mount: "N/A",
    price: 189,
    image: "cable-type2",
    blurb: "Heavy-duty 32A charging cable for public and untethered home chargers.",
    features: ["7 metre length", "32A rated", "Weatherproof housing", "Carry bag included"],
  },
  {
    id: "acc-wall-mount",
    name: "Cable Wall Mount Holster",
    category: "Accessory",
    phase: "N/A",
    powerKw: 0,
    ipRating: "N/A",
    solarSmart: false,
    loadManagement: false,
    connector: "N/A",
    mount: "Wall",
    price: 59,
    image: "wall-mount",
    blurb: "Keep your charging cable tidy, protected and off the garage floor.",
    features: ["UV-stable plastic", "Fits most cable gauges", "Easy 15-minute install"],
  },
  {
    id: "acc-load-manager",
    name: "Sunflow Smart Load Manager",
    category: "Accessory",
    phase: "Three Phase",
    powerKw: 0,
    ipRating: "IP54",
    solarSmart: true,
    loadManagement: true,
    connector: "N/A",
    mount: "Wall",
    price: 549,
    image: "load-manager",
    blurb: "Add dynamic load management and solar-smart charging to any compatible charger.",
    features: ["Retrofits most chargers", "Prevents circuit overload", "Solar excess-power detection"],
  },
];

function phaseToProductPhase(phase: string): Product["phase"] {
  if (phase === "Single") return "Single Phase";
  if (phase === "Three") return "Three Phase";
  if (phase === "Both") return "Both";
  return "N/A";
}

/** Converts a spec-sheet charger (with a known RRP) into a cart-compatible Product. POA chargers should use the quote flow instead. */
export function chargerToCartProduct(charger: ResidentialCharger | CommercialCharger): Product {
  const powerMatch = charger.power.match(/[\d.]+/);
  return {
    id: charger.id,
    name: `${charger.brand} — ${charger.variant}`,
    category: charger.category === "Residential" ? "Home Charger" : "Commercial Charger",
    phase: phaseToProductPhase(charger.phase),
    powerKw: powerMatch ? parseFloat(powerMatch[0]) : 0,
    ipRating: charger.ipRating,
    solarSmart: charger.solarSmart ?? false,
    loadManagement: charger.loadManagement,
    connector: "connectorType" in charger && charger.connectorType.includes("Type 2") ? "Type 2" : "N/A",
    mount: "N/A",
    price: charger.price ?? 0,
    image: "",
    blurb: charger.notes || `${charger.power} ${charger.category.toLowerCase()} EV charger.`,
    features: [],
  };
}
