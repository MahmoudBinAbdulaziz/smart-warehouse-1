"use client";

import type { ProductSummary } from "@/lib/warehouse-types";
import { Pagination } from "@/components/warehouse/Pagination";
import { ScannerView } from "@/components/warehouse/ScannerView";

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
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ابحث بـ SKU أو Barcode أو اسم المنتج"
          className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 outline-none transition focus:border-indigo-300 focus:bg-white"
        />
        <button
          type="button"
          onClick={onStartSearchScan}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
        >
          سكان بالكاميرا للبحث
        </button>
      </div>

      {scanMessage ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{scanMessage}</p> : null}
      {showScanner ? <ScannerView title="الكاميرا تعمل الآن - ضع الباركود داخل الإطار" onStop={onStopScan} /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {paginated.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{item.name}</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  item.status === "critical" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {item.status === "critical" ? "حرج" : "طبيعي"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              SKU: {item.sku} | Barcode: {item.barcode} | الكمية الإجمالية: {item.totalQty}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {item.locations.map((loc) => (
                <li key={`${item.id}-${loc.locationName}`}>- {loc.locationName}: {loc.qty}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <Pagination page={page} maxPage={maxPage} onPrev={onPrevPage} onNext={onNextPage} />
    </section>
  );
}
