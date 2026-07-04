"use client";

import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import clsx from "clsx";
import { useCart } from "@/lib/cart-context";
import Button from "@/components/ui/Button";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(price);
}

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, subtotal } = useCart();

  return (
    <>
      <div
        onClick={closeCart}
        aria-hidden="true"
        className={clsx(
          "fixed inset-0 z-[60] bg-navy-950/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        role="dialog"
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
        className={clsx(
          "fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-mist-200 px-6 py-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy-950">
            <ShoppingBag className="h-5 w-5 text-solar-600" />
            Your Cart ({items.reduce((n, i) => n + i.quantity, 0)})
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="cursor-pointer rounded-full p-2 text-navy-700 hover:bg-mist-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="h-10 w-10 text-mist-300" />
              <p className="mt-4 text-sm text-mist-500">Your cart is empty.</p>
              <Button href="/ev-charging/shop" size="sm" className="mt-5" onClick={closeCart}>
                Browse Chargers
              </Button>
            </div>
          ) : (
            <ul className="space-y-5">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-navy-950 text-solar-400">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-navy-950">{product.name}</p>
                    <p className="mt-0.5 text-xs text-mist-500">{formatPrice(product.price)} each</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-mist-200">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          aria-label="Decrease quantity"
                          className="cursor-pointer p-1.5 text-navy-700 hover:text-solar-600"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          aria-label="Increase quantity"
                          className="cursor-pointer p-1.5 text-navy-700 hover:text-solar-600"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        aria-label={`Remove ${product.name}`}
                        className="cursor-pointer text-mist-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-navy-950">
                    {formatPrice(product.price * quantity)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-mist-200 px-6 py-6">
            <div className="flex items-center justify-between text-sm text-mist-500">
              <span>Subtotal</span>
              <span className="font-display text-lg font-bold text-navy-950">{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-mist-400">Shipping and installation quoted at checkout.</p>
            <Button href="/ev-charging/checkout" size="lg" className="mt-4 w-full justify-center" onClick={closeCart}>
              Checkout
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
