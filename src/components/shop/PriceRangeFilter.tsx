function formatAud(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export default function PriceRangeFilter({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const isFiltered = value < max;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-mist-400">
        Max Price: <span className="text-solar-600">{formatAud(value)}</span>
      </p>
      <input
        type="range"
        min={min}
        max={max}
        step={Math.max(1, Math.round((max - min) / 100))}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-mist-200 accent-solar-500"
      />
      <div className="mt-1 flex justify-between text-xs text-mist-400">
        <span>{formatAud(min)}</span>
        <span>{formatAud(max)}</span>
      </div>
      {isFiltered && (
        <p className="mt-2 text-xs text-mist-400">
          POA items are hidden while a price filter is active.
        </p>
      )}
    </div>
  );
}
