/** Short, human-friendly job reference for copy and support (not a separate DB field). */
export function formatJobNumber(jobId: string): string {
  const compact = jobId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `JOB-${compact}`;
}
