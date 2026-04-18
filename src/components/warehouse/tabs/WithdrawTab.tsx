"use client";

import type { Product, StockEntry } from "@/lib/warehouse-types";
import { ScannerView } from "@/components/warehouse/ScannerView";

export type WithdrawStockRow = StockEntry & { locationName: string };

type Props = {
  withdrawSearch: string;
  onWithdrawSearchChange: (v: string) => void;
  onLookup: () => void;
  onStartWithdrawScan: () => void;
  showScanner: boolean;
  onStopScan: () => void;
  withdrawMsg: string;
  withdrawProduct: Product | null;
  withdrawNeeded: string;
  onWithdrawNeededChange: (v: string) => void;
  withdrawNeededNum: number;
  withdrawDeficit: number;
  withdrawTotalAvailable: number;
  withdrawSumAllocated: number;
  withdrawStockEntries: WithdrawStockRow[];
  withdrawAlloc: Record<string, string>;
  onAllocChange: (locationId: string, value: string) => void;
  onAutoFill: () => void;
  onConfirm: () => void;
};

export function WithdrawTab({
  withdrawSearch,
  onWithdrawSearchChange,
  onLookup,
  onStartWithdrawScan,
  showScanner,
  onStopScan,
  withdrawMsg,
  withdrawProduct,
  withdrawNeeded,
  onWithdrawNeededChange,
  withdrawNeededNum,
  withdrawDeficit,
  withdrawTotalAvailable,
  withdrawSumAllocated,
  withdrawStockEntries,
  withdrawAlloc,
  onAllocChange,
  onAutoFill,
  onConfirm
}: Props) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div>
        <h2 className="mb-1 text-xl font-semibold text-slate-900">سحب مخزون (طلب كمية)</h2>
        <p className="text-sm text-slate-600">
          ابحث بالباركود أو الـ SKU أو الاسم، أو استخدم السكان. حدد الكمية المطلوبة ثم وزّع السحب على الأماكن أو استخدم «توزيع تلقائي».
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">باركود / SKU / جزء من الاسم</label>
          <input
            value={withdrawSearch}
            onChange={(e) => onWithdrawSearchChange(e.target.value)}
            placeholder="مثال: 8901001001 أو SKU-1001"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 outline-none focus:border-indigo-300 focus:bg-white"
          />
        </div>
        <button
          type="button"
          onClick={onLookup}
          className="rounded-xl bg-slate-800 px-5 py-3 font-semibold text-white hover:bg-slate-900"
        >
          بحث
        </button>
        <button
          type="button"
          onClick={onStartWithdrawScan}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
        >
          سكان الباركود
        </button>
      </div>

      {showScanner ? <ScannerView title="امسح باركود المنتج الآن" onStop={onStopScan} /> : null}

      {withdrawMsg ? (
        <p
          className={`rounded-lg p-3 text-sm ${
            withdrawMsg.includes("تم") || withdrawMsg.includes("تحديد") ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
          }`}
        >
          {withdrawMsg}
        </p>
      ) : null}

      {withdrawProduct ? (
        <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-slate-900">{withdrawProduct.name}</p>
              <p className="text-sm text-slate-600">
                SKU: {withdrawProduct.sku} | Barcode: {withdrawProduct.barcode} | الحد الحرج: {withdrawProduct.criticalQty}
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-indigo-800 shadow-sm">
              المتوفر إجمالًا: {withdrawTotalAvailable}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">الكمية المطلوبة</label>
              <input
                type="number"
                min={0}
                value={withdrawNeeded}
                onChange={(e) => onWithdrawNeededChange(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 bg-white p-3"
              />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                onClick={onAutoFill}
                className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
              >
                توزيع تلقائي للمطلوب
              </button>
            </div>
          </div>

          {withdrawNeededNum > 0 && withdrawDeficit > 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              <strong>تنبيه:</strong> الكمية المطلوبة ({withdrawNeededNum}) أكبر من المخزون الكلي ({withdrawTotalAvailable}). العجز:{" "}
              <strong>{withdrawDeficit}</strong>. يمكنك توزيع السحب على الأماكن حتى {withdrawTotalAvailable} كحد أقصى.
            </div>
          ) : null}

          {withdrawNeededNum > 0 &&
          withdrawTotalAvailable >= withdrawNeededNum &&
          withdrawSumAllocated > 0 &&
          withdrawSumAllocated < withdrawNeededNum ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              مجموع التخصيص الحالي ({withdrawSumAllocated}) أقل من المطلوب ({withdrawNeededNum}). يمكنك التعديل أو تأكيد سحب جزئي.
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-right text-slate-700">
                  <th className="border-b p-2">المكان</th>
                  <th className="border-b p-2">المتوفر</th>
                  <th className="border-b p-2">السحب من هنا</th>
                </tr>
              </thead>
              <tbody>
                {withdrawStockEntries.map((row) => (
                  <tr key={row.locationId}>
                    <td className="border-b p-2 font-medium">{row.locationName}</td>
                    <td className="border-b p-2">{row.qty}</td>
                    <td className="border-b p-2">
                      <input
                        type="number"
                        min={0}
                        max={row.qty}
                        value={withdrawAlloc[row.locationId] ?? "0"}
                        onChange={(e) => onAllocChange(row.locationId, e.target.value)}
                        className="w-24 rounded-lg border border-slate-200 p-2"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {withdrawStockEntries.length === 0 ? (
            <p className="text-sm text-slate-600">لا يوجد مخزون لهذا المنتج في أي مكان. أضف كمية من تبويب «إضافة منتج».</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100 pt-3">
            <p className="text-sm text-slate-700">
              مجموع السحب: <strong>{withdrawSumAllocated}</strong>
              {withdrawNeededNum > 0 ? (
                <>
                  {" "}
                  | المطلوب: <strong>{withdrawNeededNum}</strong>
                </>
              ) : null}
            </p>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              تأكيد السحب وتحديث المخزون
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">ابحث عن منتج لعرض الأماكن والكميات.</p>
      )}
    </section>
  );
}
