"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";

export default function ShopDetailActions({ cartProduct }: { cartProduct: Product | null }) {
  const { addItem } = useCart();

  if (!cartProduct) {
    return (
      <Link
        href="/quote"
        className="flex h-12 w-full max-w-xs cursor-pointer items-center justify-center rounded-full border-2 border-navy-900 px-6 text-sm font-semibold text-navy-900 transition-colors hover:bg-navy-900 hover:text-white sm:text-base"
      >
        Get a Free Quote
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => addItem(cartProduct)}
      className="flex h-12 w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-full bg-navy-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-solar-500 hover:text-navy-950 sm:text-base"
    >
      <ShoppingCart className="h-4 w-4" />
      Add to Cart
    </button>
  );
}
