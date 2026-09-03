"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LABEL_CLASS =
  "block font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground";
const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-line bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field) => (e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Enter a valid email address";
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 8) errors.password = "Use at least 8 characters";
    if (!form.confirmPassword) errors.confirmPassword = "Confirm your password";
    else if (form.confirmPassword !== form.password)
      errors.confirmPassword = "Passwords do not match";
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
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(data.detail || data.message || "Could not create your account.");
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
          <h1 className="font-display text-xl font-semibold text-foreground">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start estimating project cost and timelines.
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
              <label htmlFor="name" className={LABEL_CLASS}>
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Ada Lovelace"
                value={form.name}
                onChange={updateField("name")}
                className={INPUT_CLASS}
              />
              {fieldErrors.name && (
                <p className="mt-1.5 font-mono text-[11px] text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className={LABEL_CLASS}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={updateField("email")}
                className={INPUT_CLASS}
              />
              {fieldErrors.email && (
                <p className="mt-1.5 font-mono text-[11px] text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={LABEL_CLASS}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.password}
                onChange={updateField("password")}
                className={INPUT_CLASS}
              />
              {fieldErrors.password && (
                <p className="mt-1.5 font-mono text-[11px] text-destructive">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={LABEL_CLASS}>
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={updateField("confirmPassword")}
                className={INPUT_CLASS}
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1.5 font-mono text-[11px] text-destructive">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-accent px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-accent-foreground transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
