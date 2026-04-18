"use client";

import type { Location, Product, StockEntry } from "@/lib/warehouse-types";

type Props = {
  locations: Location[];
  stock: StockEntry[];
  products: Product[];
  onEditLocation: (loc: Location) => void;
};

export function LocationsTab({ locations, stock, products, onEditLocation }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold">الأماكن وما تحتويه</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {locations.map((loc) => {
          const stocks = stock.filter((s) => s.locationId === loc.id);
          return (
            <article key={loc.id} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{loc.name}</h3>
                <button
                  type="button"
                  onClick={() => onEditLocation(loc)}
                  className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700"
                >
                  تعديل
                </button>
              </div>
              <p className="mb-3 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">QR: {loc.qrCode}</p>
              <ul className="space-y-1 text-sm text-slate-700">
                {stocks.map((s) => {
                  const p = products.find((x) => x.id === s.productId);
                  return <li key={`${loc.id}-${s.productId}`}>- {p?.name}: {s.qty}</li>;
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
