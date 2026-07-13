import { residentialChargers } from "./residential-chargers";
import { commercialChargers } from "./commercial-chargers";
import { products, chargerToCartProduct, type Product } from "./products";
import type { ResidentialCharger, CommercialCharger } from "./charger-types";
import type { ThumbnailKind } from "./shop-display";

export type SpecRow = { label: string; value: string };
export type FeatureFlag = { label: string; active: boolean };

export type ShopDetailItem = {
  id: string;
  name: string;
  brand: string;
  variant: string;
  categoryLabel: string;
  thumbnail: ThumbnailKind;
  photoUrl?: string;
  photoCredit?: string;
  photoFit?: "cover" | "contain";
  price: number | null;
  priceDisplay: string | null;
  overview: string;
  specs: SpecRow[];
  features: FeatureFlag[];
  cartProduct: Product | null;
};

function chargerOverview(c: ResidentialCharger | CommercialCharger): string {
  if (c.notes) return c.notes;
  const bits = [`The ${c.brand} ${c.variant} is a ${c.power} ${c.phase.toLowerCase()}-phase`];
  bits.push(c.category === "Commercial" ? `${(c as CommercialCharger).chargerType.toLowerCase()} commercial charger` : "home EV charger");
  bits.push(`rated ${c.ipRating} for weatherproofing, backed by a ${c.warrantyYears} warranty.`);
  return bits.join(" ");
}

function chargerSpecs(c: ResidentialCharger | CommercialCharger): SpecRow[] {
  const rows: SpecRow[] = [
    { label: "Phase", value: c.phase },
    { label: "Power", value: c.power },
    { label: "Rated Current", value: c.ratedCurrent },
  ];
  if (c.category === "Commercial") {
    const cc = c as CommercialCharger;
    rows.push({ label: "Charger Type", value: cc.chargerType });
    rows.push({ label: "Number of Ports", value: cc.numberOfPorts });
    rows.push({ label: "Connector Type", value: cc.connectorType });
  }
  rows.push(
    { label: "IP Rating", value: c.ipRating },
    { label: "Enclosure Dimensions", value: c.dimensions },
    { label: "Weight", value: c.weight },
    { label: "Cable Length", value: c.cableLength },
    { label: "Display", value: c.display }
  );
  if (c.category === "Residential") {
    rows.push({ label: "Charging Modes", value: (c as ResidentialCharger).chargingModes });
  } else {
    const cc = c as CommercialCharger;
    rows.push({ label: "Access / Auth Method", value: cc.accessMethod });
    rows.push({ label: "Payment Options", value: cc.paymentOptions });
    rows.push({ label: "Suitable Applications", value: cc.suitableApplications });
  }
  rows.push(
    { label: "Operating Temperature", value: c.operatingTemp },
    { label: "Warranty", value: c.warrantyYears },
    { label: "Country of Manufacture", value: c.countryOfManufacture }
  );
  return rows.filter((r) => r.value && r.value !== "N/A");
}

function chargerFeatures(c: ResidentialCharger | CommercialCharger): FeatureFlag[] {
  const flags: FeatureFlag[] = [];
  if (c.solarSmart !== undefined) flags.push({ label: "Solar Smart Charging", active: c.solarSmart });
  flags.push({ label: "Load Management / Balancing", active: c.loadManagement });
  if (c.category === "Residential") {
    flags.push({ label: "3-to-1 Phase Switching", active: (c as ResidentialCharger).phaseSwitching });
  }
  flags.push({ label: "Multi-user Support", active: c.multiUser });
  flags.push({ label: "Internet Connection", active: c.internetConnection });
  flags.push({ label: "App Control", active: c.appControl });
  flags.push({ label: "OCPP Compatible", active: c.ocppCompatible });
  flags.push({ label: "Bi-directional (V2G/V2H)", active: c.bidirectional });
  return flags;
}

function fromResidential(c: ResidentialCharger): ShopDetailItem {
  return {
    id: c.id,
    name: `${c.brand} ${c.variant}`,
    brand: c.brand,
    variant: c.variant,
    categoryLabel: "Residential Charger",
    thumbnail: "residential",
    photoUrl: c.photoUrl,
    photoCredit: c.photoCredit,
    photoFit: c.photoFit,
    price: c.price,
    priceDisplay: c.priceDisplay,
    overview: chargerOverview(c),
    specs: chargerSpecs(c),
    features: chargerFeatures(c),
    cartProduct: c.price !== null ? chargerToCartProduct(c) : null,
  };
}

function fromCommercial(c: CommercialCharger): ShopDetailItem {
  return {
    id: c.id,
    name: `${c.brand} ${c.variant}`,
    brand: c.brand,
    variant: c.variant,
    categoryLabel: "Commercial Charger",
    thumbnail: c.chargerType.toLowerCase().includes("dc") ? "commercial-dc" : "commercial-ac",
    photoUrl: c.photoUrl,
    photoCredit: c.photoCredit,
    photoFit: c.photoFit,
    price: c.price,
    priceDisplay: c.priceDisplay,
    overview: chargerOverview(c),
    specs: chargerSpecs(c),
    features: chargerFeatures(c),
    cartProduct: c.price !== null ? chargerToCartProduct(c) : null,
  };
}

function fromProduct(p: Product): ShopDetailItem {
  return {
    id: p.id,
    name: p.name,
    brand: p.name,
    variant: "",
    categoryLabel: "Accessory",
    thumbnail: "accessory",
    photoUrl: p.photoUrl,
    photoFit: "contain",
    price: p.price,
    priceDisplay: null,
    overview: p.blurb,
    specs: [],
    features: p.features.map((f) => ({ label: f, active: true })),
    cartProduct: p,
  };
}

export function getAllShopItemIds(): string[] {
  return [
    ...residentialChargers.map((c) => c.id),
    ...commercialChargers.map((c) => c.id),
    ...products.map((p) => p.id),
  ];
}

export function getShopItemDetail(id: string): ShopDetailItem | null {
  const residential = residentialChargers.find((c) => c.id === id);
  if (residential) return fromResidential(residential);
  const commercial = commercialChargers.find((c) => c.id === id);
  if (commercial) return fromCommercial(commercial);
  const product = products.find((p) => p.id === id);
  if (product) return fromProduct(product);
  return null;
}
