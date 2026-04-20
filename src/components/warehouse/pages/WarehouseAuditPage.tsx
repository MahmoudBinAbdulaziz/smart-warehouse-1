"use client";

import { useEffect, useState } from "react";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";

type Row = { id: string; at: string; action: string; userEmail: string; userName: string | null; details: unknown };

export function WarehouseAuditPage() {
  const { warehouseId } = useWarehouseSession();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<Row[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!warehouseId) return;
    let cancelled = false;
    void (async () => {
      setErr("");
      try {
        const res = await fetch(
          `/api/warehouse/audit-log?warehouseId=${encodeURIComponent(warehouseId)}&page=${page}`,
          { credentials: "include", cache: "no-store" }
        );
        const j = (await res.json()) as {
          items: Row[];
          totalPages: number;
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) setErr(j.error || "تعذر التحميل");
          return;
        }
        if (!cancelled) {
          setItems(j.items);
          setTotalPages(j.totalPages);
        }
      } catch {
        if (!cancelled) setErr("خطأ في الشبكة");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [warehouseId, page]);

  if (!warehouseId) {
    return <p className="text-slate-500">اختر مستودعًا من الأعلى.</p>;
  }
  if (err) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">{err}</p>;
  }

  return (
    <section className="wh-card space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">سجل العمليات</h1>
        <p className="mt-1 text-sm text-slate-500">كل تعديل أو سحب أو إضافة يُسجّل هنا مع المستخدم والوقت.</p>
      </div>
      <div className="wh-table-wrap overflow-x-auto">
        <table className="wh-table min-w-[720px]">
          <thead>
            <tr>
              <th>الوقت</th>
              <th>الإجراء</th>
              <th>المستخدم</th>
              <th>تفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap text-xs text-slate-600">{new Date(a.at).toLocaleString("ar-SA")}</td>
                <td className="font-medium">{a.action}</td>
                <td className="text-sm">{a.userEmail}</td>
                <td className="max-w-xs truncate font-mono text-xs text-slate-500">
                  {a.details ? JSON.stringify(a.details) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="wh-btn-slate !py-2"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          السابق
        </button>
        <span className="text-sm text-slate-600">
          صفحة {page} من {totalPages}
        </span>
        <button
          type="button"
          className="wh-btn-slate !py-2"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          التالي
        </button>
      </div>
    </section>
  );
}
