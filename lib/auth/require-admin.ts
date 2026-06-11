import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth/session";

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const email = await verifySessionToken(token);

  if (!email) {
    return { email: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { email, error: null };
}
