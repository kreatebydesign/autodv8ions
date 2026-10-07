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
    <aside className="dash-rail admin-no-print">
      <div className="dash-rail-brand">
        <Image
          src="/images/logos/dv8-logo.png"
          alt="AutoDV8ions"
          width={40}
          height={40}
          className="h-10 w-10 object-contain"
        />
        <div className="dash-rail-brand-copy">
          <p className="dash-rail-kicker">Workspace</p>
          <p className="dash-rail-title">AutoDV8ions</p>
        </div>
      </div>

      <nav className="dash-rail-nav">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const showJobsBadge = item.badgeKey === "jobs" && Boolean(jobsBadge);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`dash-rail-link${active ? " is-active" : ""}`}
              aria-label={
                showJobsBadge
                  ? `Jobs, ${jobsBadge} unread customer replies`
                  : undefined
              }
            >
              <span>{item.label}</span>
              {showJobsBadge ? (
                <span className="dash-rail-badge" aria-hidden="true">
                  {jobsBadge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="dash-rail-footer">
        <button
          type="button"
          onClick={handleLogout}
          className="dash-rail-signout"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
