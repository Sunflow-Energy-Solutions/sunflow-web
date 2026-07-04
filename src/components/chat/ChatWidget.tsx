"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import clsx from "clsx";

type Message = { id: number; from: "bot" | "user"; text: string };

const QUICK_PROMPTS = [
  "How much could I save with solar?",
  "What battery suits my home?",
  "Do you install EV chargers?",
  "Book a free quote",
];

const CANNED_RESPONSES: Record<string, string> = {
  solar:
    "Great question! Most Victorian homes save 70–90% on their electricity bills with solar. Head to our Solar Solutions page or use the Savings Calculator on the homepage for a personalised estimate — or I can pass your details to a consultant for a free quote.",
  battery:
    "Home battery sizing depends on your household energy use and whether you want blackout backup or just bill savings. Check out our Battery Storage page for our recommended product range, or request a free consultation and we'll size it correctly for you.",
  ev: "Yes — we install home, commercial and government EV chargers across Victoria, including solar-smart and load-managed options. Visit EV Charging to browse our range or shop directly online.",
  quote:
    "I'd love to help you get a free quote. Head to the Free Quote page and pop in a few details — a Sunflow consultant will be in touch within one business day.",
  default:
    "Thanks for your message! This is a demo AI assistant — once connected to a live AI model and CRM, I'll be able to answer detailed questions about pricing, rebates and bookings in real time. For now, please use the Free Quote page or call our team.",
};

function getResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("solar")) return CANNED_RESPONSES.solar;
  if (lower.includes("batter")) return CANNED_RESPONSES.battery;
  if (lower.includes("ev") || lower.includes("charg")) return CANNED_RESPONSES.ev;
  if (lower.includes("quote") || lower.includes("book")) return CANNED_RESPONSES.quote;
  return CANNED_RESPONSES.default;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      from: "bot",
      text: "Hi, I'm Sunny — Sunflow Energy's AI assistant. Ask me about solar, battery storage, EV charging, or request a free quote!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  function send(text: string) {
    if (!text.trim()) return;
    nextId.current += 1;
    const userMsg: Message = { id: nextId.current, from: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    window.setTimeout(() => {
      nextId.current += 1;
      setMessages((prev) => [
        ...prev,
        { id: nextId.current, from: "bot", text: getResponse(text) },
      ]);
      setIsTyping(false);
    }, 900);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
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
        aria-label="Sunflow AI chat assistant"
        aria-hidden={!open}
      >
        <div className="flex items-center gap-3 bg-navy-950 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-solar-500 text-navy-950">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Sunny — AI Assistant</p>
            <p className="text-xs text-mist-400">Typically replies instantly</p>
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
