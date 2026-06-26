"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type ThemeMode = "auto" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "auto",
  resolved: "dark",
  setMode: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSunTimes(lat: number, lng: number): { sunrise: number; sunset: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;

  const radLat = (lat * Math.PI) / 180;
  const decl = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
  const radDecl = (decl * Math.PI) / 180;

  const cosH = -(Math.sin(radLat) * Math.sin(radDecl)) / (Math.cos(radLat) * Math.cos(radDecl));
  if (cosH > 1) return { sunrise: 7, sunset: 17 };
  if (cosH < -1) return { sunrise: 0, sunset: 24 };

  const H = (Math.acos(cosH) * 180) / Math.PI;
  const solarNoon = 12 - lng / 15;
  const offset = -now.getTimezoneOffset() / 60;
  const correctedNoon = solarNoon + offset;

  return {
    sunrise: correctedNoon - H / 15,
    sunset: correctedNoon + H / 15,
  };
}

function resolveAuto(lat: number | null, lng: number | null): ResolvedTheme {
  if (lat == null || lng == null) {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? "light" : "dark";
  }
  const { sunrise, sunset } = getSunTimes(lat, lng);
  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  return hour >= sunrise && hour < sunset ? "light" : "dark";
}

const STORAGE_KEY = "qia-theme";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (stored === "light" || stored === "dark" || stored === "auto") {
      setModeState(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (mode !== "auto") return;
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, [mode]);

  const computeResolved = useCallback(() => {
    if (mode === "light" || mode === "dark") return mode;
    return resolveAuto(coords?.lat ?? null, coords?.lng ?? null);
  }, [mode, coords]);

  useEffect(() => {
    setResolved(computeResolved());
    if (mode !== "auto") return;
    const interval = setInterval(() => setResolved(computeResolved()), 60000);
    return () => clearInterval(interval);
  }, [mode, coords, computeResolved]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved, hydrated]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  return (
    <ThemeContext value={{ mode, resolved, setMode }}>
      {children}
    </ThemeContext>
  );
}
