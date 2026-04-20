"use client";

import type { Location, Product, StockEntry } from "@/lib/warehouse-types";

type Props = {
  locations: Location[];
  stock: StockEntry[];
  products: Product[];
  onEditLocation: (loc: Location) => void;
  canWrite?: boolean;
};

export function LocationsTab({ locations, stock, products, onEditLocation, canWrite = true }: Props) {
  return (
    <section className="wh-card p-6 md:p-7">
      <div className="mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900">الأماكن والمخزون</h2>
        <p className="mt-1 text-sm text-slate-500">كل موقع مع المنتجات المخزّنة فيه</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {locations.map((loc) => {
          const stocks = stock.filter((s) => s.locationId === loc.id);
          return (
            <article
              key={loc.id}
              className="group flex flex-col rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50/90 p-5 shadow-sm ring-1 ring-slate-100/80 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900">{loc.name}</h3>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => onEditLocation(loc)}
                    className="wh-btn-slate !px-3 !py-1.5 text-xs font-semibold"
                  >
                    تعديل
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">عرض فقط</span>
                )}
              </div>
              <p className="mb-4 inline-flex w-fit rounded-full bg-violet-100/90 px-3 py-1 text-xs font-semibold text-violet-800 ring-1 ring-violet-200/60">
                QR: {loc.qrCode}
              </p>
              <ul className="mt-auto space-y-2 border-t border-slate-100 pt-4">
                {stocks.length === 0 ? (
                  <li className="text-sm text-slate-400">لا توجد أصناف في هذا المكان</li>
                ) : (
                  stocks.map((s) => {
                    const p = products.find((x) => x.id === s.productId);
                    return (
                      <li
                        key={`${loc.id}-${s.productId}`}
                        className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-sm ring-1 ring-slate-100/90"
                      >
                        <span className="text-slate-700">{p?.name ?? "—"}</span>
                        <span className="font-semibold tabular-nums text-teal-700">{s.qty}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
