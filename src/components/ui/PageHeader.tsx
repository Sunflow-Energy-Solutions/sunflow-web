import Container from "./Container";
import Reveal from "./Reveal";

export default function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-navy-950 pb-20 pt-32 sm:pb-24 sm:pt-36">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-solar-500/10 blur-3xl" />
      <Container className="relative">
        <Reveal>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-solar-400">
            <span className="h-1.5 w-1.5 rounded-full bg-solar-500" />
            {eyebrow}
          </span>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="max-w-2xl font-display text-balance text-4xl font-bold leading-tight text-white sm:text-5xl">
            {title}
          </h1>
        </Reveal>
        {description && (
          <Reveal delay={150}>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-mist-300">{description}</p>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
