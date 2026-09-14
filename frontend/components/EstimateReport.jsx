import { CostBar } from "@/components/CostBar";
import { formatCompact, formatRange } from "@/lib/estimates";

/** Parse market-rate metadata from the pricing explanation string */
function parseMarketInfo(explanation) {
  if (!explanation) return null;
  const info = {};
  const basisMatch = explanation.match(/Rate basis:\s*(.+?)\./);
  if (basisMatch) info.basis = basisMatch[1];
  const sourcesMatch = explanation.match(/Sources:\s*(\d+)\s*verified/);
  if (sourcesMatch) info.sourceCount = parseInt(sourcesMatch[1], 10);
  const dateMatch = explanation.match(/Market rates last updated:\s*(.+?)\./);
  if (dateMatch) info.lastUpdated = dateMatch[1];
  return info.basis ? info : null;
}

export function EstimateReport({ estimate }) {
  const maxLine = Math.max(...estimate.breakdown.map((b) => b.max));
  const ai = estimate.aiAnalysis;
  const marketInfo = ai ? parseMarketInfo(ai.pricing?.explanation) : null;

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
            {estimate.project_category || estimate.input.projectType}
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

          {ai && (
            <>
              <div className="mt-5">
                <h3 className="label-mono">Requirements & Scope</h3>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {ai.requirements.map((item) => <li key={item}>• {item}</li>)}
                </ul>
                {ai.missing_or_unclear.length > 0 && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Clarify next: {ai.missing_or_unclear.join(" ")}
                  </p>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[["MVP", ai.features.mvp], ["Advanced", ai.features.advanced], ["Optional", ai.features.optional]].map(([label, items]) => (
                  <div key={label} className="rounded-lg border border-line bg-background p-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
                    <div className="mt-2 space-y-2">
                      {items.map((item) => (
                        <div key={item.name} className="text-xs text-foreground">
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-muted-foreground">{item.complexity} · {item.estimated_hours}h</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-line pt-5">
                <h3 className="label-mono">Timeline & Pricing Context</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  {ai.timeline.hours} hours · {ai.timeline.days} days · {ai.timeline.weeks} weeks. MVP: {ai.timeline.mvp}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{ai.pricing.explanation}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Market context: {ai.market_analysis.notes}</p>
              </div>

              {/* Market Rate Info */}
              {marketInfo && (
                <div className="mt-4 rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent-ink">
                    India Market-Based Pricing
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {marketInfo.basis}.
                    {marketInfo.sourceCount > 0 && ` ${marketInfo.sourceCount} verified sources.`}
                    {marketInfo.lastUpdated && ` Last updated: ${marketInfo.lastUpdated}.`}
                  </p>
                </div>
              )}

              {ai.suggestions.length > 0 && (
                <div className="mt-5">
                  <h3 className="label-mono">Suggested Additions</h3>
                  <div className="mt-3 space-y-3">
                    {ai.suggestions.map((suggestion) => (
                      <div key={suggestion.title} className="border-l-2 border-accent pl-3">
                        <div className="text-sm font-semibold text-foreground">{suggestion.title}</div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{suggestion.description} {suggestion.reason}</p>
                        <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{suggestion.complexity} · {suggestion.additional_time} · {suggestion.additional_cost}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
