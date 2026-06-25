"use client";

import { useState } from "react";

interface Props {
  strategySlug?: string;
  symbol?: string;
  onClose: () => void;
}

export default function AlertSignup({ strategySlug, symbol, onClose }: Props) {
  const [phone, setPhone] = useState("");
  const [buffer, setBuffer] = useState(5);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
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
          : `Alert set for all ${strategySlug} stocks at ${buffer}% threshold buffer`
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {symbol ? `Alert for ${symbol}` : `Alert for Strategy`}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        {status === "success" ? (
          <div className="text-center py-4">
            <div className="text-green-600 text-lg mb-2">Subscribed!</div>
            <p className="text-gray-600 text-sm">{message}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Threshold Buffer: {buffer}%
              </label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={buffer}
                onChange={(e) => setBuffer(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Exact threshold (0%)</span>
                <span>20% buffer</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                At {buffer}% buffer, you&apos;ll be alerted when a stock is within {buffer}% of
                crossing a threshold — giving you early notice before the criteria are fully met.
              </p>
            </div>

            {status === "error" && (
              <p className="text-red-600 text-sm">{message}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {status === "loading" ? "Subscribing..." : "Subscribe to Alerts"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
