"use client";

import { useState } from "react";
import type { Product } from "@/lib/warehouse-types";

type Props = {
  product: Product;
  onClose: () => void;
  onSave: (updated: Product) => void;
};

export function EditProductModal({ product, onClose, onSave }: Props) {
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [barcode, setBarcode] = useState(product.barcode);
  const [criticalQty, setCriticalQty] = useState(String(product.criticalQty));
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold">تعديل المنتج</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المنتج" className="rounded-xl border border-slate-200 p-3" />
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="rounded-xl border border-slate-200 p-3" />
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode" className="rounded-xl border border-slate-200 p-3" />
          <input
            value={criticalQty}
            onChange={(e) => setCriticalQty(e.target.value)}
            placeholder="الحد الحرج"
            type="number"
            min={0}
            className="rounded-xl border border-slate-200 p-3"
          />
        </div>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!name.trim() || !sku.trim() || !barcode.trim() || !criticalQty.trim()) {
                setError("يرجى تعبئة كل الحقول.");
                return;
              }
              const qty = Number(criticalQty);
              if (Number.isNaN(qty) || qty < 0) {
                setError("الحد الحرج غير صالح.");
                return;
              }
              onSave({ ...product, name: name.trim(), sku: sku.trim(), barcode: barcode.trim(), criticalQty: Math.floor(qty) });
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            حفظ
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
