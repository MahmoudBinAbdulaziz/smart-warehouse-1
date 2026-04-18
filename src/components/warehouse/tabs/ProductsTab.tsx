"use client";

import type { ProductSummary } from "@/lib/warehouse-types";

type Props = {
  summaries: ProductSummary[];
  onEditProductId: (id: string) => void;
};

export function ProductsTab({ summaries, onEditProductId }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold">كل المنتجات</h2>
      <table className="w-full overflow-hidden rounded-xl border border-slate-200 text-sm">
        <thead>
          <tr className="bg-slate-50 text-right text-slate-600">
            <th className="border p-2">الاسم</th>
            <th className="border p-2">SKU</th>
            <th className="border p-2">Barcode</th>
            <th className="border p-2">الكمية</th>
            <th className="border p-2">الحالة</th>
            <th className="border p-2">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((p) => (
            <tr key={p.id}>
              <td className="border p-2">{p.name}</td>
              <td className="border p-2">{p.sku}</td>
              <td className="border p-2">{p.barcode}</td>
              <td className="border p-2">{p.totalQty}</td>
              <td className="border p-2">{p.status === "critical" ? "حرج" : "طبيعي"}</td>
              <td className="border p-2">
                <button
                  type="button"
                  onClick={() => onEditProductId(p.id)}
                  className="rounded-lg bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
                >
                  تعديل
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
