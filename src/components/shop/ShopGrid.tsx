import ShopProductCard from "./ShopProductCard";
import type { ShopGridItem } from "@/lib/shop-display";

export default function ShopGrid({ items }: { items: ShopGridItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <ShopProductCard key={item.id} item={item} />
      ))}
    </div>
  );
}
