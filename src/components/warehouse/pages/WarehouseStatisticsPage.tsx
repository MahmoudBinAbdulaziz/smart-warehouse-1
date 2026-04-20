"use client";

import { useEffect, useState } from "react";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";
import { StatsHorizontalBars, type StatsBarDatum } from "@/components/warehouse/StatsHorizontalBars";

type StatsPayload = {
  summary: {
    productCount: number;
    locationCount: number;
    stockLineCount: number;
    totalUnits: number;
    criticalProducts: number;
    zeroStockProducts: number;
    expiringSoonProducts: number;
    expiredProducts: number;
    withdrawEventsLookbackDays: number;
    activityLookbackDays: number;
  };
  stockByLocation: Array<{ locationId: string; locationName: string; units: number }>;
  auditLast30Days: Array<{ action: string; count: number }>;
  recentAudits: Array<{ id: string; at: string; action: string; userEmail: string; details: unknown }>;
  topProductsByUnits: Array<{ productId: string; name: string; sku: string; units: number }>;
  topProductsByWithdrawal: Array<{ productId: string; name: string; sku: string; withdrawnUnits: number }>;
  topUsersByActivity: Array<{ userId: string; email: string; actionCount: number }>;
  expiryAlerts: Array<{
    productId: string;
    name: string;
    sku: string;
    expiresAt: string;
    daysLeft: number;
    alertDaysBefore: number;
    kind: "soon" | "expired";
  }>;
};

