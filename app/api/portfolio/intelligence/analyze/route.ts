import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  analyzeGalleryItemIntelligence,
  analyzeReviewQueueBatch,
} from "@/lib/portfolio-intelligence/batch";

export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  let body: {
    id?: string;
    ids?: string[];
    maxItems?: number;
    force?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.id) {
    const result = await analyzeGalleryItemIntelligence(body.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, analysis: result.analysis });
  }

  const batch = await analyzeReviewQueueBatch({
    ids: body.ids,
    maxItems: body.maxItems,
    force: body.force,
  });

  if (!batch.ok) {
    return NextResponse.json({ error: batch.error }, { status: 400 });
  }

  return NextResponse.json(batch);
}
