import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import clsx from "clsx";
import { extractPdfLines } from "@/lib/pdfText";
import { parseBillLines, type ParsedBill } from "@/lib/billParser";
import { money, num } from "./ui";

export default function BillUpload({ onParsed }: { onParsed: (p: ParsedBill, fileName: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{ name: string; parsed: ParsedBill } | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setError("That isn't a PDF. Download the bill as a PDF from the retailer's app or email, or enter it by hand below.");
      return;
    }
    setBusy(true);
    try {
      const lines = await extractPdfLines(await file.arrayBuffer());
      if (lines.filter((l) => l.trim() && !l.startsWith("----")).length < 5) {
        setError("This PDF has no readable text (it may be a scan or a photo). Enter the figures by hand below.");
        return;
      }
      const parsed = parseBillLines(lines);
      setLast({ name: file.name, parsed });
      onParsed(parsed, file.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/password/i.test(msg) ? "This PDF is password protected. Open it, save an unlocked copy, and upload that." : "Couldn't read that PDF. Enter the figures by hand below.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const p = last?.parsed;
  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handle(e.dataTransfer.files[0]);
        }}
        className={clsx(
          "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
          drag ? "border-solar-500 bg-solar-300/20" : "border-mist-300 bg-mist-50"
        )}
      >
        {busy ? <Loader2 className="h-7 w-7 animate-spin text-solar-600" /> : <FileUp className="h-7 w-7 text-solar-600" />}
        <div>
          <p className="font-semibold text-navy-900">{busy ? "Reading the bill..." : "Upload the customer's electricity bill (PDF)"}</p>
          <p className="mt-1 text-sm text-mist-500">
            Drop it here or choose a file. The tool reads the usage, rates and supply charge and fills in everything below. The bill stays on this computer.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="cursor-pointer rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          Choose a PDF
        </button>
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void handle(e.target.files?.[0])} />
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {p && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-navy-900">
          <p className="flex items-center gap-2 font-semibold text-green-800">
            <CheckCircle2 className="h-4 w-4" /> Read {last!.name}
          </p>
          <p className="mt-2">
            <strong>{p.retailer}</strong> · {p.planName} · {p.days ?? "?"} days · supply {p.dailySupply != null ? money(p.dailySupply, true) : "?"}/day
            {p.billTotal != null && <> · bill total {money(p.billTotal, true)}</>}
          </p>
          <ul className="mt-1 list-disc pl-5 text-navy-800">
            {p.imports.map((i, k) => (
              <li key={`i${k}`}>
                {i.label}: {num(i.kwh, 2)} kWh at ${i.rate.toFixed(4)}/kWh{i.hoursAssumed ? " (hours assumed)" : ""}
              </li>
            ))}
            {p.exports.map((i, k) => (
              <li key={`e${k}`}>
                {i.label}: {num(i.kwh, 2)} kWh exported at ${i.rate.toFixed(4)}/kWh
              </li>
            ))}
            {p.bonus && <li>Export bonus: {p.bonus.label} ${p.bonus.rate.toFixed(2)}/kWh</li>}
            {p.credit && <li>Daily credit: {p.credit.label} ${p.credit.amount.toFixed(2)}/day</li>}
          </ul>
          {p.warnings.map((w) => (
            <p key={w} className="mt-2 flex items-start gap-2 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
            </p>
          ))}
          <p className="mt-2 text-xs text-mist-500">Always check the figures below against the bill before relying on the results - bill layouts vary.</p>
        </div>
      )}
    </div>
  );
}
