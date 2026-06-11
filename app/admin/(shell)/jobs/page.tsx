import { Suspense } from "react";
import JobsClient from "@/components/admin/JobsClient";
import { getRecentJobs } from "@/lib/jobs/service";

export default async function AdminJobsPage() {
  const jobs = await getRecentJobs(100);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Operations
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Jobs</h1>
      </div>
      <Suspense fallback={<div className="admin-panel p-5">Loading jobs...</div>}>
        <JobsClient initialJobs={jobs} />
      </Suspense>
    </div>
  );
}
