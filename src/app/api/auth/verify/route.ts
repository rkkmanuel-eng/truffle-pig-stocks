import { NextResponse } from "next/server";
import { verifyUserEmail } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing verification token" }, { status: 400 });
  }

  const verified = verifyUserEmail(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
  }

  return NextResponse.json({ message: "Email verified successfully" });
}
