"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data.success) {
      setError(data.error || "Login failed.");
      return;
    }

    router.push(searchParams.get("next") || "/admin/dashboard");
    router.refresh();
  }

  return (
    <div className="admin-theme flex min-h-screen items-center justify-center px-5">
      <div className="admin-panel w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <Image
            src="/images/logos/autodv8ions-fb-pic-logo.png"
            alt="AutoDV8ions"
            width={96}
            height={96}
            className="mx-auto mb-4 h-24 w-24 object-contain"
          />
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--dv8-muted)]">
            Command Center
          </p>
          <h1 className="mt-2 text-2xl font-light">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="admin-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="admin-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="admin-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="admin-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-[var(--dv8-red-bright)]">{error}</p>}
          <button type="submit" className="admin-btn admin-btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
