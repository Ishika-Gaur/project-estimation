import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { FEATURES } from "@/lib/marketing-content";

export const metadata = {
  title: "Features — CostifyAI Estimation Capabilities",
  description:
    "AI requirement analysis, cost estimation, timeline forecasting, complexity scoring, stack recommendations and feature breakdowns.",
};

export default function Features() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-ink">Capabilities</p>
        <h1 className="mt-5 max-w-[20ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          Every dimension of the estimate, surfaced.
        </h1>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <article
                key={f.index}
                className="rounded-xl border border-line bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lift"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent-ink">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{f.index}</span>
                </div>
                <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                  {f.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3">
          <Link
            href="/estimate"
            className="rounded-md bg-accent px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent-ink"
          >
            Cost Estimator
          </Link>
          <Link
            href="/analyze"
            className="rounded-md border border-line bg-surface px-6 py-3 font-mono text-sm uppercase tracking-[0.08em] text-foreground transition-colors hover:border-foreground/30"
          >
            Analyze Codebase
          </Link>
          <Link
            href="/task-distribution"
            className="rounded-md border border-line bg-surface px-6 py-3 font-mono text-sm uppercase tracking-[0.08em] text-foreground transition-colors hover:border-foreground/30"
          >
            Task Distribution
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
