import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  executeWorkDateRepairs,
  previewWorkDateRepairs,
} from "@/lib/portfolio-intelligence/repair-work-dates";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const preview = await previewWorkDateRepairs();
  if (!preview.ok) {
    return NextResponse.json({ error: preview.error }, { status: 400 });
  }

  return NextResponse.json(preview);
}

export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  let body: { confirm?: boolean; limit?: number };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await executeWorkDateRepairs(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
