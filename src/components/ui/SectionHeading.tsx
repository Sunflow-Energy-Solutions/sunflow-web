import clsx from "clsx";
import Reveal from "./Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  light = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <Reveal>
          <span
            className={clsx(
              "mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase",
              light
                ? "border-white/25 text-solar-400"
                : "border-navy-900/10 bg-solar-500/10 text-navy-700"
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-solar-500" />
            {eyebrow}
          </span>
        </Reveal>
      )}
      <Reveal delay={80}>
        <h2
          className={clsx(
            "font-display text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]",
            light ? "text-white" : "text-navy-950"
          )}
        >
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={140}>
          <p
            className={clsx(
              "mt-4 text-base leading-relaxed sm:text-lg",
              light ? "text-mist-200" : "text-mist-500"
            )}
          >
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
