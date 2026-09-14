"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { setToken, removeToken } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL || "https://project-estimation-backend-fp5x.onrender.com";

export default function AdminLoginPage() {
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
      
      // Admin authorization check
      if (data.role !== "admin") {
        removeToken();
        setError("Unauthorized. This portal is strictly for administrators.");
        return;
      }
      
      setToken(data.access_token, data.refresh_token);
      router.push("/admin");
    } catch {
      setError("Could not reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page bg-background selection:bg-accent/30 text-foreground">
      {/* Animated background blobs with an accent color for Admin */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="auth-wrapper relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 sm:px-6">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-ink-foreground shadow-sm">
              <span className="font-display text-xl font-bold">C</span>
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">CostifyAI</span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-line bg-surface/80 p-8 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Card header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20 text-accent-ink">
              <ShieldCheck className="size-7" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Admin Portal</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to manage the workspace</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-foreground">
                Administrator Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="admin@CostifyAI.com"
                className="w-full rounded-lg border border-line bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-line bg-background px-4 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-ink-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {loading ? "Authenticating…" : "Secure Sign In"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Not an admin?{" "}
            <Link href="/login" className="font-semibold text-foreground hover:text-accent transition-colors">
              Go to User Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
