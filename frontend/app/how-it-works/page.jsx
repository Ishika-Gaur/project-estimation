import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { STEPS } from "@/lib/marketing-content";

export const metadata = {
  title: "How It Works — CostlyAI Project Cost Estimator",
  description:
    "Three steps: describe your project, let AI analyze the requirements, and get a costed estimate with timeline and stack.",
};

export default function HowItWorks() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-ink">Process</p>
        <h1 className="mt-5 max-w-[18ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          From a plain brief to a costed plan.
        </h1>
        <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
          No spreadsheets, no discovery calls. Three steps and you have a defensible number to
          work from.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.marker}
              className="rounded-xl border border-line bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lift"
            >
              <div className="font-mono text-2xl font-semibold text-accent">{step.marker}</div>
              <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-line bg-surface p-6">
          <div className="label-mono">What you receive</div>
          <ul className="mt-4 grid gap-2 text-sm text-foreground sm:grid-cols-2">
            <li>Cost range in rupees, split across five delivery areas</li>
            <li>Development timeline in weeks</li>
            <li>Complexity rating with reasoning</li>
            <li>Recommended frontend, backend, database and services</li>
          </ul>
          <Link
            href="/estimate"
            className="mt-6 inline-block rounded-md bg-ink px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-ink-foreground transition-colors hover:bg-foreground"
          >
            Estimate My Project
          </Link>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
