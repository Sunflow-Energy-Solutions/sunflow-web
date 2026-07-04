"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Frontend demo only — wire up to an email/CRM service (e.g. Formspree, SendGrid) at launch.
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 900);
  }

  if (submitted) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-mist-200 bg-mist-50 p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-solar-500/15 text-solar-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="mt-5 font-display text-xl font-semibold text-navy-950">Message sent!</h3>
        <p className="mt-2 max-w-sm text-sm text-mist-500">
          Thanks for reaching out. A member of the Sunflow team will get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-mist-200 bg-white p-8 sm:p-10">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contactName" className="block text-sm font-medium text-navy-800">Full name</label>
          <input id="contactName" required type="text" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
        </div>
        <div>
          <label htmlFor="contactPhone" className="block text-sm font-medium text-navy-800">Phone</label>
          <input id="contactPhone" required type="tel" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="contactEmail" className="block text-sm font-medium text-navy-800">Email</label>
          <input id="contactEmail" required type="email" className="mt-1.5 w-full rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="contactSubject" className="block text-sm font-medium text-navy-800">Subject</label>
          <select id="contactSubject" className="mt-1.5 w-full rounded-xl border border-mist-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-solar-500">
            <option>General Enquiry</option>
            <option>Solar Installation</option>
            <option>Battery Storage</option>
            <option>EV Charging</option>
            <option>Existing Customer Support</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="contactMessage" className="block text-sm font-medium text-navy-800">Message</label>
          <textarea
            id="contactMessage"
            required
            rows={5}
            className="mt-1.5 w-full resize-none rounded-xl border border-mist-200 px-4 py-2.5 text-sm outline-none focus:border-solar-500"
          />
        </div>
      </div>
      <Button type="submit" disabled={submitting} size="lg" className="mt-6 w-full justify-center sm:w-auto" icon={<Send className="h-4 w-4" />}>
        {submitting ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
