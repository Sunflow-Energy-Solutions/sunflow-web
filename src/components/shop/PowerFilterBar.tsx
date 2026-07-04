import clsx from "clsx";

export default function PowerFilterBar({
  options,
  active,
  onChange,
  resultCount,
}: {
  options: number[];
  active: number | null;
  onChange: (value: number | null) => void;
  resultCount: number;
}) {
  if (options.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-mist-400">Power:</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={clsx(
            "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            active === null ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 bg-white text-navy-700 hover:border-navy-300"
          )}
        >
          All
        </button>
        {options.map((kw) => (
          <button
            key={kw}
            type="button"
            onClick={() => onChange(kw)}
            className={clsx(
              "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active === kw ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 bg-white text-navy-700 hover:border-navy-300"
            )}
          >
            {kw}kW
          </button>
        ))}
      </div>
      <span className="ml-auto text-sm text-mist-500">{resultCount} result{resultCount === 1 ? "" : "s"}</span>
    </div>
  );
}
