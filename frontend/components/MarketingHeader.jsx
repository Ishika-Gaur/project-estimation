"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { isLoggedIn, getUser, removeToken } from "@/lib/auth";

const NAV = [
  { label: "Estimator", to: "/estimate" },
  { label: "Features", to: "/features" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "About", to: "/about" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  // Wait for client mount before reading localStorage
  useEffect(() => {
    setMounted(true);
    setLoggedIn(isLoggedIn());
    setUser(getUser());
  }, []);

  // Re-check auth state on every route change
  useEffect(() => {
    if (!mounted) return;
    setLoggedIn(isLoggedIn());
    setUser(getUser());
  }, [pathname, mounted]);

  function handleLogout() {
    removeToken();
    setLoggedIn(false);
    setUser(null);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/85 backdrop-blur-sm">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-ink font-display text-sm font-bold text-ink-foreground">
            C
          </span>
          <span className="truncate font-display text-lg font-semibold tracking-tight text-foreground">
            CostifyAI
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            v1.0
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Desktop nav links */}
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

          {/* Auth buttons — always visible (no hidden class), like the original "Get Started" */}
          {mounted && loggedIn ? (
            <>
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="hidden rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-foreground transition-colors hover:border-foreground/30 sm:inline-flex"
                >
                  Admin
                </Link>
              )}
              {/* User chip — hide on very small screens */}
              <div className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 sm:flex">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent font-display text-[10px] font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() ?? <User className="size-3" />}
                </span>
                <span className="max-w-[100px] truncate font-mono text-xs text-foreground">
                  {user?.name ?? "Account"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                id="header-logout"
                className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                id="header-login"
                className="rounded-md border border-line bg-surface px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-foreground transition-colors hover:border-foreground/30"
              >
                Login
              </Link>
              <Link
                href="/signup"
                id="header-signup"
                className="rounded-md bg-accent px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent-foreground transition-colors hover:bg-accent-ink"
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
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

      {/* Mobile dropdown menu */}
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
          {/* Mobile auth links in hamburger menu */}
          <div className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
            {mounted && loggedIn ? (
              <>
                {user?.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2.5 font-semibold text-accent-ink transition-colors hover:bg-background"
                  >
                    Admin dashboard
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => { handleLogout(); setOpen(false); }}
                  className="flex items-center gap-2 rounded-md px-2 py-2.5 text-left text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                >
                  <LogOut className="size-3.5" />
                  Logout {user?.name ? `(${user.name})` : ""}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2.5 font-semibold text-accent-ink transition-colors hover:bg-background"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
