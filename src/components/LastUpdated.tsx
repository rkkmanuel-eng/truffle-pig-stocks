"use client";

import { useEffect, useState } from "react";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LastUpdated({ iso }: { iso: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText(formatRelative(iso));
    const id = setInterval(() => setText(formatRelative(iso)), 60_000);
    return () => clearInterval(id);
  }, [iso]);

  if (!text) return <time dateTime={iso}>{iso}</time>;

  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()}>
      {text}
    </time>
  );
}
