import PortfolioSettingsClient from "@/components/admin/PortfolioSettingsClient";
import { getPortfolioEngineStats } from "@/lib/portfolio-engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PortfolioSettingsPage() {
  const stats = await getPortfolioEngineStats();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Portfolio Workspace
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">
          Portfolio Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--dv8-muted)]">
          Rolling showcase limits, pinned capacity, and Blob retention for the
          curated public portfolio.
        </p>
      </div>
      <PortfolioSettingsClient initialStats={stats} />
    </div>
  );
}
