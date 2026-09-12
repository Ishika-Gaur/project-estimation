"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from "lucide-react";
import { setToken, removeToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "http://https://project-estimation-backend-fp5x.onrender.com";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Login failed. Please try again.");
        return;
      }
      // User portal authorization check
      if (data.role === "admin") {
        removeToken();
        setError("Admins cannot log in here. Please use the Admin Portal.");
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
              <LogIn className="auth-icon" />
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your CostlyAI account</p>
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
              <label htmlFor="login-email" className="auth-label">
                Email address
              </label>
              <input
                id="login-email"
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
              <div className="auth-label-row">
                <label htmlFor="login-password" className="auth-label">
                  Password
                </label>
                <Link href="/forgot-password" className="auth-forgot">
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
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
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              id="login-submit"
              className="auth-btn"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="auth-switch">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="auth-switch-link">
              Create one free
            </Link>
          </p>
        </div>

        <p className="auth-footer">
          By signing in you agree to our{" "}
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
