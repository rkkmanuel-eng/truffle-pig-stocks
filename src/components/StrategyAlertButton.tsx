"use client";

import { useState } from "react";
import AlertSignup from "./AlertSignup";

export default function StrategyAlertButton({ strategySlug }: { strategySlug: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
      >
        Alert on All Stocks
      </button>
      {open && (
        <AlertSignup strategySlug={strategySlug} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
