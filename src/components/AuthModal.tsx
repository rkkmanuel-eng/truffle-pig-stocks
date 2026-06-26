"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ onClose, onSuccess }: Props) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const err = mode === "login"
      ? await login(email, password)
      : await signup(email, password, name);

    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      onSuccess?.();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-[var(--th-overlay)] backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--th-bg-raised)] border border-[var(--th-border)] rounded-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--th-text)]">
            {mode === "login" ? "Log In" : "Create Account"}
          </h2>
          <button onClick={onClose} className="text-[var(--th-text-faint)] hover:text-[var(--th-text)] text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-xs text-[var(--th-text-muted)] block mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-[var(--th-input)] border border-[var(--th-border)] text-[var(--th-text)] text-sm focus:outline-none focus:border-[var(--th-border-focus)]"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-[var(--th-text-muted)] block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-[var(--th-input)] border border-[var(--th-border)] text-[var(--th-text)] text-sm focus:outline-none focus:border-[var(--th-border-focus)]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--th-text-muted)] block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-lg bg-[var(--th-input)] border border-[var(--th-border)] text-[var(--th-text)] text-sm focus:outline-none focus:border-[var(--th-border-focus)]"
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {submitting ? "..." : mode === "login" ? "Log In" : "Sign Up"}
          </button>
        </form>

        <p className="text-xs text-[var(--th-text-faint)] text-center mt-4">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => { setMode("signup"); setError(null); }} className="text-blue-400 hover:text-blue-300">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(null); }} className="text-blue-400 hover:text-blue-300">
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
