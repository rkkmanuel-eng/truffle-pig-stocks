import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getUserById, type UserRow } from "./db";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable is required in production");
}
const SECRET = new TextEncoder().encode(jwtSecret || "dev-only-secret-do-not-use-in-prod");

const COOKIE_NAME = "qia_session";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  email_verified: boolean;
}

function toSessionUser(user: UserRow): SessionUser {
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, email_verified: !!user.email_verified };
}

const TOKEN_MAX_AGE_DAYS = 7;
const TOKEN_REFRESH_THRESHOLD_DAYS = 2;

export async function createSession(user: UserRow): Promise<string> {
  const token = await new SignJWT({ userId: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${TOKEN_MAX_AGE_DAYS}d`)
    .sign(SECRET);

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * TOKEN_MAX_AGE_DAYS,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const userId = payload.userId as number;
    const user = getUserById(userId);
    if (!user) return null;

    if (payload.exp) {
      const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
      const thresholdSeconds = TOKEN_REFRESH_THRESHOLD_DAYS * 24 * 60 * 60;
      if (expiresIn < thresholdSeconds) {
        await createSession(user);
      }
    }

    return toSessionUser(user);
  } catch {
    return null;
  }
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
