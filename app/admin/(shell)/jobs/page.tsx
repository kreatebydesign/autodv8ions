import { Suspense } from "react";
import JobsClient from "@/components/admin/JobsClient";
import { getJobById, getRecentJobs } from "@/lib/jobs/service";
import "../../admin-jobs.css";

type JobsPageProps = {
  searchParams?: Promise<{ jobId?: string }>;
};

export default async function AdminJobsPage({ searchParams }: JobsPageProps) {
  const params = (await searchParams) || {};
  const jobs = await getRecentJobs(150);

  const deepLinkId = params.jobId?.trim() || null;
  let initialJobs = jobs;

  if (deepLinkId && !jobs.some((job) => job.id === deepLinkId)) {
    const linked = await getJobById(deepLinkId);
    if (linked) {
      initialJobs = [linked, ...jobs];
    }
  }

  return (
    <Suspense
      fallback={<div className="jobs-shell-loading">Loading jobs…</div>}
    >
      <JobsClient initialJobs={initialJobs} />
    </Suspense>
  );
}
