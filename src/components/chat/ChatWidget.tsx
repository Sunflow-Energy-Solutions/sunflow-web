"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Headset } from "lucide-react";
import clsx from "clsx";
import { siteConfig } from "@/lib/site-config";

type Message = { id: number; from: "bot" | "user"; text: string };
type Reply = { text: string; offerForm: boolean };

const CALLBACK_PROMPT = "Request a call back";

const QUICK_PROMPTS = [
  "How much could I save with solar?",
  "What battery suits my home?",
  "Do you install EV chargers?",
  CALLBACK_PROMPT,
];

const inputClass =
  "w-full rounded-lg border border-mist-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-solar-500";

function getReply(input: string): Reply {
  const lower = input.toLowerCase();

  if (/price|cost|how much|quote|afford|cheap|expensive|\$/.test(lower)) {
    return {
      text: "Pricing depends on system size, your switchboard and your site, so we provide itemised, no-obligation quotes rather than ballpark figures. Leave your details below, or use the Free Quote page, and our team will get back to you within one business day.",
      offerForm: true,
    };
  }
  if (/rebate|incentive|stc|subsid|feed.?in/.test(lower)) {
    return {
      text: "Available rebates and incentives depend on your property and the current Victorian and federal programs. We check your eligibility as part of your free consultation.",
      offerForm: true,
    };
  }
  if (/batter|backup|blackout|outage/.test(lower)) {
    return {
      text: "Battery size depends on your evening energy use and whether you want backup during outages. Our Battery Storage page covers the range, including larger systems for 3-phase homes. For a recommendation on your home, leave your details below and our team will size it for you.",
      offerForm: true,
    };
  }
  if (/solar|panel|inverter/.test(lower)) {
    return {
      text: "Savings depend on your electricity use, roof and tariff. The Savings Calculator on our homepage gives a quick estimate, and a free quote gives you exact numbers for your property.",
      offerForm: false,
    };
  }
  if (/\bev\b|charger|charging|electric vehicle/.test(lower)) {
    return {
      text: "Yes, we install home, commercial and government EV chargers across Victoria, including solar-smart and load-managed options. You can browse the range and request a quote on our EV Charging pages.",
      offerForm: false,
    };
  }
  if (/call|phone|contact|email|hours|speak|talk|book/.test(lower)) {
    return {
      text: `You can call us on ${siteConfig.phone} or email ${siteConfig.email}. Or leave your details below and we'll get back to you within one business day.`,
      offerForm: true,
    };
  }
  return {
    text: `That's one for our team. Leave your details below and we'll get back to you within one business day, or call us on ${siteConfig.phone}.`,
    offerForm: true,
  };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      from: "bot",
      text: "Hi, welcome to Sunflow Energy Solutions. Ask a quick question about solar, battery storage or EV charging, or leave your details and our team will get back to you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, showForm]);

  function addMessage(from: Message["from"], text: string) {
    nextId.current += 1;
    const id = nextId.current;
    setMessages((prev) => [...prev, { id, from, text }]);
  }

  function send(text: string) {
    if (!text.trim()) return;
    setInput("");

    if (text === CALLBACK_PROMPT) {
      addMessage("user", text);
      addMessage("bot", "Happy to. Pop your details in below and we'll get back to you within one business day.");
      setShowForm(true);
      return;
    }

    addMessage("user", text);
    setIsTyping(true);
    window.setTimeout(() => {
      const reply = getReply(text);
      addMessage("bot", reply.text);
      if (reply.offerForm) setShowForm(true);
      setIsTyping(false);
    }, 700);
  }

  async function submitEnquiry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();

    try {
      const res = await fetch("/api/chat-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: data.get("phone"),
          email: data.get("email"),
          message: data.get("message"),
          transcript: messages.filter((m) => m.from === "user").map((m) => m.text),
        }),
      });

      if (!res.ok) throw new Error("Request failed");
      setShowForm(false);
      addMessage("bot", `Thanks ${name}, we've received your details. Our team will be in touch within one business day.`);
    } catch {
      setFormError(`Something went wrong sending that. Please try again, or call us on ${siteConfig.phone}.`);
    } finally {
      setSubmitting(false);
    }
  }

  const lastQuestion = [...messages].reverse().find((m) => m.from === "user" && m.text !== CALLBACK_PROMPT)?.text ?? "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-solar-500 text-navy-950 shadow-xl shadow-solar-500/30 transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      <div
        className={clsx(
          "fixed bottom-24 right-5 z-50 flex h-[min(560px,70vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-mist-200 bg-white shadow-2xl transition-all duration-300 sm:right-6",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        )}
        role="dialog"
        aria-label="Sunflow chat"
        aria-hidden={!open}
      >
        <div className="flex items-center gap-3 bg-navy-950 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-solar-500 text-navy-950">
            <Headset className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Sunflow Energy Solutions</p>
            <p className="text-xs text-mist-400">Quick answers, or leave your details for a call back</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-mist-50 px-4 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={clsx("flex", m.from === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={clsx(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  m.from === "user"
                    ? "rounded-br-sm bg-navy-900 text-white"
                    : "rounded-bl-sm border border-mist-200 bg-white text-navy-800"
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-mist-200 bg-white px-3.5 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist-400"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {showForm && (
            <form onSubmit={submitEnquiry} className="space-y-2.5 rounded-2xl border border-mist-200 bg-white p-3.5">
              <input name="name" required placeholder="Your name" aria-label="Your name" maxLength={100} className={inputClass} />
              <input name="phone" required type="tel" placeholder="Phone number" aria-label="Phone number" maxLength={40} className={inputClass} />
              <input name="email" type="email" placeholder="Email (optional)" aria-label="Email" maxLength={200} className={inputClass} />
              <textarea
                key={lastQuestion}
                name="message"
                rows={3}
                defaultValue={lastQuestion}
                placeholder="How can we help?"
                aria-label="How can we help?"
                maxLength={2000}
                className={clsx(inputClass, "resize-none")}
              />
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 cursor-pointer rounded-full bg-solar-500 px-4 py-2.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-solar-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Request a call back"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="cursor-pointer rounded-full px-3 py-2.5 text-sm text-mist-500 hover:text-navy-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="border-t border-mist-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => send(prompt)}
                className="cursor-pointer rounded-full border border-mist-200 px-2.5 py-1 text-xs text-navy-700 transition-colors hover:border-solar-500 hover:text-solar-600"
              >
                {prompt}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about solar, battery, EV..."
              aria-label="Type your message"
              className="flex-1 rounded-full border border-mist-200 px-4 py-2.5 text-sm text-navy-900 outline-none focus:border-solar-500"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-solar-500 text-navy-950 transition-transform hover:scale-105 active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
