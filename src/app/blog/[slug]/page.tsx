import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, User } from "lucide-react";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import QuoteCtaBanner from "@/components/home/QuoteCtaBanner";
import { blogPosts } from "@/lib/blog-data";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Article Not Found" };
  return {
    title: post.title,
    description: post.excerpt,
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <>
      <article className="bg-white py-32 sm:py-36">
        <Container className="max-w-3xl">
          <Reveal>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-mist-500 hover:text-solar-600"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
          </Reveal>
          <Reveal delay={80}>
            <span className="mt-6 inline-flex w-fit rounded-full bg-solar-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-solar-700">
              {post.category}
            </span>
            <h1 className="mt-4 font-display text-balance text-3xl font-bold leading-tight text-navy-950 sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-mist-500">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" /> {post.author}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {formatDate(post.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {post.readTime}
              </span>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="prose-content mt-10 space-y-5 border-t border-mist-200 pt-10 text-base leading-relaxed text-navy-800">
              {post.content.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </Reveal>
        </Container>
      </article>

      <QuoteCtaBanner />
    </>
  );
}
