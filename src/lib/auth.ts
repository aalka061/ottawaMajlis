import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "ottawa_majlis_admin";
const MAX_AGE = 60 * 60 * 24 * 14; // two weeks

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) {
    throw new Error("ADMIN_SESSION_SECRET is not set.");
  }
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function matches(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function passwordIsCorrect(candidate: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return matches(candidate, expected);
}

export async function startSession() {
  const jar = await cookies();
  jar.set(COOKIE, sign("admin"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isSignedIn() {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return false;
  }
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  return matches(token, sign("admin"));
}
