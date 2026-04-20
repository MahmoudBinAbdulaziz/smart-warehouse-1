"use client";

import type { Product, StockEntry } from "@/lib/warehouse-types";
import { ScannerView } from "@/components/warehouse/ScannerView";
import { dateLocaleTag, useLocale, type Locale } from "@/contexts/LocaleContext";

function isWithdrawFeedbackPositive(message: string, locale: Locale) {
  if (!message) return false;
  if (locale === "ar") {
    return (
      message.startsWith("تم تحديد") ||
      message.startsWith("تم سحب") ||
      message.startsWith("تم توزيع")
    );
  }
  return (
    message.startsWith("Selected") ||
    message.startsWith("Success") ||
    message.startsWith("Allocated")
  );
}

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
  canWrite?: boolean;
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
  onConfirm,
  canWrite = true
}: Props) {
  const { locale, t } = useLocale();
  const dateTag = dateLocaleTag(locale);
  const msgPositive = isWithdrawFeedbackPositive(withdrawMsg, locale);

  return (
    <section className="wh-card space-y-5 p-6 md:p-7">
      <div className="border-b border-slate-100 pb-5">
        <h2 className="text-xl font-bold text-slate-900">{t("withdraw_tab_title")}</h2>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500">{t("withdraw_tab_subtitle")}</p>
        {!canWrite ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
            {t("withdraw_tab_readonly")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="min-w-0 flex-1">
          <label className="wh-label">{t("withdraw_tab_label_query")}</label>
          <input
            value={withdrawSearch}
            onChange={(e) => onWithdrawSearchChange(e.target.value)}
            placeholder={t("withdraw_tab_placeholder_query")}
            className="wh-input"
          />
        </div>
        <button type="button" onClick={onLookup} className="wh-btn-dark shrink-0 md:min-w-[120px]">
          {t("withdraw_tab_search")}
        </button>
        <button type="button" onClick={onStartWithdrawScan} className="wh-btn-primary shrink-0 md:min-w-[160px]">
          {t("withdraw_tab_scan")}
        </button>
      </div>

      {showScanner ? <ScannerView title={t("withdraw_tab_scanner_title")} onStop={onStopScan} /> : null}

      {withdrawMsg ? (
        <p
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            msgPositive
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
                <span className="font-medium text-slate-700">{t("withdraw_tab_sku")}</span> {withdrawProduct.sku}
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-medium text-slate-700">{t("withdraw_tab_barcode")}</span> {withdrawProduct.barcode}
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-medium text-slate-700">{t("withdraw_tab_label_critical")}</span>{" "}
                {withdrawProduct.criticalQty}
                {withdrawProduct.expiresAt ? (
                  <>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="font-medium text-slate-700">{t("withdraw_tab_label_expiry")}</span>{" "}
                    {new Date(withdrawProduct.expiresAt).toLocaleDateString(dateTag)}
                  </>
                ) : null}
              </p>
            </div>
            <span className="wh-badge shrink-0 bg-white/95 font-semibold text-violet-800 shadow-sm ring-1 ring-violet-200/70">
              {t("withdraw_tab_available_total", { n: withdrawTotalAvailable })}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="wh-label">{t("withdraw_tab_needed_qty")}</label>
              <input
                type="number"
                min={0}
                value={withdrawNeeded}
                onChange={(e) => onWithdrawNeededChange(e.target.value)}
                placeholder="0"
                disabled={!canWrite}
                className="wh-input disabled:opacity-60"
              />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                onClick={onAutoFill}
                disabled={!canWrite}
                className="wh-btn-teal w-full md:w-auto disabled:opacity-50"
              >
                {t("withdraw_tab_autofill")}
              </button>
            </div>
          </div>

          {withdrawNeededNum > 0 && withdrawDeficit > 0 ? (
            <div className="rounded-xl border border-rose-200/90 bg-rose-50/90 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-100/80">
              {t("withdraw_tab_alert_deficit", {
                need: withdrawNeededNum,
                avail: withdrawTotalAvailable,
                deficit: withdrawDeficit
              })}
            </div>
          ) : null}

          {withdrawNeededNum > 0 &&
          withdrawTotalAvailable >= withdrawNeededNum &&
          withdrawSumAllocated > 0 &&
          withdrawSumAllocated < withdrawNeededNum ? (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-100/80">
              {t("withdraw_tab_warn_partial", { alloc: withdrawSumAllocated, need: withdrawNeededNum })}
            </div>
          ) : null}

          <div className="wh-table-wrap">
            <table className="wh-table min-w-[520px]">
              <thead>
                <tr>
                  <th>{t("withdraw_tab_th_location")}</th>
                  <th>{t("withdraw_tab_th_available")}</th>
                  <th>{t("withdraw_tab_th_withdraw")}</th>
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
                        disabled={!canWrite}
                        className="wh-input !py-2 !text-sm md:max-w-[120px] disabled:opacity-60"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {withdrawStockEntries.length === 0 ? (
            <p className="text-sm text-slate-500">{t("withdraw_tab_no_stock_hint")}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-violet-100/80 pt-5">
            <p className="text-sm text-slate-700">
              {t("withdraw_tab_sum_label")} <strong className="text-violet-800">{withdrawSumAllocated}</strong>
              {withdrawNeededNum > 0 ? (
                <>
                  {" "}
                  | {t("withdraw_tab_needed_label")}{" "}
                  <strong className="text-slate-900">{withdrawNeededNum}</strong>
                </>
              ) : null}
            </p>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canWrite}
              className="wh-btn-success min-w-[200px] disabled:opacity-50"
            >
              {t("withdraw_tab_confirm")}
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
          {t("withdraw_tab_empty_hint")}
        </p>
      )}
    </section>
  );
}
