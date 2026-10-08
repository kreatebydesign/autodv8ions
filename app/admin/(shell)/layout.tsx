import AdminBrandLockup from "@/components/admin/AdminBrandLockup";
import AdminNotifications from "@/components/admin/AdminNotifications";
import AdminSidebar from "@/components/admin/AdminSidebar";
import GmailNotificationsProvider from "@/components/admin/GmailNotificationsProvider";
import "../admin.css";
import "../admin-dashboard.css";

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-theme dash-shell">
      <GmailNotificationsProvider>
        <div className="lg:flex">
          <AdminSidebar />
          <main className="dash-main min-h-screen flex-1 lg:pl-64">
            <div className="dash-mobile-bar lg:hidden">
              <AdminBrandLockup size="mobile" />
              <AdminNotifications placement="mobile" />
            </div>
            <div className="dash-content">{children}</div>
          </main>
        </div>
      </GmailNotificationsProvider>
    </div>
  );
}
