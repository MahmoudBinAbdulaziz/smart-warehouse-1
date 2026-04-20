"use client";

import { useState } from "react";
import type { Product } from "@/lib/warehouse-types";
import { formatExpiryInputFromDb } from "@/lib/product-expiry";

type Props = {
  product: Product;
  onClose: () => void;
  onSave: (updated: Product) => void;
  canWrite?: boolean;
};

export function EditProductModal({ product, onClose, onSave, canWrite = true }: Props) {
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [barcode, setBarcode] = useState(product.barcode);
  const [criticalQty, setCriticalQty] = useState(String(product.criticalQty));
  const [expiresAt, setExpiresAt] = useState(
    product.expiresAt ? formatExpiryInputFromDb(new Date(product.expiresAt)) : ""
  );
  const [expiryAlertDaysBefore, setExpiryAlertDaysBefore] = useState(String(product.expiryAlertDaysBefore));
  const [error, setError] = useState("");

  return (
    <div className="wh-modal" role="dialog" aria-modal="true" aria-labelledby="edit-product-title">
      <div className="wh-modal-panel max-h-[90vh] overflow-y-auto">
        <h3 id="edit-product-title" className="mb-1 text-lg font-bold text-slate-900">
          تعديل المنتج
        </h3>
        <p className="mb-5 text-sm text-slate-500">تحديث البيانات الأساسية للمنتج وتاريخ الصلاحية (اختياري).</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="wh-label">اسم المنتج</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم المنتج"
              disabled={!canWrite}
              className="wh-input disabled:opacity-60"
            />
          </div>
          <div>
            <label className="wh-label">SKU</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU"
              disabled={!canWrite}
              className="wh-input disabled:opacity-60"
            />
          </div>
          <div>
            <label className="wh-label">Barcode</label>
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Barcode"
              disabled={!canWrite}
              className="wh-input disabled:opacity-60"
            />
          </div>
          <div>
            <label className="wh-label">الحد الحرج</label>
            <input
              value={criticalQty}
              onChange={(e) => setCriticalQty(e.target.value)}
              placeholder="الحد الحرج"
              type="number"
              min={0}
              disabled={!canWrite}
              className="wh-input disabled:opacity-60"
            />
          </div>
          <div>
            <label className="wh-label">انتهاء الصلاحية (اختياري)</label>
            <input
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              type="date"
              disabled={!canWrite}
              className="wh-input disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-slate-500">اتركه فارغًا إن لم يكن للدفعة تاريخ انتهاء.</p>
          </div>
          <div>
            <label className="wh-label">تنبيه قبل الانتهاء (أيام)</label>
            <input
              value={expiryAlertDaysBefore}
              onChange={(e) => setExpiryAlertDaysBefore(e.target.value)}
              type="number"
              min={0}
              disabled={!canWrite}
              className="wh-input disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-slate-500">مثل نافذة التنبيه للحد الحرج: يُنبَّه عندما تبقى أيام أقل أو تساوي هذا الرقم قبل تاريخ الانتهاء.</p>
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
              const ad = Number(expiryAlertDaysBefore);
              if (Number.isNaN(ad) || ad < 0) {
                setError("أيام التنبيه غير صالحة.");
                return;
              }
              onSave({
                ...product,
                name: name.trim(),
                sku: sku.trim(),
                barcode: barcode.trim(),
                criticalQty: Math.floor(qty),
                expiresAt: expiresAt.trim() || null,
                expiryAlertDaysBefore: Math.floor(ad)
              });
            }}
            disabled={!canWrite}
            className="wh-btn-primary disabled:opacity-50"
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
