import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Container from "@/components/ui/Container";
import ChargerThumbnail from "@/components/shop/ChargerThumbnail";
import ShopDetailActions from "@/components/shop/ShopDetailActions";
import FeatureIcon from "@/components/shop/FeatureIcon";
import { getAllShopItemIds, getShopItemDetail } from "@/lib/shop-detail";
import { formatChargerPrice } from "@/lib/charger-utils";

export function generateStaticParams() {
  return getAllShopItemIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = getShopItemDetail(id);
  if (!item) return { title: "Product Not Found" };
  return {
    title: item.name,
    description: item.overview.slice(0, 155),
  };
}

export default async function ShopItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = getShopItemDetail(id);
  if (!item) notFound();

  return (
    <div className="bg-white pt-8 sm:pt-10">
      <Container>
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-mist-500">
          <Link href="/ev-charging/shop" className="flex items-center gap-1 hover:text-navy-900">
            <ArrowLeft className="h-3.5 w-3.5" /> Shop
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-navy-700">{item.categoryLabel}</span>
        </nav>
      </Container>

      <Container className="grid grid-cols-1 gap-10 py-8 lg:grid-cols-2 lg:gap-16 lg:py-12">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ChargerThumbnail
            kind={item.thumbnail}
            brand={item.brand}
            photoUrl={item.photoUrl}
            photoFit={item.photoFit ?? "contain"}
            className="aspect-square w-full rounded-3xl border border-mist-200"
            initialsClassName="text-7xl"
            badgeClassName="bottom-4 right-4 h-12 w-12"
          />
          {item.photoCredit && <p className="mt-3 text-xs text-mist-400">{item.photoCredit}</p>}
        </div>

        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-solar-600">
            {item.categoryLabel}
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-navy-950 sm:text-4xl">
            {item.name}
          </h1>

          <p className="mt-5 font-display text-2xl font-bold text-navy-950 sm:text-3xl">
            {formatChargerPrice(item.price, item.priceDisplay)}
          </p>

          <div className="mt-6">
            <ShopDetailActions cartProduct={item.cartProduct} />
          </div>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-mist-600">{item.overview}</p>

          {item.features.length > 0 && (
            <div className="mt-10 border-t border-mist-200 pt-8">
              <h2 className="font-display text-lg font-semibold text-navy-950">Features</h2>
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {item.features.map((f) => (
                  <div key={f.label} className="flex items-center gap-2.5 text-sm text-navy-700">
                    <FeatureIcon active={f.active} label={f.label} />
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Container>

      {item.specs.length > 0 && (
        <div className="border-t border-mist-200 bg-mist-50 py-14 sm:py-16">
          <Container>
            <h2 className="font-display text-2xl font-bold text-navy-950">Specifications</h2>
            <div className="mt-6 overflow-hidden rounded-2xl border border-mist-200 bg-white">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-mist-200">
                  {item.specs.map((s, i) => (
                    <tr key={s.label} className={i % 2 === 0 ? "bg-white" : "bg-mist-50"}>
                      <th scope="row" className="w-1/3 px-5 py-3.5 align-top font-medium text-navy-700 sm:w-1/4">
                        {s.label}
                      </th>
                      <td className="px-5 py-3.5 text-mist-600">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </div>
      )}

      <Container className="py-10 sm:py-12">
        <Link
          href="/ev-charging/shop"
          className="inline-flex items-center gap-2 text-sm font-semibold text-navy-900 hover:text-solar-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </Link>
      </Container>
    </div>
  );
}
