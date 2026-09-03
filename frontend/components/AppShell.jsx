"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listEstimates } from "@/lib/estimates";

const LINKS = [
  { label: "Overview", href: "/estimate" },
  { label: "New Estimate", href: "/estimate" },
];

export function AppShell({
  title,
  action,
  children,
}) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const sync = () => setTotal(listEstimates().length);
    sync();
    window.addEventListener("costlyai:estimates", sync);
    return () => window.removeEventListener("costlyai:estimates", sync);
  }, []);

  return (
    <section className="grid-wash min-h-[calc(100vh-4rem)] border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col lg:flex-row">
        <aside className="hidden w-56 shrink-0 border-r border-line bg-surface/60 p-5 lg:block">
          <div className="mb-6 label-mono">Workspace</div>
          <nav className="space-y-1 font-mono text-xs uppercase tracking-[0.1em]">
            {LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 rounded-lg border border-line bg-surface p-3">
            <div className="label-mono">Total Estimates</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {total}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 p-5 sm:p-6 lg:p-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {action}
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto font-mono text-[11px] uppercase tracking-[0.1em] lg:hidden">
            {LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="shrink-0 rounded-md border border-line bg-surface px-3 py-1.5 text-muted-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          {children}
        </div>
      </div>
    </section>
  );
}
