"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import AuthModal from "./AuthModal";
import Link from "next/link";

export default function UserMenu() {
  const { user, loading, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuth(true)}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          Sign In
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/profile"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--th-hover)] hover:bg-[var(--th-active)] transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm text-[var(--th-text-secondary)]">{user.name}</span>
      </Link>
      <button
        onClick={logout}
        className="text-xs text-[var(--th-text-faint)] hover:text-[var(--th-text-secondary)] transition-colors"
      >
        Log out
      </button>
    </div>
  );
}
