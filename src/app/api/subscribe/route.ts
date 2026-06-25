import { NextRequest, NextResponse } from "next/server";
import { addSubscription } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phone, strategySlug, symbol, bufferPercent } = body;

  if (!phone || typeof phone !== "string" || phone.length < 10) {
    return NextResponse.json({ error: "Valid phone number required" }, { status: 400 });
  }

  if (!strategySlug && !symbol) {
    return NextResponse.json({ error: "Must specify strategySlug or symbol" }, { status: 400 });
  }

  const buffer = Math.min(20, Math.max(0, Number(bufferPercent) || 0));

  addSubscription(phone, strategySlug ?? null, symbol ?? null, buffer);

  return NextResponse.json({ ok: true, phone, strategySlug, symbol, bufferPercent: buffer });
}
