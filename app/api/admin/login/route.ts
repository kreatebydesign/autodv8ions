import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
  validateAdminCredentials,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 },
      );
    }

    if (!validateAdminCredentials(email, password)) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials." },
        { status: 401 },
      );
    }

    const token = await createSessionToken(email);
    const response = NextResponse.json({ success: true });
    response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[admin/login]", error);
    return NextResponse.json(
      { success: false, error: "Login failed." },
      { status: 500 },
    );
  }
}
