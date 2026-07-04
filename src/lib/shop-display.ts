import { residentialChargers } from "./residential-chargers";
import { commercialChargers } from "./commercial-chargers";
import { products, chargerToCartProduct, type Product } from "./products";

export type ThumbnailKind = "residential" | "commercial-ac" | "commercial-dc" | "accessory";

export type ShopGridItem = {
  id: string;
  name: string;
  brand: string;
  subtitle: string;
  price: number | null;
  priceDisplay: string | null;
  thumbnail: ThumbnailKind;
  cartProduct: Product | null;
  powerValues: number[];
  photoUrl?: string;
  photoCredit?: string;
  photoFit?: "cover" | "contain";
};

function phaseLabel(phase: string) {
  if (phase === "Both") return "Single & Three Phase";
  if (phase === "N/A") return "";
  return `${phase} Phase`;
}

function parsePowerValues(power: string): number[] {
  const matches = [...power.matchAll(/([\d.]+)\s*kw/gi)];
  const values = matches
    .map((m) => Math.round(parseFloat(m[1]) * 10) / 10)
    .filter((n) => !Number.isNaN(n) && n > 0);
  return Array.from(new Set(values));
}

export const residentialShopItems: ShopGridItem[] = residentialChargers.map((c) => ({
  id: c.id,
  name: `${c.brand} ${c.variant}`,
  brand: c.brand,
  subtitle: `${c.power} · ${phaseLabel(c.phase)}`,
  price: c.price,
  priceDisplay: c.priceDisplay,
  thumbnail: "residential",
  cartProduct: c.price !== null ? chargerToCartProduct(c) : null,
  powerValues: parsePowerValues(c.power),
  photoUrl: c.photoUrl,
  photoCredit: c.photoCredit,
  photoFit: c.photoFit,
}));

export const commercialShopItems: ShopGridItem[] = commercialChargers.map((c) => ({
  id: c.id,
  name: `${c.brand} ${c.variant}`,
  brand: c.brand,
  subtitle: `${c.power} · ${c.chargerType}`,
  price: c.price,
  priceDisplay: c.priceDisplay,
  thumbnail: c.chargerType.toLowerCase().includes("dc") ? "commercial-dc" : "commercial-ac",
  cartProduct: c.price !== null ? chargerToCartProduct(c) : null,
  powerValues: parsePowerValues(c.power),
  photoUrl: c.photoUrl,
  photoCredit: c.photoCredit,
  photoFit: c.photoFit,
}));

export const accessoryShopItems: ShopGridItem[] = products.map((p) => ({
  id: p.id,
  name: p.name,
  brand: p.name,
  subtitle: p.blurb,
  price: p.price,
  priceDisplay: null,
  thumbnail: "accessory",
  cartProduct: p,
  powerValues: [],
  photoUrl: p.photoUrl,
  photoFit: "contain",
}));
