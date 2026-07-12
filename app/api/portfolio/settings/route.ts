import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  getPortfolioEngineStats,
  updatePortfolioEngineLimits,
  type PortfolioEngineLimits,
} from "@/lib/portfolio-engine";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const stats = await getPortfolioEngineStats();
  return NextResponse.json({ ok: true, stats });
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  let body: Partial<PortfolioEngineLimits> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = await updatePortfolioEngineLimits(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const stats = await getPortfolioEngineStats();
  return NextResponse.json({ ok: true, limits: result.limits, stats });
}
