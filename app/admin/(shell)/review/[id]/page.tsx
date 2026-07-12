import { notFound } from "next/navigation";
import ReviewDetailWorkspace from "@/components/admin/review/ReviewDetailWorkspace";
import { getReviewDetailItem } from "@/lib/live-portfolio/review-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminReviewDetailPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getReviewDetailItem(id);
  if (!item) notFound();

  return <ReviewDetailWorkspace item={item} />;
}
