import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { STEPS, FEATURES } from "@/lib/marketing-content";

export default function Home() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />

      <main className="mx-auto max-w-6xl px-5 sm:px-6">
        <section className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <p className="rise font-mono text-xs uppercase tracking-[0.2em] text-accent-ink">
              AI cost estimation engine
            </p>
            <h1
              className="rise mt-5 max-w-[16ch] font-display text-[2.75rem] font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl"
              style={{ animationDelay: "60ms" }}
            >
              Know your project cost <span className="text-accent-ink">before</span> you build.
            </h1>
            <p
              className="rise mt-6 max-w-[46ch] text-pretty text-lg leading-relaxed text-muted-foreground"
              style={{ animationDelay: "120ms" }}
            >
              Describe your project requirements and let AI analyze the scope, complexity,
              timeline, and estimated development cost.
            </p>
            <div
              className="rise mt-8 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "180ms" }}
            >
              <Link
                href="/estimate"
                className="rounded-md bg-ink px-6 py-3 text-center font-mono text-sm font-semibold uppercase tracking-[0.08em] text-ink-foreground transition-colors hover:bg-foreground"
              >
                Estimate My Project
              </Link>
              <Link
                href="/how-it-works"
                className="rounded-md border border-line bg-surface px-6 py-3 text-center font-mono text-sm uppercase tracking-[0.08em] text-foreground transition-colors hover:border-foreground/30"
              >
                See How It Works
              </Link>
            </div>
            <div
              className="rise mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
              style={{ animationDelay: "240ms" }}
            >
              <span>Scope</span>
              <span aria-hidden="true">·</span>
              <span>Complexity</span>
              <span aria-hidden="true">·</span>
              <span>Timeline</span>
              <span aria-hidden="true">·</span>
              <span>Stack</span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rise relative" style={{ animationDelay: "150ms" }}>
              <div
                className="absolute -inset-3 rotate-2 rounded-xl border border-dashed border-accent/40"
                aria-hidden="true"
              />
              <div className="relative rounded-xl border border-line bg-surface p-6 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Estimated Project Cost
                  </span>
                  <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-ink">
                    Medium
                  </span>
                </div>
                <div className="mt-5 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
                  ₹45,000<span className="mx-1 text-muted-foreground">–</span>₹65,000
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5">
                  <div>
                    <div className="label-mono">Complexity</div>
                    <div className="mt-1 font-display text-base font-semibold text-foreground">
                      Medium
                    </div>
                  </div>
                  <div>
                    <div className="label-mono">Timeline</div>
                    <div className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">
                      3–5 weeks
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span>Frontend</span>
                    <span className="tabular-nums">₹18k</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="fillbar h-full rounded-full bg-accent" style={{ width: "62%" }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <span>Backend</span>
                    <span className="tabular-nums">₹15k</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="fillbar h-full rounded-full bg-ink" style={{ width: "50%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              How it works
            </h2>
            <Link
              href="/how-it-works"
              className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              (a) / (b) / (c)
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.marker}
                className="rounded-xl border border-line bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lift"
              >
                <div className="font-mono text-2xl font-semibold text-accent">{step.marker}</div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-14">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Features
            </h2>
            <Link
              href="/features"
              className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              All capabilities →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {FEATURES.map((f) => (
              <div
                key={f.index}
                className="rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20"
              >
                <div className="font-mono text-xs text-accent">{f.index}</div>
                <h3 className="mt-2 text-sm font-semibold text-foreground">{f.short}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.tag}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
