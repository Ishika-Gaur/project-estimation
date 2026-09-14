import { CostBar } from "@/components/CostBar";
import { formatCompact, formatRange } from "@/lib/estimates";
import {
  Clock,
  TrendingUp,
  Layers,
  Cpu,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Zap,
  BarChart3,
  Target,
  ArrowUpRight,
} from "lucide-react";

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

/** Colored complexity badge */
function ComplexityBadge({ level }) {
  const styles = {
    Simple: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Medium: "border-amber-200 bg-amber-50 text-amber-700",
    Complex: "border-rose-200 bg-rose-50 text-rose-700",
    Enterprise: "border-purple-200 bg-purple-50 text-purple-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${
        styles[level] || styles.Medium
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          {
            Simple: "bg-emerald-500",
            Medium: "bg-amber-500",
            Complex: "bg-rose-500",
            Enterprise: "bg-purple-500",
          }[level] || "bg-amber-500"
        }`}
      />
      {level}
    </span>
  );
}

/** Section header with icon */
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-background shadow-sm">
        <Icon className="size-4 text-accent-ink" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function EstimateReport({ estimate }) {
  const maxLine = Math.max(...estimate.breakdown.map((b) => b.max));
  const ai = estimate.aiAnalysis;
  const marketInfo = ai ? parseMarketInfo(ai.pricing?.explanation) : null;
  const category = estimate.project_category || estimate.input?.projectType || "Web Application";
  const totalHours = ai?.timeline?.hours;
  const totalDays = ai?.timeline?.days;

  return (
    <>
      {/* ── Hero Stats Row ─────────────────────────────────── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {/* Cost card */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface to-background p-5 shadow-card">
          <div className="absolute -right-6 -top-6 size-20 rounded-full bg-accent/5" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-accent/10">
                <TrendingUp className="size-3.5 text-accent-ink" />
              </div>
              <span className="label-mono">Estimated Cost</span>
            </div>
            <div className="mt-3 font-mono text-[1.65rem] font-bold leading-none tabular-nums text-foreground">
              {formatCompact(estimate.costMin)} – {formatCompact(estimate.costMax)}
            </div>
            <div className="mt-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatRange(estimate.costMin, estimate.costMax)}
            </div>
          </div>
        </div>

        {/* Timeline card */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface to-background p-5 shadow-card">
          <div className="absolute -right-6 -top-6 size-20 rounded-full bg-blue-500/5" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-blue-500/10">
                <Clock className="size-3.5 text-blue-600" />
              </div>
              <span className="label-mono">Development Time</span>
            </div>
            <div className="mt-3 font-mono text-[1.65rem] font-bold leading-none tabular-nums text-foreground">
              {estimate.weeksMin}–{estimate.weeksMax} wks
            </div>
            <div className="mt-1.5 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
              {totalHours && <span>{totalHours} hrs</span>}
              {totalDays && <span>· {totalDays} days</span>}
            </div>
          </div>
        </div>

        {/* Complexity card */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface to-background p-5 shadow-card">
          <div className="absolute -right-6 -top-6 size-20 rounded-full bg-purple-500/5" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-purple-500/10">
                <Layers className="size-3.5 text-purple-600" />
              </div>
              <span className="label-mono">Complexity</span>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <ComplexityBadge level={estimate.complexity} />
            </div>
            <div className="mt-2 font-mono text-[11px] text-muted-foreground">
              {category}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cost Breakdown + AI Analysis ───────────────────── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        {/* Cost Breakdown */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-card lg:col-span-7">
          <SectionHeader
            icon={BarChart3}
            title="Cost Breakdown"
            subtitle="Distribution across development phases"
          />
          <div className="mt-5 space-y-1">
            {estimate.breakdown.map((line, i) => (
              <CostBar
                key={line.label}
                label={line.label}
                value={formatRange(line.min, line.max)}
                percent={(line.max / maxLine) * 100}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* AI Analysis */}
        <div className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-card lg:col-span-5">
          <SectionHeader
            icon={Cpu}
            title="AI Project Analysis"
            subtitle="Intelligent scope and feasibility breakdown"
          />
          <p className="mt-4 text-[13px] leading-relaxed text-foreground/85">
            {estimate.analysis}
          </p>

          {/* Detected Features */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <h3 className="label-mono">Detected Features</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {estimate.detectedFeatures.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/60 px-2.5 py-1 font-mono text-[10px] font-medium text-emerald-700"
                >
                  <span className="size-1 rounded-full bg-emerald-400" />
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Recommended Stack */}
          <div className="mt-5">
            <div className="flex items-center gap-1.5">
              <Zap className="size-3.5 text-amber-500" />
              <h3 className="label-mono">Recommended Stack</h3>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {estimate.stack.map((s, i) => (
                <div
                  key={s.layer}
                  className="group relative overflow-hidden rounded-xl border border-line bg-gradient-to-br from-background to-background/50 p-3 transition-all duration-200 hover:border-accent/30 hover:shadow-sm"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  <div className="relative">
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      {s.layer}
                    </div>
                    <div className="mt-1 text-[13px] font-semibold leading-snug text-foreground">
                      {s.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Full-width Deep Analysis ───────────────────────── */}
      {ai && (
        <div className="mt-5 space-y-5">
          {/* Requirements & Scope + Missing/Unclear */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
              <SectionHeader
                icon={Target}
                title="Requirements & Scope"
                subtitle="Core project deliverables identified by AI"
              />
              <ul className="mt-4 space-y-2.5">
                {ai.requirements.map((item, i) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-foreground/85">
                    <span className="mt-1.5 grid size-4 shrink-0 place-items-center rounded-full bg-accent/10 text-[9px] font-bold text-accent-ink">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              {ai.missing_or_unclear.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 text-amber-500" />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700">
                      Needs Clarification
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-amber-700/80">
                    {ai.missing_or_unclear.join(" · ")}
                  </p>
                </div>
              )}
            </div>

            {/* Feature Tiers */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
              <SectionHeader
                icon={Layers}
                title="Feature Tiers"
                subtitle="Categorized by implementation priority"
              />
              <div className="mt-4 space-y-3">
                {[
                  { label: "MVP", items: ai.features.mvp, color: "emerald", dotColor: "bg-emerald-400" },
                  { label: "Advanced", items: ai.features.advanced, color: "blue", dotColor: "bg-blue-400" },
                  { label: "Optional", items: ai.features.optional, color: "violet", dotColor: "bg-violet-400" },
                ].map(({ label, items, color, dotColor }) =>
                  items.length > 0 ? (
                    <div key={label} className="rounded-xl border border-line bg-background/50 p-4">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${dotColor}`} />
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {label}
                        </span>
                        <span className="rounded-full bg-line px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-muted-foreground">
                          {items.length}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {items.map((item) => (
                          <div key={item.name} className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[12px] font-semibold text-foreground">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {item.description}
                              </div>
                            </div>
                            <span className="shrink-0 rounded-md border border-line bg-background px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                              {item.estimated_hours}h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </div>

          {/* Timeline Context + Market Info */}
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-card lg:col-span-7">
              <SectionHeader
                icon={Clock}
                title="Timeline & Pricing Context"
                subtitle="Development timeline and pricing rationale"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { label: "Hours", value: ai.timeline.hours, unit: "hrs" },
                  { label: "Days", value: ai.timeline.days, unit: "days" },
                  { label: "Weeks", value: ai.timeline.weeks, unit: "wks" },
                ].map(({ label, value, unit }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center rounded-xl border border-line bg-background px-4 py-3"
                  >
                    <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                      {value}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      {unit}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-lg border border-line bg-background/50 p-3 text-xs leading-relaxed text-muted-foreground">
                {ai.pricing.explanation}
              </p>
              {ai.timeline.mvp && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">MVP Timeline:</span> {ai.timeline.mvp}
                </p>
              )}
            </div>

            {/* Market Info + Context */}
            <div className="flex flex-col gap-4 lg:col-span-5">
              {marketInfo && (
                <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/[0.02] p-5 shadow-card">
                  <div className="flex items-center gap-2">
                    <div className="grid size-7 place-items-center rounded-lg bg-accent/10">
                      <TrendingUp className="size-3.5 text-accent-ink" />
                    </div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-ink">
                      Market-Based Pricing
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {marketInfo.basis}.
                    {marketInfo.sourceCount > 0 && ` ${marketInfo.sourceCount} verified sources.`}
                    {marketInfo.lastUpdated && ` Last updated: ${marketInfo.lastUpdated}.`}
                  </p>
                </div>
              )}

              {ai.market_analysis && (
                <div className="flex-1 rounded-2xl border border-line bg-surface p-5 shadow-card">
                  <div className="flex items-center gap-2">
                    <div className="grid size-7 place-items-center rounded-lg bg-blue-500/10">
                      <BarChart3 className="size-3.5 text-blue-600" />
                    </div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Market Context
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {ai.market_analysis.notes}
                  </p>
                  {ai.market_analysis.trends?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ai.market_analysis.trends.map((trend) => (
                        <span
                          key={trend}
                          className="rounded-full border border-blue-100 bg-blue-50/60 px-2 py-0.5 font-mono text-[9px] text-blue-600"
                        >
                          {trend}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Suggested Additions */}
          {ai.suggestions.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
              <SectionHeader
                icon={Lightbulb}
                title="Suggested Additions"
                subtitle="High-ROI features to consider adding"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ai.suggestions.map((suggestion) => (
                  <div
                    key={suggestion.title}
                    className="group relative overflow-hidden rounded-xl border border-line bg-background/50 p-4 transition-all duration-200 hover:border-accent/30 hover:shadow-sm"
                  >
                    <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-gradient-to-b from-accent/60 to-accent/20" />
                    <div className="pl-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[13px] font-semibold text-foreground">
                          {suggestion.title}
                        </h4>
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      </div>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        {suggestion.description}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                        <span className="rounded-md border border-line bg-background px-1.5 py-0.5">
                          {suggestion.complexity}
                        </span>
                        <span className="rounded-md border border-line bg-background px-1.5 py-0.5">
                          {suggestion.additional_time}
                        </span>
                        <span className="rounded-md border border-accent/20 bg-accent/5 px-1.5 py-0.5 text-accent-ink">
                          {suggestion.additional_cost}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
