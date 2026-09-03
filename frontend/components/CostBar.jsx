export function CostBar({
  label,
  value,
  percent,
  tone = "ink",
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="min-w-0 text-foreground">{label}</span>
        <span className="font-mono tabular-nums text-foreground">{value}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
        <div
          className={`fillbar h-full rounded-full ${tone === "accent" ? "bg-accent" : "bg-ink"}`}
          style={{ width: `${Math.min(100, Math.max(6, percent))}%` }}
        />
      </div>
    </div>
  );
}
