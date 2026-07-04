import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { blogPosts } from "@/lib/blog-data";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Solar, battery storage and EV charging insights, guides and news for Victorian homeowners and businesses from Sunflow Energy Solutions.",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogIndexPage() {
  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title="Solar, battery & EV charging insights"
        description="Guides, tips and news to help you make confident, informed clean energy decisions."
      />

      <section className="bg-white py-24 sm:py-28">
        <Container>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
            {blogPosts.map((post, i) => (
              <Reveal key={post.slug} delay={i * 90}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full cursor-pointer flex-col rounded-3xl border border-mist-200 bg-mist-50 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-solar-500/40 hover:shadow-xl hover:shadow-navy-900/10"
                >
                  <span className="w-fit rounded-full bg-solar-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-solar-700">
                    {post.category}
                  </span>
                  <h2 className="mt-4 font-display text-xl font-semibold leading-snug text-navy-950">
                    {post.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-mist-500">{post.excerpt}</p>
                  <div className="mt-6 flex items-center justify-between border-t border-mist-200 pt-5 text-xs text-mist-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDate(post.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {post.readTime}
                    </span>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 group-hover:text-solar-600">
                    Read article
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
