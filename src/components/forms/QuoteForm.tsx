"use client";

import { useState } from "react";
import { CheckCircle2, FileUp, Send, X } from "lucide-react";
import Button from "@/components/ui/Button";

const serviceOptions = [
  "Residential Solar",
  "Commercial Solar",
  "Government Solar",
  "Battery Storage",
  "EV Charger (Home)",
  "EV Charger (Commercial)",
  "Energy Consultation",
  "Not Sure Yet",
];

const MAX_FILE_BYTES = 4 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function QuoteForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleFileChange(selected: File | null) {
    if (selected && selected.size > MAX_FILE_BYTES) {
      setFile(null);
      setFileError("That file is too large to email — please choose one under 4MB.");
      return;
    }
    setFileError(null);
    setFile(selected);
  }

  function toggleService(service: string) {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(e.currentTarget);

    try {
      const attachment = file ? { filename: file.name, base64: await fileToBase64(file) } : undefined;

      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          phone: data.get("phone"),
          email: data.get("email"),
          address: data.get("address"),
          services: selectedServices,
          notes: data.get("notes"),
          attachment,
        }),
      });

      if (!res.ok) throw new Error("Request failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong sending your request. Please try again, or call or email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-mist-200 bg-white p-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-solar-500/15 text-solar-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-navy-950">Quote request received!</h2>
        <p className="mt-3 max-w-md text-mist-500">
          Thank you for requesting a free quote. A Sunflow consultant will review your
          details and be in touch within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-mist-200 bg-white p-8 sm:p-10">
      <fieldset>
        <legend className="font-display text-lg font-semibold text-navy-950">Your Details</legend>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="quoteName" className="block text-sm font-medium text-navy-800">Full name</label>
            <input id="quoteName" name="name" required type="text" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
          </div>
          <div>
            <label htmlFor="quotePhone" className="block text-sm font-medium text-navy-800">Phone number</label>
            <input id="quotePhone" name="phone" required type="tel" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="quoteEmail" className="block text-sm font-medium text-navy-800">Email address</label>
            <input id="quoteEmail" name="email" required type="email" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="quoteAddress" className="block text-sm font-medium text-navy-800">Property address</label>
            <input id="quoteAddress" name="address" required type="text" placeholder="Street, suburb, postcode" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="font-display text-lg font-semibold text-navy-950">What are you interested in?</legend>
        <p className="mt-1 text-sm text-mist-500">Select all that apply.</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {serviceOptions.map((service) => {
            const active = selectedServices.includes(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => toggleService(service)}
                aria-pressed={active}
                className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-mist-200 text-navy-700 hover:border-navy-300"
                }`}
              >
                {service}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="font-display text-lg font-semibold text-navy-950">Electricity Bill (Optional)</legend>
        <p className="mt-1 text-sm text-mist-500">
          Upload a recent bill so we can give you the most accurate quote possible.
        </p>
        <label
          htmlFor="billUpload"
          className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-mist-300 px-6 py-10 text-center transition-colors hover:border-solar-500"
        >
          <FileUp className="h-6 w-6 text-solar-600" />
          <span className="text-sm font-medium text-navy-800">
            {file ? file.name : "Click to upload or drag a file here"}
          </span>
          <span className="text-xs text-mist-400">PDF, JPG or PNG — max 4MB</span>
          <input
            id="billUpload"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </label>
        {fileError && <p className="mt-2 text-xs font-medium text-red-600">{fileError}</p>}
        {file && (
          <button
            type="button"
            onClick={() => handleFileChange(null)}
            className="mt-2 flex cursor-pointer items-center gap-1 text-xs font-medium text-mist-500 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" /> Remove file
          </button>
        )}
      </fieldset>

      <fieldset className="mt-8">
        <legend className="font-display text-lg font-semibold text-navy-950">Additional Notes</legend>
        <textarea
          name="notes"
          rows={4}
          placeholder="Tell us anything else that might help — e.g. roof type, current appliances, timeframe..."
          className="mt-3 w-full resize-none rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500"
        />
      </fieldset>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting} size="lg" className="mt-8 w-full justify-center" icon={<Send className="h-4 w-4" />}>
        {submitting ? "Submitting..." : "Request My Free Quote"}
      </Button>
      <p className="mt-3 text-center text-xs text-mist-400">
        No obligation. We&rsquo;ll never share your details with third parties.
      </p>
    </form>
  );
}
