"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AdminBrandLockup from "@/components/admin/AdminBrandLockup";
import { useGmailNotificationsOptional } from "@/components/admin/GmailNotificationsProvider";

type NavItem = {
  href: string;
  label: string;
  badgeKey?: "jobs";
};

type NavSection = {
  id: string;
  label?: string;
  tone?: "primary" | "system";
  items: NavItem[];
};

/**
 * Presentation-only navigation.
 * Routes unchanged; labels follow locked KXD product language.
 * No capability gating in this phase.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    id: "primary",
    tone: "primary",
    items: [
      { href: "/admin/dashboard", label: "Overview" },
      { href: "/admin/jobs", label: "Jobs", badgeKey: "jobs" },
      { href: "/admin/customers", label: "Clients" },
      { href: "/admin/invoices", label: "Billing" },
    ],
  },
  {
    id: "media",
    tone: "primary",
    items: [
      { href: "/admin/content", label: "Media" },
      { href: "/admin/review", label: "Review" },
    ],
  },
  {
    id: "settings",
    tone: "primary",
    items: [{ href: "/admin/settings", label: "Settings" }],
  },
  {
    id: "advanced",
    tone: "system",
    items: [
      { href: "/admin/media", label: "Processing" },
      { href: "/admin/portfolio", label: "Showcase" },
    ],
  },
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
        <AdminBrandLockup size="rail" />
      </div>

      <nav className="dash-rail-nav" aria-label="Navigation">
        {NAV_SECTIONS.map((section) => (
          <div
            key={section.id}
            className={`dash-rail-section${
              section.tone === "system" ? " is-system" : ""
            }`}
          >
            {section.label ? (
              <p className="dash-rail-section-label">{section.label}</p>
            ) : null}
            <div className="dash-rail-section-links">
              {section.items.map((item) => {
                const active = pathname.startsWith(item.href);
                const showJobsBadge =
                  item.badgeKey === "jobs" && Boolean(jobsBadge);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`dash-rail-link${active ? " is-active" : ""}`}
                    aria-label={
                      showJobsBadge
                        ? `Jobs, ${jobsBadge} unread replies`
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
            </div>
          </div>
        ))}
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
