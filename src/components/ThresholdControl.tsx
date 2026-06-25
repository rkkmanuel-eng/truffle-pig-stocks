"use client";

import { useRouter, usePathname } from "next/navigation";

export default function ThresholdControl({ currentBuffer }: { currentBuffer: number }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (value: number) => {
    const params = new URLSearchParams();
    if (value > 0) params.set("buffer", String(value));
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Threshold Buffer:
        </label>
        <input
          type="range"
          min="0"
          max="20"
          step="1"
          value={currentBuffer}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="flex-1 accent-blue-600"
        />
        <span className="text-sm font-mono font-semibold text-blue-700 w-10 text-right">
          {currentBuffer}%
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Increase the buffer to see stocks that are close to meeting criteria. At 0%, only stocks
        that fully pass are shown. At 20%, stocks within 20% of each threshold are included.
      </p>
    </div>
  );
}
