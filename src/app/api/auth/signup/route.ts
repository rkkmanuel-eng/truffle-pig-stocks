import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getUserByEmail, createUser, setVerificationToken } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { email, password, name } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
  }

  const { allowed, retryAfterSeconds } = checkRateLimit(`signup:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many signup attempts. Try again in ${retryAfterSeconds} seconds.` },
      { status: 429 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = getUserByEmail(email.toLowerCase());
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = createUser(email.toLowerCase(), hash, name);
  await createSession(user);

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  setVerificationToken(user.id, verificationToken, expires);

  // TODO: send verification email via Resend/SendGrid with link:
  // `${process.env.NEXT_PUBLIC_URL}/api/auth/verify?token=${verificationToken}`
  console.log(`[DEV] Verification link: /api/auth/verify?token=${verificationToken}`);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, phone: user.phone, email_verified: false },
  });
}
