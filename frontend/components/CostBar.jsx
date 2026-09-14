"use client";

const GRADIENT_PALETTES = [
  "from-[#ff5a1f] to-[#ff8c42]",       // warm orange (accent)
  "from-[#1a1a2e] to-[#3a3a5c]",       // deep slate
  "from-[#2d3436] to-[#636e72]",       // charcoal
  "from-[#0f3460] to-[#16537e]",       // navy
  "from-[#4a3728] to-[#8b6f4e]",       // earth
  "from-[#1e3a5f] to-[#4a7c9b]",       // ocean
];

export function CostBar({
  label,
  value,
  percent,
  index = 0,
}) {
  const gradientClass = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];

  return (
    <div className="group rounded-lg p-3 transition-all duration-200 hover:bg-background/60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`inline-block size-2 shrink-0 rounded-full bg-gradient-to-r ${gradientClass}`}
            aria-hidden="true"
          />
          <span className="truncate text-[13px] font-medium text-foreground">
            {label}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-foreground">
          {value}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2.5">
        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-line/60">
          <div
            className={`fillbar absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${gradientClass} shadow-sm`}
            style={{
              width: `${Math.min(100, Math.max(8, percent))}%`,
              animationDelay: `${index * 80}ms`,
            }}
          />
          {/* Shimmer overlay */}
          <div
            className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
            }}
          />
        </div>
        <span className="w-8 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}
