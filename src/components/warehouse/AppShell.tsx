"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";
import { useLocale } from "@/contexts/LocaleContext";
import { WAREHOUSE_NAV, ADMIN_NAV_ITEM } from "@/lib/warehouse-nav";
import type { MessageKey } from "@/i18n/messages";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me, warehouseId, setWarehouseId, canAccessPage } = useWarehouseSession();
  const { locale, setLocale, t } = useLocale();

  const navItems = WAREHOUSE_NAV.filter((item) => canAccessPage(item.pageKey));
  const showAdmin = me.user.systemRole === "ADMIN";

  const roleKey = (role: string): MessageKey | null => {
    if (role === "VIEWER") return "role_VIEWER";
    if (role === "OPERATOR") return "role_OPERATOR";
    if (role === "MANAGER") return "role_MANAGER";
    return null;
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/90 bg-white/90 p-4 shadow-soft backdrop-blur-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <span className="font-semibold">{me.user.email}</span>
            {showAdmin ? (
              <span className="wh-badge bg-violet-100 text-violet-800 ring-1 ring-violet-200/70">{t("shell_system_admin")}</span>
            ) : null}
            {warehouseId ? (
              <span className="wh-badge bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
                {t("shell_role_prefix")}{" "}
                {(() => {
                  const r = me.warehouses.find((w) => w.id === warehouseId)?.role ?? "";
                  const k = roleKey(r);
                  return k ? t(k) : "—";
                })()}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1">
              <button
                type="button"
                onClick={() => setLocale("ar")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  locale === "ar" ? "bg-white text-violet-800 shadow-sm ring-1 ring-violet-200" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("lang_ar")}
              </button>
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  locale === "en" ? "bg-white text-violet-800 shadow-sm ring-1 ring-violet-200" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("lang_en")}
              </button>
            </div>
            {me.warehouses.length > 0 ? (
              <label className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">{t("shell_warehouse")}</span>
                <select
                  className="wh-input !min-w-[200px] !py-2 !text-sm"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                >
                  {me.warehouses.map((w) => {
                    const rk = roleKey(w.role);
                    return (
                      <option key={w.id} value={w.id}>
                        {w.name} — {rk ? t(rk) : w.role}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : (
              <span className="text-sm text-amber-800">{t("shell_no_warehouse")}</span>
            )}
            <button
              type="button"
              className="wh-btn-slate !py-2 !text-sm"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                window.location.href = "/login";
              }}
            >
              {t("shell_logout")}
            </button>
          </div>
        </div>

        <nav className="wh-tabs-shell mb-8 flex flex-wrap gap-1" aria-label={t("shell_nav_aria")}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href || pathname.startsWith(item.href + "/") ? "wh-tab wh-tab-active" : "wh-tab"}
            >
              {t(item.labelKey)}
            </Link>
          ))}
          {showAdmin ? (
            <Link
              href={ADMIN_NAV_ITEM.href}
              className={pathname === "/admin" || pathname.startsWith("/admin/") ? "wh-tab wh-tab-active" : "wh-tab"}
            >
              {t(ADMIN_NAV_ITEM.labelKey)}
            </Link>
          ) : null}
        </nav>

        <main className="pb-16">{children}</main>
      </div>
    </div>
  );
}
