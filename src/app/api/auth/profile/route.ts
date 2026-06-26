import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updateUserPhone, updateUserName } from "@/lib/db";

export async function PUT(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { name, phone } = await req.json();

  if (name !== undefined) {
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    updateUserName(user.id, name);
  }

  if (phone !== undefined) {
    updateUserPhone(user.id, phone || "");
  }

  return NextResponse.json({ ok: true });
}
