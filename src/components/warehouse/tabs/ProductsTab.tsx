"use client";

import type { ProductSummary } from "@/lib/warehouse-types";

type Props = {
  summaries: ProductSummary[];
  onEditProductId: (id: string) => void;
};

export function ProductsTab({ summaries, onEditProductId }: Props) {
  return (
    <section className="wh-card p-6 md:p-7">
      <div className="mb-6 flex flex-col gap-1 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900">كل المنتجات</h2>
        <p className="text-sm text-slate-500">عرض شامل مع الحالة والكمية الإجمالية</p>
      </div>
      <div className="wh-table-wrap overflow-x-auto">
        <table className="wh-table min-w-[640px]">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>SKU</th>
              <th>Barcode</th>
              <th>الكمية</th>
              <th>الحالة</th>
              <th className="w-28">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-slate-900">{p.name}</td>
                <td className="font-mono text-xs text-slate-600">{p.sku}</td>
                <td className="font-mono text-xs text-slate-600">{p.barcode}</td>
                <td className="tabular-nums font-semibold text-violet-700">{p.totalQty}</td>
                <td>
                  <span
                    className={`wh-badge ${
                      p.status === "critical" ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200/70" : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/70"
                    }`}
                  >
                    {p.status === "critical" ? "حرج" : "طبيعي"}
                  </span>
                </td>
                <td>
                  <button type="button" onClick={() => onEditProductId(p.id)} className="wh-btn-primary !px-4 !py-2 text-xs">
                    تعديل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
