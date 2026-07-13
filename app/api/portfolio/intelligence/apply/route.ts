import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { applyPortfolioIntelligenceSuggestions } from "@/lib/portfolio-intelligence/persist";

export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  let body: {
    id?: string;
    featuredMediaId?: string | null;
    galleryOrder?: string[];
    markHomepageCandidate?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const result = await applyPortfolioIntelligenceSuggestions({
    galleryItemId: body.id,
    featuredMediaId: body.featuredMediaId,
    galleryOrder: body.galleryOrder,
    markHomepageCandidate: body.markHomepageCandidate,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
