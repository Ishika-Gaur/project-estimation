"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";

const NAV = [
  { label: "Home", to: "/" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Features", to: "/features" },
  { label: "About", to: "/about" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/85 backdrop-blur-sm">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-ink font-display text-sm font-bold text-ink-foreground">
            C
          </span>
          <span className="truncate font-display text-lg font-semibold tracking-tight text-foreground">
            CostlyAI
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            v1.0
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground md:flex">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={`transition-colors hover:text-foreground ${active ? "text-foreground font-semibold" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/estimate"
            className="rounded-md bg-accent px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent-foreground transition-colors hover:bg-accent-ink"
          >
            Get Started
          </Link>
          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-line text-foreground transition-colors hover:border-foreground/30 md:hidden"
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line bg-surface px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] md:hidden">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={() => setOpen(false)}
                className={`block rounded-md px-2 py-2.5 transition-colors hover:bg-background hover:text-foreground ${
                  active ? "text-foreground font-semibold" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
