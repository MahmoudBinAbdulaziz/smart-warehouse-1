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
    <div className="wh-modal" role="dialog" aria-modal="true" aria-labelledby="edit-product-title">
      <div className="wh-modal-panel max-h-[90vh] overflow-y-auto">
        <h3 id="edit-product-title" className="mb-1 text-lg font-bold text-slate-900">
          تعديل المنتج
        </h3>
        <p className="mb-5 text-sm text-slate-500">تحديث البيانات الأساسية للمنتج</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="wh-label">اسم المنتج</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المنتج" className="wh-input" />
          </div>
          <div>
            <label className="wh-label">SKU</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="wh-input" />
          </div>
          <div>
            <label className="wh-label">Barcode</label>
            <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode" className="wh-input" />
          </div>
          <div>
            <label className="wh-label">الحد الحرج</label>
            <input
              value={criticalQty}
              onChange={(e) => setCriticalQty(e.target.value)}
              placeholder="الحد الحرج"
              type="number"
              min={0}
              className="wh-input"
            />
          </div>
        </div>
        {error ? <p className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50/95 px-4 py-2 text-sm text-rose-900">{error}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
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
            className="wh-btn-primary"
          >
            حفظ
          </button>
          <button type="button" onClick={onClose} className="wh-btn-slate">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
