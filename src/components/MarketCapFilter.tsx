"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const TIERS = [
  { label: "All", value: 0 },
  { label: "$2B+", value: 2e9 },
  { label: "$10B+", value: 10e9 },
  { label: "$50B+", value: 50e9 },
  { label: "$200B+", value: 200e9 },
] as const;

export default function MarketCapFilter({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(cap: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (cap > 0) {
      params.set("minCap", String(cap));
    } else {
      params.delete("minCap");
    }
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--th-text-muted)] whitespace-nowrap">Min Market Cap:</span>
      <div className="flex gap-1">
        {TIERS.map((tier) => (
          <button
            key={tier.value}
            onClick={() => select(tier.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer
              ${value === tier.value
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                : "bg-[var(--th-hover)] text-[var(--th-text-muted)] border border-[var(--th-border)] hover:text-[var(--th-text)] hover:bg-[var(--th-active)]"
              }`}
          >
            {tier.label}
          </button>
        ))}
      </div>
    </div>
  );
}
