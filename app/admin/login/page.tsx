import { Suspense } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import "../admin.css";
import "../admin-login.css";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="admin-theme admin-login" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
