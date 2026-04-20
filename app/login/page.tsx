"use client";

import { useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";

export default function LoginPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setMsg(data.message || data.error || t("login_err_generic"));
        return;
      }
      window.location.href = "/";
    } catch {
      setMsg(t("login_err_network"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="wh-card p-8 shadow-soft-lg">
        <h1 className="mb-1 text-2xl font-extrabold text-slate-900">{t("login_title")}</h1>
        <p className="mb-6 text-sm text-slate-500">{t("login_subtitle")}</p>
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          <div>
            <label className="wh-label">{t("login_email")}</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="wh-input"
              required
            />
          </div>
          <div>
            <label className="wh-label">{t("login_password")}</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="wh-input"
              required
            />
          </div>
          {msg ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{msg}</p> : null}
          <button type="submit" disabled={loading} className="wh-btn-primary w-full py-3.5 disabled:opacity-60">
            {loading ? t("login_loading") : t("login_submit")}
          </button>
        </form>
      </div>
    </main>
  );
}
