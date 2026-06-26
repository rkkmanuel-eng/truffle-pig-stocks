"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";

interface Subscription {
  id: number;
  phone: string;
  strategy_slug: string | null;
  symbol: string | null;
  buffer_percent: number;
  active: number;
  created_at: string;
}

const STRATEGY_NAMES: Record<string, string> = {
  "value-investing": "Value Investing",
  "dividend-yield": "Dividend Yield",
  "momentum": "Momentum / Trend",
  "dogs-of-the-dow": "Dogs of the Dow",
  "dividend-king": "Dividend Kings",
  "dividend-aristocrat": "Dividend Aristocrats",
  "dividend-challenger": "Dividend Challengers",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const [tab, setTab] = useState<"profile" | "alerts">("profile");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--th-text-faint)] text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[var(--th-text)] mb-2">Sign in required</h1>
          <p className="text-sm text-[var(--th-text-muted)] mb-4">You need to be signed in to view your profile.</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--th-text)]">{user.name}</h1>
            <p className="text-sm text-[var(--th-text-faint)]">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="text-sm text-[var(--th-text-faint)] hover:text-[var(--th-text-secondary)] transition-colors flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[var(--th-border)]">
        <button
          onClick={() => setTab("profile")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            tab === "profile" ? "text-[var(--th-text)]" : "text-[var(--th-text-faint)] hover:text-[var(--th-text-secondary)]"
          }`}
        >
          Profile
          {tab === "profile" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
        </button>
        <button
          onClick={() => setTab("alerts")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            tab === "alerts" ? "text-[var(--th-text)]" : "text-[var(--th-text-faint)] hover:text-[var(--th-text-secondary)]"
          }`}
        >
          Alert Subscriptions
          {tab === "alerts" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
        </button>
      </div>

      {tab === "profile" ? (
        <ProfileTab user={user} refreshUser={refreshUser} />
      ) : (
        <AlertsTab phone={user.phone} />
      )}
    </main>
  );
}

function ProfileTab({ user, refreshUser }: { user: { id: number; email: string; name: string; phone: string | null }; refreshUser: () => Promise<void> }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    await refreshUser();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-hover)] p-6">
      <h2 className="text-lg font-semibold text-[var(--th-text)] mb-4">Account Details</h2>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="text-xs text-[var(--th-text-muted)] block mb-1">Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full px-3 py-2 rounded-lg bg-[var(--th-input)] border border-[var(--th-border)] text-[var(--th-text-faint)] text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--th-text-muted)] block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-[var(--th-input)] border border-[var(--th-border)] text-[var(--th-text)] text-sm focus:outline-none focus:border-[var(--th-border-focus)]"
          />
        </div>

        <div>
          <label className="text-xs text-[var(--th-text-muted)] block mb-1">Phone Number (for SMS alerts)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--th-input)] border border-[var(--th-border)] text-[var(--th-text)] text-sm focus:outline-none focus:border-[var(--th-border-focus)]"
            placeholder="+1 (555) 123-4567"
          />
          <p className="text-[10px] text-[var(--th-text-ghost)] mt-1">Required to receive SMS alerts</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function AlertsTab({ phone }: { phone: string | null }) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchSubs = useCallback(async () => {
    const res = await fetch("/api/auth/subscriptions");
    const data = await res.json();
    setSubs(data.subscriptions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  async function handleDelete(id: number) {
    setDeleting(id);
    await fetch("/api/auth/subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSubs((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  }

  if (!phone) {
    return (
      <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-hover)] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-yellow-600/20 flex items-center justify-center mx-auto mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="text-[var(--th-text)] font-semibold mb-1">No phone number set</h3>
        <p className="text-sm text-[var(--th-text-muted)]">Add a phone number in the Profile tab to start receiving SMS alerts.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8 text-[var(--th-text-faint)] text-sm">Loading subscriptions...</div>;
  }

  if (subs.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--th-border)] bg-[var(--th-hover)] p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <h3 className="text-[var(--th-text)] font-semibold mb-1">No active alerts</h3>
        <p className="text-sm text-[var(--th-text-muted)] mb-3">
          Use the bell icons on the main page to subscribe to strategy or stock alerts.
        </p>
        <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
          Browse strategies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm text-[var(--th-text-muted)]">{subs.length} active alert{subs.length !== 1 ? "s" : ""}</h2>
      </div>

      {subs.map((sub) => (
        <div
          key={sub.id}
          className="rounded-xl border border-[var(--th-border)] bg-[var(--th-hover)] p-4 flex items-center justify-between group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {sub.symbol && (
                <span className="font-mono font-semibold text-sm text-[var(--th-text)]">{sub.symbol}</span>
              )}
              {sub.strategy_slug && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-300">
                  {STRATEGY_NAMES[sub.strategy_slug] ?? sub.strategy_slug}
                </span>
              )}
              {!sub.symbol && !sub.strategy_slug && (
                <span className="text-sm text-[var(--th-text-muted)]">Unknown alert</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[var(--th-text-faint)]">
              <span>Buffer: {sub.buffer_percent}%</span>
              <span>Created: {formatDate(sub.created_at)}</span>
            </div>
          </div>

          <button
            onClick={() => handleDelete(sub.id)}
            disabled={deleting === sub.id}
            className="ml-4 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
            title="Remove alert"
          >
            {deleting === sub.id ? "Removing..." : "Remove"}
          </button>
        </div>
      ))}
    </div>
  );
}
