"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { setToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://https://project-estimation-backend-fp5x.onrender.com";

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

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  function validate() {
    if (!form.name.trim()) return "Please enter your name.";
    if (!form.email) return "Please enter your email.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Registration failed. Please try again.");
        return;
      }
      setToken(data.access_token, data.refresh_token);
      router.push("/estimate");
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
          {/* Card header */}
          <div className="auth-card-head">
            <div className="auth-icon-ring">
              <UserPlus className="auth-icon" />
            </div>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">
              Start estimating project costs for free
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
            {/* Name */}
            <div className="auth-field">
              <label htmlFor="signup-name" className="auth-label">
                Full name
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Smith"
                className="auth-input"
              />
            </div>

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="signup-email" className="auth-label">
                Email address
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="auth-input"
              />
            </div>

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="signup-password" className="auth-label">
                Password
              </label>
              <div className="auth-input-wrap">
                <input
                  id="signup-password"
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
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm Password */}
            <div className="auth-field">
              <label htmlFor="signup-confirm" className="auth-label">
                Confirm password
              </label>
              <div className="auth-input-wrap">
                <input
                  id="signup-confirm"
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
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
              id="signup-submit"
              className="auth-btn"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link href="/login" className="auth-switch-link">
              Sign in
            </Link>
          </p>
        </div>

        <p className="auth-footer">
          By signing up you agree to our{" "}
          <Link href="/" className="auth-footer-link">
            Terms
          </Link>{" "}
          &amp;{" "}
          <Link href="/" className="auth-footer-link">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
