"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LogIn, UserPlus, X, Lock } from "lucide-react";

/**
 * AuthGate — a premium glassmorphism modal that appears when a
 * non-authenticated user tries to use a protected service.
 *
 * Usage:
 *   const [showAuth, setShowAuth] = useState(false);
 *   <AuthGate open={showAuth} onClose={() => setShowAuth(false)} />
 *
 *   // In the action handler:
 *   if (!isLoggedIn()) { setShowAuth(true); return; }
 */
export function AuthGate({ open, onClose, message }) {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      // Trigger entrance animation on the next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <div
      className="auth-gate-overlay"
      style={{ opacity: animateIn ? 1 : 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="auth-gate-modal"
        style={{
          opacity: animateIn ? 1 : 0,
          transform: animateIn ? "translateY(0) scale(1)" : "translateY(24px) scale(0.96)",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="auth-gate-close"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Icon */}
        <div className="auth-gate-icon-ring">
          <Lock className="auth-gate-icon" />
        </div>

        {/* Title & subtitle */}
        <h2 className="auth-gate-title">Sign in to continue</h2>
        <p className="auth-gate-subtitle">
          {message || "Create a free account or log in to use this feature."}
        </p>

        {/* CTA buttons */}
        <div className="auth-gate-actions">
          <Link href="/signup" className="auth-gate-btn-primary" id="auth-gate-signup">
            <UserPlus className="size-4" />
            Create Free Account
          </Link>
          <Link href="/login" className="auth-gate-btn-secondary" id="auth-gate-login">
            <LogIn className="size-4" />
            Log In
          </Link>
        </div>

        {/* Divider text */}
        <p className="auth-gate-note">
          Free forever · No credit card required
        </p>
      </div>
    </div>
  );
}
