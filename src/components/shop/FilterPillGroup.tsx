import clsx from "clsx";

export default function FilterPillGroup({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: readonly string[];
  active: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">{label}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={clsx(
            "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            active === null ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 text-navy-700 hover:border-navy-300"
          )}
        >
          All
        </button>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={clsx(
              "cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active === opt ? "border-navy-900 bg-navy-900 text-white" : "border-mist-200 text-navy-700 hover:border-navy-300"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
