"use client";

import type { Dispatch, SetStateAction } from "react";
import { ScannerView } from "@/components/warehouse/ScannerView";

export type AddProductFormState = {
  barcode: string;
  name: string;
  sku: string;
  criticalQty: string;
  qty: string;
  locationQr: string;
};

type Props = {
  formData: AddProductFormState;
  setFormData: Dispatch<SetStateAction<AddProductFormState>>;
  scanMessage: string;
  showScanner: boolean;
  onStartProductBarcodeScan: () => void;
  onStartLocationQrScan: () => void;
  onStopScan: () => void;
  onSave: () => void;
};

export function AddProductTab({
  formData,
  setFormData,
  scanMessage,
  showScanner,
  onStartProductBarcodeScan,
  onStartLocationQrScan,
  onStopScan,
  onSave
}: Props) {
  return (
    <section className="wh-card p-6 md:p-7">
      <div className="mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900">إضافة منتج (يدوي / سكان)</h2>
        <p className="mt-1 text-sm text-slate-500">املأ الحقول أو استخدم السكان لتسريع الإدخال</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onStartProductBarcodeScan} className="wh-btn-primary">
          سكان باركود المنتج
        </button>
        <button type="button" onClick={onStartLocationQrScan} className="wh-btn-teal">
          سكان QR للمكان
        </button>
      </div>

      {showScanner ? <ScannerView title="امسح الكود الآن — اجعل الإضاءة قوية" onStop={onStopScan} /> : null}

      {scanMessage ? (
        <p className="mb-5 rounded-xl border border-emerald-200/80 bg-emerald-50/95 px-4 py-3 text-sm font-medium text-emerald-900">
          {scanMessage}
        </p>
      ) : null}

      <form className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="wh-label">Barcode المنتج</label>
          <input
            placeholder="Barcode المنتج"
            value={formData.barcode}
            onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
            className="wh-input"
          />
        </div>
        <div>
          <label className="wh-label">اسم المنتج</label>
          <input
            placeholder="اسم المنتج"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="wh-input"
          />
        </div>
        <div>
          <label className="wh-label">SKU</label>
          <input
            placeholder="SKU"
            value={formData.sku}
            onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
            className="wh-input"
          />
        </div>
        <div>
          <label className="wh-label">الحد الحرج</label>
          <input
            placeholder="الحد الحرج"
            value={formData.criticalQty}
            onChange={(e) => setFormData((prev) => ({ ...prev, criticalQty: e.target.value }))}
            className="wh-input"
          />
        </div>
        <div>
          <label className="wh-label">الكمية الحالية</label>
          <input
            placeholder="الكمية الحالية"
            value={formData.qty}
            onChange={(e) => setFormData((prev) => ({ ...prev, qty: e.target.value }))}
            className="wh-input"
          />
        </div>
        <div>
          <label className="wh-label">QR المكان</label>
          <input
            placeholder="QR المكان"
            value={formData.locationQr}
            onChange={(e) => setFormData((prev) => ({ ...prev, locationQr: e.target.value }))}
            className="wh-input"
          />
        </div>
        <button type="button" onClick={onSave} className="wh-btn-dark col-span-full py-3.5">
          حفظ المنتج
        </button>
      </form>
    </section>
  );
}
