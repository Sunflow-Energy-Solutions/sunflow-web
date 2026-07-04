"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, Lock, ShoppingBag, Trash2 } from "lucide-react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import { useCart } from "@/lib/cart-context";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(price);
}

export default function CheckoutPage() {
  const { items, subtotal, removeItem, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      clearCart();
    }, 1200);
  }

  if (submitted) {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-solar-500/15 text-solar-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-navy-950">Order received!</h1>
        <p className="mt-3 max-w-md text-mist-500">
          Thank you for your order. A Sunflow team member will contact you within one
          business day to confirm your order and arrange professional installation.
        </p>
        <Button href="/ev-charging/shop" size="lg" className="mt-8">
          Continue Shopping
        </Button>
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container className="flex min-h-[50vh] flex-col items-center justify-center py-24 text-center">
        <ShoppingBag className="h-12 w-12 text-mist-300" />
        <h1 className="mt-5 font-display text-2xl font-bold text-navy-950">Your cart is empty</h1>
        <p className="mt-2 text-mist-500">Add a charger or accessory to your cart before checking out.</p>
        <Button href="/ev-charging/shop" size="lg" className="mt-7">
          Browse Chargers
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-14 sm:py-20">
      <h1 className="font-display text-3xl font-bold text-navy-950 sm:text-4xl">Checkout</h1>
      <p className="mt-2 text-mist-500">Complete your details below. Our team will confirm installation scheduling after your order.</p>

      <form onSubmit={handleSubmit} className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <fieldset className="rounded-2xl border border-mist-200 p-6">
            <legend className="px-2 font-display font-semibold text-navy-950">Contact Details</legend>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-navy-800">First name</label>
                <input id="firstName" required type="text" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-navy-800">Last name</label>
                <input id="lastName" required type="text" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
              </div>
              <div>
                <label htmlFor="checkoutEmail" className="block text-sm font-medium text-navy-800">Email</label>
                <input id="checkoutEmail" required type="email" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
              </div>
              <div>
                <label htmlFor="checkoutPhone" className="block text-sm font-medium text-navy-800">Phone</label>
                <input id="checkoutPhone" required type="tel" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-mist-200 p-6">
            <legend className="px-2 font-display font-semibold text-navy-950">Installation Address</legend>
            <div className="grid grid-cols-1 gap-5">
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-navy-800">Street address</label>
                <input id="street" required type="text" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <label htmlFor="suburb" className="block text-sm font-medium text-navy-800">Suburb</label>
                  <input id="suburb" required type="text" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-navy-800">State</label>
                  <input id="state" defaultValue="VIC" required type="text" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
                </div>
                <div>
                  <label htmlFor="postcode" className="block text-sm font-medium text-navy-800">Postcode</label>
                  <input id="postcode" required type="text" inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
                </div>
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-mist-200 p-6">
            <legend className="flex items-center gap-2 px-2 font-display font-semibold text-navy-950">
              <CreditCard className="h-4.5 w-4.5" /> Payment Details
            </legend>
            <div className="grid grid-cols-1 gap-5">
              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-navy-800">Card number</label>
                <input id="cardNumber" required type="text" placeholder="•••• •••• •••• ••••" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label htmlFor="expiry" className="block text-sm font-medium text-navy-800">Expiry</label>
                  <input id="expiry" required type="text" placeholder="MM/YY" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
                </div>
                <div>
                  <label htmlFor="cvc" className="block text-sm font-medium text-navy-800">CVC</label>
                  <input id="cvc" required type="text" placeholder="•••" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
                </div>
              </div>
              <p className="flex items-center gap-2 text-xs text-mist-400">
                <Lock className="h-3.5 w-3.5" />
                This is a demo checkout — no payment is processed. Live payments will be enabled via Stripe at launch.
              </p>
            </div>
          </fieldset>
        </div>

        <div className="h-fit rounded-2xl border border-mist-200 bg-mist-50 p-6">
          <h2 className="font-display font-semibold text-navy-950">Order Summary</h2>
          <ul className="mt-5 space-y-4">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-navy-900">{product.name}</p>
                  <p className="text-mist-500">Qty {quantity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-navy-950">{formatPrice(product.price * quantity)}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(product.id)}
                    aria-label={`Remove ${product.name}`}
                    className="cursor-pointer text-mist-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2 border-t border-mist-200 pt-5 text-sm">
            <div className="flex justify-between text-mist-500">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-mist-500">
              <span>GST (10%)</span>
              <span>{formatPrice(gst)}</span>
            </div>
            <div className="flex justify-between font-display text-lg font-bold text-navy-950">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          <Button type="submit" disabled={submitting} size="lg" className="mt-6 w-full justify-center">
            {submitting ? "Placing order..." : "Place Order"}
          </Button>
          <p className="mt-4 text-center text-xs text-mist-400">
            <Link href="/ev-charging/shop" className="underline hover:text-navy-700">
              Continue shopping
            </Link>
          </p>
        </div>
      </form>
    </Container>
  );
}
