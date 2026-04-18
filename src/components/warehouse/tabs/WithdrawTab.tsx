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
    <section className="wh-card space-y-5 p-6 md:p-7">
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-xl font-bold text-slate-900">سحب مخزون (طلب كمية)</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500">
          ابحث بالباركود أو الـ SKU أو الاسم، أو استخدم السكان. حدد الكمية المطلوبة ثم وزّع السحب على الأماكن أو استخدم «توزيع تلقائي».
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="min-w-0 flex-1">
          <label className="wh-label">باركود / SKU / جزء من الاسم</label>
          <input
            value={withdrawSearch}
            onChange={(e) => onWithdrawSearchChange(e.target.value)}
            placeholder="مثال: 8901001001 أو SKU-1001"
            className="wh-input"
          />
        </div>
        <button type="button" onClick={onLookup} className="wh-btn-dark shrink-0 md:min-w-[120px]">
          بحث
        </button>
        <button type="button" onClick={onStartWithdrawScan} className="wh-btn-primary shrink-0 md:min-w-[160px]">
          سكان الباركود
        </button>
      </div>

      {showScanner ? <ScannerView title="امسح باركود المنتج الآن" onStop={onStopScan} /> : null}

      {withdrawMsg ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            withdrawMsg.includes("تم") || withdrawMsg.includes("تحديد")
              ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-900"
              : "border-amber-200/80 bg-amber-50/95 text-amber-950"
          }`}
        >
          {withdrawMsg}
        </p>
      ) : null}

      {withdrawProduct ? (
        <div className="wh-card-muted space-y-5 rounded-2xl p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-900">{withdrawProduct.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                <span className="font-medium text-slate-700">SKU</span> {withdrawProduct.sku}
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-medium text-slate-700">Barcode</span> {withdrawProduct.barcode}
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-medium text-slate-700">الحد الحرج</span> {withdrawProduct.criticalQty}
              </p>
            </div>
            <span className="wh-badge shrink-0 bg-white/95 font-semibold text-violet-800 shadow-sm ring-1 ring-violet-200/70">
              المتوفر إجمالًا: {withdrawTotalAvailable}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="wh-label">الكمية المطلوبة</label>
              <input
                type="number"
                min={0}
                value={withdrawNeeded}
                onChange={(e) => onWithdrawNeededChange(e.target.value)}
                placeholder="0"
                className="wh-input"
              />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <button type="button" onClick={onAutoFill} className="wh-btn-teal w-full md:w-auto">
                توزيع تلقائي للمطلوب
              </button>
            </div>
          </div>

          {withdrawNeededNum > 0 && withdrawDeficit > 0 ? (
            <div className="rounded-xl border border-rose-200/90 bg-rose-50/90 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-100/80">
              <strong>تنبيه:</strong> الكمية المطلوبة ({withdrawNeededNum}) أكبر من المخزون الكلي ({withdrawTotalAvailable}). العجز:{" "}
              <strong>{withdrawDeficit}</strong>. يمكنك توزيع السحب على الأماكن حتى {withdrawTotalAvailable} كحد أقصى.
            </div>
          ) : null}

          {withdrawNeededNum > 0 &&
          withdrawTotalAvailable >= withdrawNeededNum &&
          withdrawSumAllocated > 0 &&
          withdrawSumAllocated < withdrawNeededNum ? (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100/80">
              مجموع التخصيص الحالي ({withdrawSumAllocated}) أقل من المطلوب ({withdrawNeededNum}). يمكنك التعديل أو تأكيد سحب جزئي.
            </div>
          ) : null}

          <div className="wh-table-wrap">
            <table className="wh-table min-w-[520px]">
              <thead>
                <tr>
                  <th>المكان</th>
                  <th>المتوفر</th>
                  <th>السحب من هنا</th>
                </tr>
              </thead>
              <tbody>
                {withdrawStockEntries.map((row) => (
                  <tr key={row.locationId}>
                    <td className="font-medium text-slate-900">{row.locationName}</td>
                    <td className="tabular-nums font-semibold text-slate-700">{row.qty}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={row.qty}
                        value={withdrawAlloc[row.locationId] ?? "0"}
                        onChange={(e) => onAllocChange(row.locationId, e.target.value)}
                        className="wh-input !py-2 !text-sm md:max-w-[120px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {withdrawStockEntries.length === 0 ? (
            <p className="text-sm text-slate-500">لا يوجد مخزون لهذا المنتج في أي مكان. أضف كمية من تبويب «إضافة منتج».</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-violet-100/80 pt-5">
            <p className="text-sm text-slate-700">
              مجموع السحب: <strong className="text-violet-800">{withdrawSumAllocated}</strong>
              {withdrawNeededNum > 0 ? (
                <>
                  {" "}
                  | المطلوب: <strong className="text-slate-900">{withdrawNeededNum}</strong>
                </>
              ) : null}
            </p>
            <button type="button" onClick={onConfirm} className="wh-btn-success min-w-[200px]">
              تأكيد السحب وتحديث المخزون
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
          ابحث عن منتج لعرض الأماكن والكميات.
        </p>
      )}
    </section>
  );
}
