import AdminSidebar from "@/components/admin/AdminSidebar";
import "../admin.css";

export default function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-theme">
      <div className="lg:flex">
        <AdminSidebar />
        <main className="min-h-screen flex-1 lg:pl-64">
          <div className="border-b border-[var(--dv8-border)] px-5 py-4 lg:hidden">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
              AutoDV8ions Command Center
            </p>
          </div>
          <div className="px-5 py-6 sm:px-8 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
