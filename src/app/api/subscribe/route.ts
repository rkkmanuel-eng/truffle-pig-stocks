import { NextRequest, NextResponse } from "next/server";
import { addSubscription } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user.phone || user.phone.length < 10) {
    return NextResponse.json({ error: "Please add a phone number in your profile first" }, { status: 400 });
  }

  const body = await request.json();
  const { strategySlug, symbol, bufferPercent } = body;

  if (!strategySlug && !symbol) {
    return NextResponse.json({ error: "Must specify strategySlug or symbol" }, { status: 400 });
  }

  const buffer = Math.min(20, Math.max(0, Number(bufferPercent) || 0));

  addSubscription(user.phone, strategySlug ?? null, symbol ?? null, buffer);

  return NextResponse.json({ ok: true, strategySlug, symbol, bufferPercent: buffer });
}
