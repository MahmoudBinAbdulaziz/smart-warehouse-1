"use client";

import { StatCard } from "@/components/warehouse/StatCard";
import { DashboardTab } from "@/components/warehouse/tabs/DashboardTab";
import { PageGuard } from "@/components/warehouse/PageGuard";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";
import { useLocale } from "@/contexts/LocaleContext";

export default function DashboardPage() {
  const { t } = useLocale();
  const {
    search,
    setSearch,
    scanMessage,
    scanTarget,
    setScanTarget,
    paginated,
    page,
    setPage,
    maxPage,
    criticalCount,
    totalLocations,
    totalProducts
  } = useWarehouseSession();

  return (
    <PageGuard pageKey="dashboard">
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/90 bg-gradient-to-bl from-white via-violet-50/40 to-teal-50/50 p-6 shadow-soft-lg md:p-8">
        <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-600/90">{t("dashboard_brand")}</p>
          <h1 className="mb-2 bg-gradient-to-l from-slate-900 via-violet-900 to-slate-800 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
            {t("dashboard_title")}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">{t("dashboard_subtitle")}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label={t("dashboard_stat_products")} value={totalProducts} accent="violet" />
            <StatCard label={t("dashboard_stat_locations")} value={totalLocations} accent="teal" />
            <StatCard label={t("dashboard_stat_critical")} value={criticalCount} danger />
          </div>
        </div>
      </section>

      <DashboardTab
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        scanMessage={scanMessage}
        showScanner={scanTarget === "search"}
        onStartSearchScan={() => setScanTarget("search")}
        onStopScan={() => setScanTarget(null)}
        paginated={paginated}
        page={page}
        maxPage={maxPage}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => Math.min(maxPage, p + 1))}
      />
    </PageGuard>
  );
}
