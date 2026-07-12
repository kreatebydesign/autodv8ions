import ReviewWorkspace from "@/components/admin/review/ReviewWorkspace";
import { listReviewWorkspaceItems } from "@/lib/live-portfolio/review-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminReviewPage() {
  const items = await listReviewWorkspaceItems();

  return <ReviewWorkspace initialItems={items} />;
}