export function WarehouseStatisticsPage() {
  const { warehouseId } = useWarehouseSession();
  const [data, setData] = useState<StatsPayload | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    void (async () => {
      setErr("");
      try {
        const res = await fetch(`/api/warehouse/stats?warehouseId=${encodeURIComponent(warehouseId)}`, {
          credentials: "include",
          cache: "no-store"
        });
        const j = (await res.json()) as StatsPayload & { error?: string };
        if (!res.ok) {
          if (!cancelled) setErr(j.error || "تعذر التحميل");
          return;
        }
        if (!cancelled) setData(j);
      } catch {
        if (!cancelled) setErr("خطأ في الشبكة");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  if (!warehouseId) {
    return <p className="text-slate-500">اختر مستودعًا من الأعلى.</p>;
  }
  if (err) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">{err}</p>;
  }
  if (!data) {
    return <p className="text-slate-500">جاري تحميل الإحصائيات…</p>;
  }

  const withdrawalBars: StatsBarDatum[] = data.topProductsByWithdrawal.map((row) => ({
    id: row.productId,
    label: row.name,
    sublabel: row.sku,
    value: row.withdrawnUnits
  }));

  const staffBars: StatsBarDatum[] = data.topUsersByActivity.map((row) => ({
    id: row.userId,
    label: row.email,
    value: row.actionCount
  }));

  const unitsBars: StatsBarDatum[] = data.topProductsByUnits.map((row) => ({
    id: row.productId,
    label: row.name,
    sublabel: row.sku,
    value: row.units
  }));

  const locationBars: StatsBarDatum[] = [...data.stockByLocation]
    .sort((a, b) => b.units - a.units)
    .map((row) => ({
      id: row.locationId,
      label: row.locationName,
      value: row.units
    }));

  return (
    <div className="space-y-8">
      <section className="wh-card p-6">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">إحصائيات المستودع</h1>
        <p className="text-sm text-slate-500">
          ملخص المخزون، السحوبات خلال آخر {data.summary.withdrawEventsLookbackDays} يومًا، ونشاط الموظفين خلال آخر{" "}
          {data.summary.activityLookbackDays} يومًا (من سجل العمليات).
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="wh-card-muted rounded-2xl p-5">
          <p className="text-sm text-slate-600">المنتجات</p>
          <p className="text-3xl font-extrabold text-violet-800">{data.summary.productCount}</p>
        </div>
        <div className="wh-card-muted rounded-2xl p-5">
          <p className="text-sm text-slate-600">الأماكن</p>
          <p className="text-3xl font-extrabold text-teal-800">{data.summary.locationCount}</p>
        </div>
        <div className="wh-card-muted rounded-2xl p-5">
          <p className="text-sm text-slate-600">إجمالي الوحدات في المخزون</p>
          <p className="text-3xl font-extrabold text-slate-900">{data.summary.totalUnits}</p>
        </div>
        <div className="wh-card-muted rounded-2xl p-5">
          <p className="text-sm text-slate-600">أسطر المخزون (منتج–مكان)</p>
          <p className="text-3xl font-extrabold text-slate-800">{data.summary.stockLineCount}</p>
        </div>
        <div className="wh-card-muted rounded-2xl p-5">
          <p className="text-sm text-slate-600">منتجات عند أو تحت الحد الحرج</p>
          <p className="text-3xl font-extrabold text-rose-700">{data.summary.criticalProducts}</p>
        </div>
        <div className="wh-card-muted rounded-2xl p-5">
          <p className="text-sm text-slate-600">منتجات بكمية صفر</p>
          <p className="text-3xl font-extrabold text-amber-800">{data.summary.zeroStockProducts}</p>
        </div>
        <div className="wh-card-muted rounded-2xl p-5">
          <p className="text-sm text-slate-600">تنبيه انتهاء صلاحية (قريب)</p>
          <p className="text-3xl font-extrabold text-orange-700">{data.summary.expiringSoonProducts}</p>
        </div>
        <div className="wh-card-muted rounded-2xl p-5">
          <p className="text-sm text-slate-600">منتهية الصلاحية</p>
          <p className="text-3xl font-extrabold text-red-800">{data.summary.expiredProducts}</p>
        </div>
      </section>

      <section className="wh-card p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-900">أكثر المنتجات سحبًا</h2>
        <p className="mb-4 text-sm text-slate-500">
          مجموع الوحدات المسجّلة في سجل السحب خلال آخر {data.summary.withdrawEventsLookbackDays} يومًا (حسب عمليات withdrawStock).
        </p>
        <StatsHorizontalBars
          items={withdrawalBars}
          valueSuffix="وحدة مسحوبة"
          barClass="bg-gradient-to-l from-amber-600 to-amber-400"
          emptyHint="لا توجد عمليات سحب مسجّلة في هذه الفترة."
        />
      </section>

      <section className="wh-card p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-900">أكثر الموظفين نشاطًا</h2>
        <p className="mb-4 text-sm text-slate-500">عدد سجلات العمليات (كل الأنواع) لكل مستخدم خلال آخر {data.summary.activityLookbackDays} يومًا.</p>
        <StatsHorizontalBars
          items={staffBars}
          valueSuffix="عملية"
          barClass="bg-gradient-to-l from-cyan-600 to-teal-400"
          emptyHint="لا يوجد نشاط مسجّل بأسماء مستخدمين في هذه الفترة."
        />
      </section>

      <section className="wh-card p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-900">أكثر المنتجات كميةً في المخزون</h2>
        <p className="mb-4 text-sm text-slate-500">عرض بياني مقارن بالكمية الحالية.</p>
        <StatsHorizontalBars
          items={unitsBars}
          valueSuffix="وحدة"
          barClass="bg-gradient-to-l from-violet-600 to-violet-400"
          emptyHint="لا توجد منتجات."
        />
      </section>

      <section className="wh-card p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-900">الوحدات حسب المكان (رسم)</h2>
        <p className="mb-4 text-sm text-slate-500">توزيع المخزون على الأماكن.</p>
        <StatsHorizontalBars
          items={locationBars}
          valueSuffix="وحدة"
          barClass="bg-gradient-to-l from-slate-600 to-slate-400"
          emptyHint="لا توجد أماكن."
        />
      </section>

      <section className="wh-card p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">الوحدات حسب المكان (جدول)</h2>
        <div className="wh-table-wrap overflow-x-auto">
          <table className="wh-table min-w-[400px]">
            <thead>
              <tr>
                <th>المكان</th>
                <th>الوحدات</th>
              </tr>
            </thead>
            <tbody>
              {data.stockByLocation.map((row) => (
                <tr key={row.locationId}>
                  <td>{row.locationName}</td>
                  <td className="font-semibold tabular-nums">{row.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="wh-card p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-900">تنبيهات انتهاء الصلاحية</h2>
        <p className="mb-4 text-sm text-slate-500">
          عند تعيين تاريخ انتهاء للمنتج و«أيام التنبيه قبل الانتهاء» (مثل الحد الحرج للكمية)، تظهر المنتجات هنا عند دخولها نافذة
          التنبيه أو بعد انتهائها.
        </p>
        {data.expiryAlerts.length === 0 ? (
          <p className="text-sm text-slate-500">لا توجد منتجات ضمن نافذة التنبيه أو منتهية حاليًا.</p>
        ) : (
          <div className="wh-table-wrap overflow-x-auto">
            <table className="wh-table min-w-[560px] text-sm">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>SKU</th>
                  <th>ينتهي</th>
                  <th>أيام متبقية</th>
                  <th>نافذة التنبيه (يوم)</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.expiryAlerts.map((row) => (
                  <tr key={`${row.productId}-${row.kind}`}>
                    <td className="font-medium">{row.name}</td>
                    <td className="font-mono text-xs">{row.sku}</td>
                    <td className="tabular-nums">{new Date(row.expiresAt).toLocaleDateString("ar-SA")}</td>
                    <td className="tabular-nums">{row.daysLeft}</td>
                    <td className="tabular-nums">{row.alertDaysBefore}</td>
                    <td>
                      <span
                        className={`wh-badge ${
                          row.kind === "expired"
                            ? "bg-red-100 text-red-900 ring-1 ring-red-200"
                            : "bg-orange-100 text-orange-900 ring-1 ring-orange-200"
                        }`}
                      >
                        {row.kind === "expired" ? "منتهٍ" : "قريب الانتهاء"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="wh-card p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">العمليات المسجّلة (30 يومًا)</h2>
        <div className="flex flex-wrap gap-2">
          {data.auditLast30Days.length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد عمليات مسجّلة بعد.</p>
          ) : (
            data.auditLast30Days.map((a) => (
              <span key={a.action} className="wh-badge bg-slate-100 text-slate-800 ring-1 ring-slate-200">
                {a.action}: {a.count}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="wh-card p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">آخر العمليات</h2>
        <ul className="space-y-2 text-sm">
          {data.recentAudits.map((a) => (
            <li key={a.id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
              <span className="font-medium text-slate-800">{a.action}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-slate-600">{a.userEmail}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-xs text-slate-500">{new Date(a.at).toLocaleString("ar-SA")}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
