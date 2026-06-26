import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createFeedback } from "@/lib/db";

const VALID_CATEGORIES = ["bug", "feature", "general", "data"];

export async function POST(request: NextRequest) {
  const user = await getSession();

  const body = await request.json();
  const { category, message } = body;

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (!message || typeof message !== "string" || message.trim().length < 5) {
    return NextResponse.json({ error: "Message must be at least 5 characters" }, { status: 400 });
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: "Message must be under 2000 characters" }, { status: 400 });
  }

  createFeedback(user?.id ?? null, category, message.trim());

  return NextResponse.json({ ok: true });
}
