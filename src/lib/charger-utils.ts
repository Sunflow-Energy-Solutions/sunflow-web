export function formatChargerPrice(price: number | null, priceDisplay: string | null) {
  if (price === null) return priceDisplay || "POA";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(price);
}
