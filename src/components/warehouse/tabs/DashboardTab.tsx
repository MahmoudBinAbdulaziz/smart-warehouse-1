"use client";

import type { ProductSummary } from "@/lib/warehouse-types";
import { Pagination } from "@/components/warehouse/Pagination";
import { ScannerView } from "@/components/warehouse/ScannerView";
import { useLocale } from "@/contexts/LocaleContext";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  scanMessage: string;
  showScanner: boolean;
  onStartSearchScan: () => void;
  onStopScan: () => void;
  paginated: ProductSummary[];
  page: number;
  maxPage: number;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function DashboardTab({
  search,
  onSearchChange,
  scanMessage,
  showScanner,
  onStartSearchScan,
  onStopScan,
  paginated,
  page,
  maxPage,
  onPrevPage,
  onNextPage
}: Props) {
  const { t } = useLocale();
  return (
    <section className="wh-card space-y-5 p-6 md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="min-w-0 flex-1">
          <label className="wh-label">{t("dashboardTab_quick_search")}</label>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("dashboardTab_search_placeholder")}
            className="wh-input"
          />
        </div>
        <button type="button" onClick={onStartSearchScan} className="wh-btn-primary shrink-0 md:min-w-[200px]">
          {t("dashboardTab_scan_camera")}
        </button>
      </div>

      {scanMessage ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900">{scanMessage}</p>
      ) : null}
      {showScanner ? <ScannerView title={t("dashboardTab_scanner_title")} onStop={onStopScan} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {paginated.map((item) => (
          <article
            key={item.id}
            className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/90 p-5 shadow-sm ring-1 ring-slate-100/80 transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
              <span
                className={`wh-badge shrink-0 ${
                  item.status === "critical"
                    ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200/60"
                    : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/60"
                }`}
              >
                {item.status === "critical" ? t("dashboardTab_critical") : t("dashboardTab_ok")}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              <span className="font-medium text-slate-700">{t("dashboardTab_sku")}</span> {item.sku}
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-medium text-slate-700">{t("dashboardTab_barcode")}</span> {item.barcode}
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-medium text-slate-700">{t("dashboardTab_total")}</span> {item.totalQty}
            </p>
            <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-700">
              {item.locations.map((loc) => (
                <li
                  key={`${item.id}-${loc.locationName}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50/80 px-3 py-2 ring-1 ring-slate-100/80"
                >
                  <span className="text-slate-600">{loc.locationName}</span>
                  <span className="font-semibold tabular-nums text-violet-700">{loc.qty}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <Pagination page={page} maxPage={maxPage} onPrev={onPrevPage} onNext={onNextPage} />
    </section>
  );
}
