import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 py-8 sm:flex sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-ink font-display text-xs font-bold text-ink-foreground">
            C
          </span>
          <span className="font-display text-sm font-semibold text-foreground">CostlyAI</span>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          Project cost intelligence · Estimates in ₹
        </p>
        <Link
          href="/estimate"
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent-ink transition-colors hover:text-foreground"
        >
          Estimate my project →
        </Link>
      </div>
    </footer>
  );
}
