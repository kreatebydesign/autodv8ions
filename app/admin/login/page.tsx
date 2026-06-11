import { Suspense } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import "../admin.css";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="admin-theme min-h-screen" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
