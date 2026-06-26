import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") {
    return NextResponse.next();
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin) return NextResponse.next();

  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return NextResponse.next();
  } catch {
    // malformed origin — reject
  }

  return NextResponse.json(
    { error: "Forbidden: cross-origin request" },
    { status: 403 }
  );
}

export const config = {
  matcher: "/api/:path*",
};
