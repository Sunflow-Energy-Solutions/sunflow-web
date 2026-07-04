import Image from "next/image";
import { Home, Building2, Zap, Cable } from "lucide-react";
import type { ThumbnailKind } from "@/lib/shop-display";
import { getBrandGradient, getBrandInitials } from "@/lib/brand-thumbnail";
import clsx from "clsx";

const ICON_BY_KIND = {
  residential: Home,
  "commercial-ac": Building2,
  "commercial-dc": Zap,
  accessory: Cable,
} as const;

export default function ChargerThumbnail({
  kind,
  brand,
  photoUrl,
  photoFit = "contain",
  className,
  badgeClassName,
  initialsClassName,
}: {
  kind: ThumbnailKind;
  brand: string;
  photoUrl?: string;
  photoFit?: "cover" | "contain";
  className?: string;
  badgeClassName?: string;
  initialsClassName?: string;
}) {
  const Icon = ICON_BY_KIND[kind];

  if (photoUrl) {
    return (
      <div className={clsx("relative overflow-hidden bg-mist-100", className)}>
        <Image
          src={photoUrl}
          alt={brand}
          fill
          sizes="200px"
          className={photoFit === "contain" ? "object-contain p-[10%]" : "object-cover"}
        />
      </div>
    );
  }

  const [from, to] = getBrandGradient(brand);
  const initials = getBrandInitials(brand);

  return (
    <div
      className={clsx("relative flex items-center justify-center overflow-hidden", className)}
      style={{ backgroundImage: `linear-gradient(to bottom right, ${from}, ${to})` }}
    >
      <span className={clsx("font-display select-none font-bold tracking-wide text-white/90", initialsClassName ?? "text-3xl")}>
        {initials}
      </span>
      <div
        className={clsx(
          "absolute flex items-center justify-center rounded-full bg-solar-500 text-navy-950 shadow-md",
          badgeClassName ?? "-bottom-1.5 -right-1.5 h-7 w-7"
        )}
      >
        <Icon className="h-[55%] w-[55%]" strokeWidth={2.5} />
      </div>
    </div>
  );
}
