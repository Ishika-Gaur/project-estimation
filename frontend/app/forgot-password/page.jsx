"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, AlertCircle, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://project-estimation-backend-fp5x.onrender.com";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/password-reset-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Request failed. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
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
          <span className="auth-logo-name">CostlyAI</span>
        </Link>

        {/* Card */}
        <div className="auth-card rise">
          {!success ? (
            <>
              {/* Card header */}
              <div className="auth-card-head">
                <div className="auth-icon-ring">
                  <KeyRound className="auth-icon" />
                </div>
                <h1 className="auth-title">Reset your password</h1>
                <p className="auth-subtitle">
                  Enter your email and we'll send you a reset link
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
                {/* Email */}
                <div className="auth-field">
                  <label htmlFor="reset-email" className="auth-label">
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                  />
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
                    <KeyRound className="size-4" />
                  )}
                  {loading ? "Sending..." : "Send reset link"}
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
                <h1 className="auth-title">Check your email</h1>
                <p className="auth-subtitle">
                  We've sent a password reset link to {email}
                </p>
              </div>

              <div className="mt-6 rounded-lg border border-line bg-surface p-4">
                <p className="text-sm text-muted-foreground">
                  The link will expire in 1 hour. If you don't see the email, check your spam folder.
                </p>
              </div>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4" />
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
