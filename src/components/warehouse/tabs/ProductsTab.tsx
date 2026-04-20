"use client";

import type { ProductSummary } from "@/lib/warehouse-types";
import { useLocale } from "@/contexts/LocaleContext";

type Props = {
  summaries: ProductSummary[];
  onEditProductId: (id: string) => void;
  canWrite?: boolean;
};

export function ProductsTab({ summaries, onEditProductId, canWrite = true }: Props) {
  const { t } = useLocale();
  return (
    <section className="wh-card p-6 md:p-7">
      <div className="mb-6 flex flex-col gap-1 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900">{t("productsTab_title")}</h2>
        <p className="text-sm text-slate-500">{t("productsTab_subtitle")}</p>
      </div>
      <div className="wh-table-wrap overflow-x-auto">
        <table className="wh-table min-w-[640px]">
          <thead>
            <tr>
              <th>{t("productsTab_name")}</th>
              <th>{t("productsTab_sku")}</th>
              <th>{t("productsTab_barcode")}</th>
              <th>{t("productsTab_qty")}</th>
              <th>{t("productsTab_status")}</th>
              <th className="w-28">{t("productsTab_actions")}</th>
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
                  <div className="flex flex-wrap gap-1">
                    <span
                      className={`wh-badge ${
                        p.status === "critical"
                          ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200/70"
                          : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/70"
                      }`}
                    >
                      {p.status === "critical" ? t("productsTab_stock_critical") : t("productsTab_stock_ok")}
                    </span>
                    {p.expiryStatus === "expired" ? (
                      <span className="wh-badge bg-red-100 text-red-900 ring-1 ring-red-200/70">{t("productsTab_exp_expired")}</span>
                    ) : p.expiryStatus === "soon" ? (
                      <span className="wh-badge bg-orange-100 text-orange-900 ring-1 ring-orange-200/70">
                        {t("productsTab_exp_soon", { days: p.daysToExpiry ?? 0 })}
                      </span>
                    ) : null}
                  </div>
                </td>
                {canWrite ? (
                  <td>
                    <button type="button" onClick={() => onEditProductId(p.id)} className="wh-btn-primary !px-4 !py-2 text-xs">
                      {t("productsTab_edit")}
                    </button>
                  </td>
                ) : (
                  <td className="text-xs text-slate-400">{t("productsTab_readonly")}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
