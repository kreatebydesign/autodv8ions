import { Suspense } from "react";
import JobsClient from "@/components/admin/JobsClient";
import { getRecentJobs } from "@/lib/jobs/service";

export default async function AdminJobsPage() {
  const jobs = await getRecentJobs(100);

  return (
    <Suspense fallback={<div className="admin-panel p-5 job-meta">Loading jobs…</div>}>
      <JobsClient initialJobs={jobs} />
    </Suspense>
  );
}
