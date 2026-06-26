"use client";

import { useTheme } from "./ThemeProvider";

const MODES = ["auto", "light", "dark"] as const;

const LABELS: Record<string, string> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
};

function Icon({ mode }: { mode: string }) {
  if (mode === "light") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    );
  }
  if (mode === "dark") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2" />
      <path d="M21 12.79A9 9 0 0 1 12.21 3" opacity="0.5" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  function cycle() {
    const idx = MODES.indexOf(mode);
    setMode(MODES[(idx + 1) % MODES.length]);
  }

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--th-hover)] border border-[var(--th-border)] text-[var(--th-text-muted)] hover:text-[var(--th-text)] hover:bg-[var(--th-active)] transition-colors text-xs"
      title={`Theme: ${LABELS[mode]}`}
    >
      <Icon mode={mode} />
      <span className="hidden sm:inline">{LABELS[mode]}</span>
    </button>
  );
}
