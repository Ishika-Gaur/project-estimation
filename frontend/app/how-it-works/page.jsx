import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { STEPS } from "@/lib/marketing-content";

export const metadata = {
  title: "How It Works — CostlyAI Project Cost & Sprint Engine",
  description:
    "Four steps: describe or connect your repo, get live market-calibrated estimates, audit completion, and distribute tasks to your team.",
};

export default function HowItWorks() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-ink">Process</p>
        <h1 className="mt-5 max-w-[20ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          From a plain brief or repo to an actionable delivery plan.
        </h1>
        <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">
          No spreadsheets, no guesswork discovery calls. Four connected stages take you from requirement scoping to live market costings and team sprint distribution.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.marker}
              className="rounded-xl border border-line bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lift"
            >
              <div className="font-mono text-2xl font-semibold text-accent">{step.marker}</div>
              <h2 className="mt-4 font-display text-base font-semibold text-foreground">
                {step.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div className="label-mono">What you receive across the platform</div>
          <ul className="mt-4 grid gap-3 text-sm text-foreground sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">✓</span>
              <span><strong>Live Market Cost Bands:</strong> Rupee ranges calibrated with weekly domestic rate telemetry.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">✓</span>
              <span><strong>Timeline & Milestone Projections:</strong> Delivery estimates in weeks for frontend, backend, and QA.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">✓</span>
              <span><strong>Repository Health Audit:</strong> GitHub codebase scan for completion % and module status.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">✓</span>
              <span><strong>Team Workload Balancing:</strong> Skill-based task assignment with overload alerts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">✓</span>
              <span><strong>Solo Dependency Mapping:</strong> Critical path ordering with prerequisite verification.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">✓</span>
              <span><strong>Exportable Sprint Artifacts:</strong> Formatted Markdown for Jira, GitHub Issues, and Slack.</span>
            </li>
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3 pt-6 border-t border-line">
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
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
