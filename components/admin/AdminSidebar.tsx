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
  label: string;
  tone?: "primary" | "system";
  items: NavItem[];
};

/**
 * Presentation-only navigation IA.
 * All routes remain reachable; no capability gating in Phase 1.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    id: "operations",
    label: "Operations",
    tone: "primary",
    items: [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/jobs", label: "Jobs", badgeKey: "jobs" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/invoices", label: "Invoices" },
    ],
  },
  {
    id: "content",
    label: "Content",
    tone: "primary",
    items: [
      { href: "/admin/content", label: "Incoming" },
      { href: "/admin/review", label: "Review" },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    tone: "primary",
    items: [{ href: "/admin/settings", label: "Settings" }],
  },
  {
    id: "system",
    label: "System Tools",
    tone: "system",
    items: [
      { href: "/admin/media", label: "Media Processing" },
      { href: "/admin/portfolio", label: "Portfolio Engine" },
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

      <nav className="dash-rail-nav" aria-label="Admin workspace">
        {NAV_SECTIONS.map((section) => (
          <div
            key={section.id}
            className={`dash-rail-section${
              section.tone === "system" ? " is-system" : ""
            }`}
          >
            <p className="dash-rail-section-label">{section.label}</p>
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
