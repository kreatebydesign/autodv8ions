"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const EASTER_EGG_SRC = "/images/marlboro-lights-easter-egg.png";
const LOGO_SRC = "/images/logos/autodv8ions-fb-pic-logo.png";

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
    <div className="admin-theme admin-login">
      <div className="admin-login-atmosphere" aria-hidden="true">
        <div className="admin-login-easter-zone">
          <div className="admin-login-easter">
            <Image
              src={EASTER_EGG_SRC}
              alt=""
              fill
              sizes="(max-width: 1024px) 38vw, 28rem"
              className="admin-login-easter-img"
              priority={false}
            />
          </div>
          <div className="admin-login-glints">
            <span className="admin-login-glint admin-login-glint--a" />
            <span className="admin-login-glint admin-login-glint--b" />
            <span className="admin-login-glint admin-login-glint--c" />
          </div>
        </div>
        <div className="admin-login-vignette" />
      </div>

      <div className="admin-login-stage">
        <div className="admin-login-card">
          <div className="admin-login-brand">
            <Image
              src={LOGO_SRC}
              alt="AutoDV8ions"
              width={128}
              height={128}
              className="admin-login-logo"
              priority
            />

            <h1 className="admin-login-title">Sign in</h1>
          </div>

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="admin-login-field">
              <label className="admin-login-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="admin-login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="admin-login-field">
              <label className="admin-login-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="admin-login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error ? <p className="admin-login-error">{error}</p> : null}
            <button
              type="submit"
              className="admin-login-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
