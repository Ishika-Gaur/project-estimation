import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata = {
  title: "About CostlyAI — Transparent Software Pricing & Execution",
  description:
    "CostlyAI turns project briefs and codebases into transparent INR cost estimates, module completion audits, and team workload plans.",
};

export default function About() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-ink">About</p>
        <h1 className="mt-5 max-w-[20ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          Pricing and planning software should not be a guessing game.
        </h1>

        <div className="mt-10 grid gap-4 lg:grid-cols-12">
          <div className="rounded-xl border border-line bg-surface p-6 lg:col-span-7 space-y-4">
            <p className="text-base leading-relaxed text-foreground">
              Most clients hear a number before they understand what drives it, and most developers
              quote before they have mapped the scope. CostlyAI bridges the gap: it reads requirements
              the way a senior architect would, splits them into discrete features, and prices each part
              of the build against live Indian market rates.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              Unlike static rate sheets, CostlyAI incorporates continuous domestic rate telemetry
              (aggregated weekly from Indian freelance, Glassdoor, AmbitionBox, and PayScale data). It also
              connects to your real GitHub repositories to audit completion percentages and automatically
              distribute remaining backlog tasks to team members according to their roles and skills.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              Every estimate is a calibrated range rather than a single number, because honest software
              engineering embraces scope discovery. The breakdown shows exactly where effort and budget go
              so teams negotiate scope instead of arguing about totals.
            </p>
          </div>

          <div className="grid gap-4 lg:col-span-5">
            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="label-mono">Currency & Market Basis</div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
                INR ₹ (Domestic India Rates)
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Aggregated from 2+ public market sources with transparent buyer multipliers (Freelancer, Startup, Small Business, Enterprise).
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="label-mono">Repository Health Audit</div>
              <div className="mt-1 font-display text-base font-semibold text-foreground">
                Live GitHub Inspection
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Evaluates file structures, commits, dependency trees, and finished features to establish verified completion benchmarks.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="label-mono">Sprint Execution</div>
              <div className="mt-1 font-display text-base font-semibold text-foreground">
                Task & Workload Distribution
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Balances hours across frontend, backend, DevOps, and QA, highlighting bottlenecks and generating Jira/Markdown exports.
              </p>
            </div>
          </div>
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
            Codebase Analyzer
          </Link>
          <Link
            href="/task-distribution"
            className="rounded-md border border-line bg-surface px-6 py-3 font-mono text-sm uppercase tracking-[0.08em] text-foreground transition-colors hover:border-foreground/30"
          >
            Task Distribution
          </Link>
        </div>

        <p className="mt-8 max-w-[70ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
          Note: This is an AI-generated estimate and analysis based on provided requirements and repository artifacts.
          Actual development cost may vary depending on team velocity, third-party API dependencies, and evolving project scope.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
