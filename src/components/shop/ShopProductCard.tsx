"use client";

import Link from "next/link";
import ChargerThumbnail from "./ChargerThumbnail";
import { useCart } from "@/lib/cart-context";
import type { ShopGridItem } from "@/lib/shop-display";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(price);
}

export default function ShopProductCard({ item }: { item: ShopGridItem }) {
  const { addItem } = useCart();

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-mist-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-navy-900/10">
      <Link href={`/ev-charging/shop/${item.id}`} className="cursor-pointer">
        <ChargerThumbnail
          kind={item.thumbnail}
          brand={item.brand}
          photoUrl={item.photoUrl}
          photoFit={item.photoFit}
          className="h-28 transition-transform duration-500 group-hover:scale-105 sm:h-32"
          initialsClassName="text-xl sm:text-2xl"
          badgeClassName="-bottom-1 -right-1 h-6 w-6"
        />
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <Link href={`/ev-charging/shop/${item.id}`} className="cursor-pointer hover:text-solar-600">
          <h3 className="line-clamp-2 font-display text-xs font-semibold leading-snug text-navy-950 sm:text-sm">
            {item.name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-1 text-[11px] text-mist-500 sm:text-xs">{item.subtitle}</p>

        <div className="mt-auto pt-3">
          <span className="font-display text-sm font-bold text-navy-950 sm:text-base">
            {item.price !== null ? formatPrice(item.price) : item.priceDisplay || "POA"}
          </span>
          {item.cartProduct ? (
            <button
              type="button"
              onClick={() => addItem(item.cartProduct!)}
              className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-navy-900 text-[11px] font-semibold text-white transition-colors hover:bg-solar-500 hover:text-navy-950 sm:text-xs"
            >
              Add to Cart
            </button>
          ) : (
            <Link
              href="/quote"
              className="mt-2 flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-navy-900 text-center text-[11px] font-semibold text-navy-900 transition-colors hover:bg-navy-900 hover:text-white sm:text-xs"
            >
              Get Quote
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
