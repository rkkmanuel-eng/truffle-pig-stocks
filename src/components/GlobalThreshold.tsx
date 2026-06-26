"use client";

import { useRouter, usePathname } from "next/navigation";

export default function GlobalThreshold({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (v: number) => {
    const params = new URLSearchParams();
    if (v > 0) params.set("buffer", String(v));
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div className="flex items-center gap-4 bg-[var(--th-hover)] border border-[var(--th-border)] rounded-lg px-4 py-3">
      <label className="text-sm text-[var(--th-text-muted)] whitespace-nowrap">Threshold Buffer:</label>
      <input
        type="range"
        min="0"
        max="20"
        step="1"
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="flex-1 accent-blue-500"
      />
      <span className="text-sm font-mono font-semibold text-blue-400 w-10 text-right">
        {value}%
      </span>
    </div>
  );
}
