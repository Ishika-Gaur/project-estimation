"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://project-estimation-backend-fp5x.onrender.com";

function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="auth-pw-checks">
      {checks.map((c) => (
        <span key={c.label} className={`auth-pw-check ${c.ok ? "ok" : ""}`}>
          <CheckCircle2 className="size-3" />
          {c.label}
        </span>
      ))}
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  function validate() {
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/password-reset-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Password reset failed. Please try again.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-bg" aria-hidden="true">
          <div className="auth-blob auth-blob-1" />
          <div className="auth-blob auth-blob-2" />
        </div>
        <div className="auth-wrapper">
          <Link href="/" className="auth-logo">
            <span className="auth-logo-icon">C</span>
            <span className="auth-logo-name">CostifyAI</span>
          </Link>
          <div className="auth-card rise">
            <div className="auth-card-head">
              <div className="auth-icon-ring bg-destructive/10">
                <AlertCircle className="auth-icon text-destructive" />
              </div>
              <h1 className="auth-title">Invalid reset link</h1>
              <p className="auth-subtitle">
                This password reset link is invalid or has expired.
              </p>
            </div>
            <div className="mt-6">
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] hover:bg-background"
              >
                Request new reset link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Animated background blobs */}
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>

      <div className="auth-wrapper">
        {/* Logo */}
        <Link href="/" className="auth-logo">
          <span className="auth-logo-icon">C</span>
          <span className="auth-logo-name">CostifyAI</span>
        </Link>

        {/* Card */}
        <div className="auth-card rise">
          {!success ? (
            <>
              {/* Card header */}
              <div className="auth-card-head">
                <div className="auth-icon-ring">
                  <Lock className="auth-icon" />
                </div>
                <h1 className="auth-title">Set new password</h1>
                <p className="auth-subtitle">
                  Enter your new password below
                </p>
              </div>

              {/* Error banner */}
              {error && (
                <div className="auth-error" role="alert">
                  <AlertCircle className="auth-error-icon" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                {/* Password */}
                <div className="auth-field">
                  <label htmlFor="reset-password" className="auth-label">
                    New password
                  </label>
                  <div className="auth-input-wrap">
                    <input
                      id="reset-password"
                      name="password"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="auth-input auth-input-pw"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="auth-eye"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  <PasswordStrength password={form.password} />
                </div>

                {/* Confirm Password */}
                <div className="auth-field">
                  <label htmlFor="reset-confirm" className="auth-label">
                    Confirm new password
                  </label>
                  <div className="auth-input-wrap">
                    <input
                      id="reset-confirm"
                      name="confirm"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={form.confirm}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`auth-input auth-input-pw ${
                        form.confirm && form.confirm !== form.password
                          ? "auth-input-err"
                          : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="auth-eye"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {form.confirm && form.confirm !== form.password && (
                    <p className="auth-field-err">Passwords don&apos;t match</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-btn"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Lock className="size-4" />
                  )}
                  {loading ? "Resetting..." : "Reset password"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4" />
                  Back to login
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success state */}
              <div className="auth-card-head">
                <div className="auth-icon-ring bg-green-500/10">
                  <CheckCircle2 className="auth-icon text-green-600" />
                </div>
                <h1 className="auth-title">Password reset successful</h1>
                <p className="auth-subtitle">
                  Your password has been updated. Redirecting to login...
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-page" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
