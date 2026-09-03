import { CostBar } from "@/components/CostBar";
import { formatCompact, formatRange } from "@/lib/estimates";

export function EstimateReport({ estimate }) {
  const maxLine = Math.max(...estimate.breakdown.map((b) => b.max));

  return (
    <>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="label-mono">Estimated Cost</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
            {formatCompact(estimate.costMin)} – {formatCompact(estimate.costMax)}
          </div>
          <div className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            {formatRange(estimate.costMin, estimate.costMax)}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="label-mono">Development Time</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
            {estimate.weeksMin}–{estimate.weeksMax} wks
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Single small team
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <div className="label-mono">Complexity</div>
          <div className="mt-2 font-display text-2xl font-semibold text-accent-ink">
            {estimate.complexity}
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {estimate.input.projectType}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-line bg-surface p-6 lg:col-span-7">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Cost Breakdown
          </div>
          <div className="mt-5 space-y-4">
            {estimate.breakdown.map((line, i) => (
              <CostBar
                key={line.label}
                label={line.label}
                value={formatRange(line.min, line.max)}
                percent={(line.max / maxLine) * 100}
                tone={i === 0 ? "accent" : "ink"}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-line bg-surface p-6 lg:col-span-5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              AI Project Analysis
            </h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-foreground">{estimate.analysis}</p>

          <div className="mt-5">
            <h3 className="label-mono">Detected Features</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {estimate.detectedFeatures.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-line bg-background px-3 py-1 font-mono text-[11px] text-foreground"
                >
                  ✓ {f}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <h3 className="label-mono">Recommended Stack</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {estimate.stack.map((s) => (
                <div key={s.layer} className="rounded-lg border border-line bg-background p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {s.layer}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-foreground">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
