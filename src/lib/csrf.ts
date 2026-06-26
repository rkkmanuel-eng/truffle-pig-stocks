import { NextResponse } from "next/server";

export function checkOrigin(req: Request): NextResponse | null {
  if (req.method === "GET" || req.method === "HEAD") return null;

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (!origin) return null;

  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return null;
  } catch {
    // malformed origin
  }

  return NextResponse.json(
    { error: "Forbidden: cross-origin request" },
    { status: 403 }
  );
}
