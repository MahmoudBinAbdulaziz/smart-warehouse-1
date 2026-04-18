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
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold">إضافة منتج (يدوي / سكان)</h2>
      <div className="mb-4 grid gap-2 md:grid-cols-2">
        <button type="button" onClick={onStartProductBarcodeScan} className="rounded-xl bg-indigo-600 p-3 font-semibold text-white hover:bg-indigo-700">
          سكان باركود المنتج
        </button>
        <button type="button" onClick={onStartLocationQrScan} className="rounded-xl bg-sky-600 p-3 font-semibold text-white hover:bg-sky-700">
          سكان QR للمكان
        </button>
      </div>
      {showScanner ? <ScannerView title="امسح الكود الآن - اجعل الإضاءة قوية" onStop={onStopScan} /> : null}
      {scanMessage ? <p className="my-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{scanMessage}</p> : null}

      <form className="grid gap-3 md:grid-cols-2">
        <input
          placeholder="Barcode المنتج"
          value={formData.barcode}
          onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
          className="rounded-xl border border-slate-200 p-3"
        />
        <input
          placeholder="اسم المنتج"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          className="rounded-xl border border-slate-200 p-3"
        />
        <input
          placeholder="SKU"
          value={formData.sku}
          onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
          className="rounded-xl border border-slate-200 p-3"
        />
        <input
          placeholder="الحد الحرج"
          value={formData.criticalQty}
          onChange={(e) => setFormData((prev) => ({ ...prev, criticalQty: e.target.value }))}
          className="rounded-xl border border-slate-200 p-3"
        />
        <input
          placeholder="الكمية الحالية"
          value={formData.qty}
          onChange={(e) => setFormData((prev) => ({ ...prev, qty: e.target.value }))}
          className="rounded-xl border border-slate-200 p-3"
        />
        <input
          placeholder="QR المكان"
          value={formData.locationQr}
          onChange={(e) => setFormData((prev) => ({ ...prev, locationQr: e.target.value }))}
          className="rounded-xl border border-slate-200 p-3"
        />
        <button type="button" onClick={onSave} className="col-span-full rounded-xl bg-slate-900 p-3 text-white">
          حفظ المنتج
        </button>
      </form>
    </section>
  );
}
