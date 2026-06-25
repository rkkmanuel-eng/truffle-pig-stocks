import { NextRequest, NextResponse } from "next/server";
import { removeSubscription } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, strategySlug, symbol } = body;

  if (!phone) {
    return NextResponse.json({ error: "Phone required" }, { status: 400 });
  }

  removeSubscription(phone, strategySlug ?? null, symbol ?? null);

  return NextResponse.json({ ok: true });
}
