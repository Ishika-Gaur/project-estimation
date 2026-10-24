"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Calculator } from "lucide-react";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Log exception to client console for debugging
    console.error("App Root Error Caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-8 shadow-card rise">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Something went wrong
        </h1>
        
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected client error occurred while loading this page. This can happen if network connectivity was briefly interrupted or a cached script was updated.
        </p>

        {error?.message && (
          <div className="mt-4 rounded-lg border border-line/60 bg-muted/40 p-3 text-left font-mono text-xs text-muted-foreground break-words max-h-24 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset ? reset() : window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-ink-foreground shadow-sm transition hover:bg-ink/90 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" />
            Try again
          </button>

          <Link
            href="/estimate"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-foreground transition hover:border-foreground/30 active:scale-[0.98]"
          >
            <Calculator className="size-3.5" />
            Go to Estimator
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground active:scale-[0.98]"
          >
            <Home className="size-3.5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
