"use client";

import { useState } from "react";

const CATEGORIES = [
  { value: "general", label: "General Feedback" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "data", label: "Data Issue" },
];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  function reset() {
    setCategory("general");
    setMessage("");
    setStatus("idle");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <>
      <button
        onClick={() => { reset(); setOpen(true); }}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full bg-[var(--th-hover)] border border-[var(--th-border)] text-[var(--th-text-muted)] hover:text-[var(--th-text)] hover:bg-[var(--th-active)] transition-colors text-xs font-medium shadow-lg backdrop-blur-sm"
        title="Send feedback"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 bg-[var(--th-overlay)] backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-[var(--th-bg-raised)] border border-[var(--th-border)] rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[var(--th-text)]">Send Feedback</h3>
              <button onClick={() => setOpen(false)} className="text-[var(--th-text-faint)] hover:text-[var(--th-text-secondary)] text-2xl leading-none">
                &times;
              </button>
            </div>

            {status === "success" ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <div className="text-green-400 text-lg mb-1">Thank you!</div>
                <p className="text-[var(--th-text-muted)] text-sm">Your feedback has been submitted.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-4 px-4 py-2 bg-[var(--th-active)] rounded hover:bg-[var(--th-hover)] text-sm text-[var(--th-text-secondary)]"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[var(--th-text-muted)] mb-1.5">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          category === cat.value
                            ? "bg-blue-600 text-white"
                            : "bg-[var(--th-hover)] text-[var(--th-text-muted)] hover:bg-[var(--th-active)] hover:text-[var(--th-text-secondary)]"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[var(--th-text-muted)] mb-1.5">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    minLength={5}
                    maxLength={2000}
                    rows={4}
                    placeholder="Tell us what's on your mind..."
                    className="w-full px-3 py-2 rounded-lg bg-[var(--th-input)] border border-[var(--th-border)] text-[var(--th-text)] text-sm focus:outline-none focus:border-[var(--th-border-focus)] resize-none placeholder:text-[var(--th-text-ghost)]"
                  />
                  <div className="text-right text-[10px] text-[var(--th-text-ghost)] mt-0.5">
                    {message.length}/2000
                  </div>
                </div>

                {status === "error" && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading" || message.trim().length < 5}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {status === "loading" ? "Sending..." : "Submit Feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
