import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 py-8 sm:flex sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src="/logo.png" alt="CostifyAI" className="h-7 w-auto" />
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
