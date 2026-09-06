"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGmailNotificationsOptional } from "@/components/admin/GmailNotificationsProvider";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/jobs", label: "Jobs", badgeKey: "jobs" as const },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/review", label: "Review" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const notifications = useGmailNotificationsOptional();
  const jobsBadge = notifications?.badgeLabel || null;

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="admin-no-print flex w-full flex-col border-b border-[var(--dv8-border)] bg-[var(--dv8-charcoal)] lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 border-b border-[var(--dv8-border)] px-5 py-5">
        <Image
          src="/images/logos/dv8-logo.png"
          alt="AutoDV8ions"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
            Workspace
          </p>
          <p className="text-sm font-light">AutoDV8ions</p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 py-4 lg:flex-col lg:overflow-visible">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const showJobsBadge = item.badgeKey === "jobs" && Boolean(jobsBadge);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-2 whitespace-nowrap px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "border-l-2 border-[var(--dv8-red)] bg-[var(--dv8-red-soft)] text-white"
                  : "text-[var(--dv8-muted)] hover:text-white"
              }`}
              aria-label={
                showJobsBadge
                  ? `Jobs, ${jobsBadge} unread customer replies`
                  : undefined
              }
            >
              <span>{item.label}</span>
              {showJobsBadge ? (
                <span className="admin-nav-badge" aria-hidden="true">
                  {jobsBadge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-[var(--dv8-border)] p-4 lg:block">
        <button
          type="button"
          onClick={handleLogout}
          className="admin-btn w-full"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
