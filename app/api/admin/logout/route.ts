import { NextResponse } from "next/server";
import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(getSessionCookieName(), "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
