import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserSubscriptions, getSubscriptionById, deleteSubscription, updateSubscriptionBuffer } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!user.phone) return NextResponse.json({ subscriptions: [] });

  const subs = getUserSubscriptions(user.phone);
  return NextResponse.json({ subscriptions: subs });
}

export async function DELETE(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });

  const sub = getSubscriptionById(id);
  if (!sub || sub.phone !== user.phone) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  deleteSubscription(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id, bufferPercent } = await request.json();
  if (!id) return NextResponse.json({ error: "Subscription ID required" }, { status: 400 });

  const sub = getSubscriptionById(id);
  if (!sub || sub.phone !== user.phone) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const buffer = Math.min(20, Math.max(0, Number(bufferPercent) || 0));
  updateSubscriptionBuffer(id, buffer);
  return NextResponse.json({ ok: true });
}
