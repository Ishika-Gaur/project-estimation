import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata = {
  title: "About CostlyAI — Transparent Software Pricing",
  description:
    "CostlyAI turns a plain-language project brief into a transparent cost, timeline and complexity estimate for clients and developers.",
};

export default function About() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-ink">About</p>
        <h1 className="mt-5 max-w-[18ch] font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
          Pricing software should not be a guessing game.
        </h1>

        <div className="mt-10 grid gap-4 lg:grid-cols-12">
          <div className="rounded-xl border border-line bg-surface p-6 lg:col-span-7">
            <p className="text-base leading-relaxed text-foreground">
              Most clients hear a number before they understand what drives it, and most developers
              quote before they have mapped the scope. CostlyAI sits in between: it reads a brief
              the way a delivery lead would, splits it into features, and prices each part of the
              build.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Every estimate is a range, never a single figure, because honest software pricing has
              uncertainty in it. The breakdown shows exactly where the money goes so both sides can
              negotiate scope instead of arguing about totals.
            </p>
          </div>
          <div className="grid gap-4 lg:col-span-5">
            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="label-mono">Currency</div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
                INR ₹
              </div>
            </div>
            <div className="rounded-xl border border-line bg-surface p-6">
              <div className="label-mono">Estimate basis</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Feature weighting, platform count, expected user scale and integration depth.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 max-w-[70ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
          Note: This is an AI-generated estimate based on the provided requirements. Actual
          development cost may vary depending on project scope, developer experience, technology
          choices and additional requirements.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
