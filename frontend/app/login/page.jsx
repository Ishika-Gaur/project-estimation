"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errors = {};
    if (!email.trim()) errors.email = "Email is required";
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address";
    if (!password) errors.password = "Password is required";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const fallback =
          res.status === 401 || res.status === 400
            ? "Invalid email or password."
            : "Could not reach the server. Please try again.";
        setFormError(data.detail || data.message || fallback);
        return;
      }

      if (data.token) localStorage.setItem("token", data.token);
      router.push("/estimate");
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="flex items-center justify-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-ink font-display text-sm font-bold text-ink-foreground">
            C
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            CostlyAI
          </span>
        </Link>
        <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Project cost &amp; timeline estimator
        </p>

        <div className="mt-8 rounded-xl border border-line bg-surface p-6 shadow-card">
          <h1 className="font-display text-xl font-semibold text-foreground">Log in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back. Enter your details to continue.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            {formError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive"
              >
                {formError}
              </p>
            )}

            <div>
              <label
                htmlFor="email"
                className="block font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className="mt-1.5 w-full rounded-md border border-line bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
              {fieldErrors.email && (
                <p className="mt-1.5 font-mono text-[11px] text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className="mt-1.5 w-full rounded-md border border-line bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
              />
              {fieldErrors.password && (
                <p className="mt-1.5 font-mono text-[11px] text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-accent px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent-foreground transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Logging in…" : "Log in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
