"use client";

import { useState } from "react";
import { useAuthContext } from "./AuthProvider";
import toast from "react-hot-toast";

export function LoginForm({ defaultMode = "signin" }: { defaultMode?: "signin" | "signup" }) {
  const { signIn, signUp, signInWithGoogle } = useAuthContext();
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  const isSignUp = mode === "signup";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--parchment)" }}
    >
      <div className="w-full max-w-sm">

        {/* ── Brand header ── */}
        <div className="text-center mb-8">
          <h1
            className="font-serif font-bold tracking-tight"
            style={{ fontSize: "2rem", color: "var(--ink)" }}
          >
            InvenStories
          </h1>
          <p
            className="font-serif italic mt-2 leading-relaxed"
            style={{ color: "var(--gold)", fontSize: "0.9rem" }}
          >
            What we keep keeps us —<br />across time, across generations
          </p>
          <div className="flex items-center gap-3 justify-center mt-4">
            <div className="h-px w-12" style={{ background: "var(--border)" }} />
            <span style={{ color: "var(--gold)", fontSize: "0.7rem" }}>✦</span>
            <div className="h-px w-12" style={{ background: "var(--border)" }} />
          </div>
        </div>

        {/* ── Mode header ── */}
        <div className="mb-5 text-center">
          <h2
            className="font-serif font-semibold"
            style={{ fontSize: "1.2rem", color: "var(--ink)" }}
          >
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          {isSignUp && (
            <p className="text-sm mt-1" style={{ color: "var(--ink-mid)" }}>
              Your archive starts here.
            </p>
          )}
        </div>

        {/* ── Card ── */}
        <div
          className="flex flex-col gap-4 p-6"
          style={{
            background: "var(--parchment-light)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
          }}
        >
          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 font-semibold transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{
              border: "1px solid var(--border)",
              background: "var(--parchment)",
              color: "var(--ink)",
              borderRadius: "7px",
              fontSize: "0.9rem",
            }}
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>or use email</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {isSignUp && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold" style={{ color: "var(--ink-mid)" }}>
                  Your name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rebekah"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 focus:outline-none"
                  style={{
                    background: "var(--parchment)",
                    border: "1px solid var(--border)",
                    borderRadius: "7px",
                    color: "var(--ink)",
                    fontSize: "1rem",
                  }}
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "var(--ink-mid)" }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 focus:outline-none"
                style={{
                  background: "var(--parchment)",
                  border: "1px solid var(--border)",
                  borderRadius: "7px",
                  color: "var(--ink)",
                  fontSize: "1rem",
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: "var(--ink-mid)" }}>
                Password {isSignUp && <span style={{ color: "var(--ink-light)", fontWeight: 400 }}>(min. 6 characters)</span>}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 focus:outline-none"
                style={{
                  background: "var(--parchment)",
                  border: "1px solid var(--border)",
                  borderRadius: "7px",
                  color: "var(--ink)",
                  fontSize: "1rem",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-semibold transition-opacity hover:opacity-85 disabled:opacity-50 mt-1"
              style={{
                background: "var(--gold)",
                color: "#faf7f2",
                borderRadius: "7px",
                fontSize: "1rem",
              }}
            >
              {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>
        </div>

        {/* ── Switch mode ── */}
        <div
          className="mt-4 p-4 text-center"
          style={{
            background: "var(--parchment-light)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
          }}
        >
          {isSignUp ? (
            <>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                Already have an account?
              </p>
              <button
                onClick={() => setMode("signin")}
                className="mt-2 text-sm font-semibold transition-opacity hover:opacity-75"
                style={{ color: "var(--gold)" }}
              >
                Sign in instead →
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                New to InvenStories?
              </p>
              <p className="text-xs mt-0.5 mb-2" style={{ color: "var(--ink-light)" }}>
                Create a free account to start your archive.
              </p>
              <button
                onClick={() => setMode("signup")}
                className="w-full py-3 font-semibold transition-opacity hover:opacity-85"
                style={{
                  border: "2px solid var(--gold)",
                  color: "var(--gold)",
                  borderRadius: "7px",
                  fontSize: "0.95rem",
                  background: "transparent",
                }}
              >
                Create a free account
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
