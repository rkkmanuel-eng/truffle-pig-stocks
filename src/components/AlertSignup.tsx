"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import AuthModal from "./AuthModal";

interface Props {
  strategySlug?: string;
  symbol?: string;
  onClose: () => void;
}

export default function AlertSignup({ strategySlug, symbol, onClose }: Props) {
  const { user } = useAuth();
  const [buffer, setBuffer] = useState(5);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  if (!user && !showAuth) {
    return (
      <div className="fixed inset-0 bg-[var(--th-overlay)] backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-[var(--th-bg-raised)] border border-[var(--th-border)] rounded-xl p-6 w-full max-w-sm mx-4 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--th-text)] mb-2">Sign in to set alerts</h3>
          <p className="text-sm text-[var(--th-text-muted)] mb-5">
            Create an account or log in to receive SMS alerts when stocks cross your thresholds.
          </p>
          <button
            onClick={() => setShowAuth(true)}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Sign In / Sign Up
          </button>
          <button onClick={onClose} className="mt-3 text-xs text-[var(--th-text-faint)] hover:text-[var(--th-text-secondary)]">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!user && showAuth) {
    return <AuthModal onClose={onClose} onSuccess={() => setShowAuth(false)} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategySlug: strategySlug ?? null,
          symbol: symbol ?? null,
          bufferPercent: buffer,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to subscribe");
      }

      setStatus("success");
      setMessage(
        symbol
          ? `Alert set for ${symbol} at ${buffer}% threshold buffer`
          : `You'll be notified when stocks join or leave this list at ${buffer}% threshold buffer`
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--th-overlay)] backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--th-bg-raised)] border border-[var(--th-border)] rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[var(--th-text)]">
            {symbol ? `Alert for ${symbol}` : "Alert for Strategy"}
          </h3>
          <button onClick={onClose} className="text-[var(--th-text-faint)] hover:text-[var(--th-text-secondary)] text-2xl leading-none">
            &times;
          </button>
        </div>

        {!symbol && (
          <p className="text-xs text-[var(--th-text-muted)] -mt-2 mb-3">
            You&apos;ll be notified when stocks join or leave this strategy list.
          </p>
        )}

        {status === "success" ? (
          <div className="text-center py-4">
            <div className="text-green-400 text-lg mb-2">Subscribed!</div>
            <p className="text-[var(--th-text-muted)] text-sm">{message}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-[var(--th-active)] rounded hover:bg-[var(--th-hover)] text-sm text-[var(--th-text-secondary)]"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--th-text-secondary)] mb-1">
                Threshold Buffer: {buffer}%
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={buffer}
                onChange={(e) => setBuffer(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-[var(--th-text-ghost)] mt-1">
                <span>Exact (0%)</span>
                <span>20% buffer</span>
              </div>
              <p className="text-xs text-[var(--th-text-faint)] mt-2">
                At {buffer}% buffer, you&apos;ll be alerted when a stock is within {buffer}% of
                crossing a threshold.
              </p>
            </div>

            {status === "error" && (
              <p className="text-red-400 text-sm">{message}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {status === "loading" ? "Subscribing..." : "Subscribe to Alerts"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
