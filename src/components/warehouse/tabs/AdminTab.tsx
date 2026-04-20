"use client";

import { useCallback, useEffect, useState } from "react";
import { PAGE_KEYS, PAGE_LABEL_AR, type AppPageKey } from "@/lib/app-pages";

type WarehouseRow = { id: string; name: string };
type MemberRow = {
  id: string;
  role: string;
  warehouseId: string;
  warehouse: { id: string; name: string };
};
export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  systemRole: string;
  active: boolean;
  createdAt: string;
  memberships: MemberRow[];
};

type PageGrantApiRow = {
  id: string;
  userId: string;
  warehouseId: string;
  pageKey: string;
  allowed: boolean;
};

async function adminPost<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/admin", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) throw new Error(data.message || data.error || "ADMIN_FAILED");
  return data as T;
}

const ROLE_LABEL: Record<string, string> = {
  VIEWER: "عرض فقط",
  OPERATOR: "تشغيل (تعديل مخزون)",
  MANAGER: "مدير مستودع"
};

export function AdminTab({ onRefreshMe }: { onRefreshMe: () => Promise<void> }) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [newWhName, setNewWhName] = useState("");

  const [nuEmail, setNuEmail] = useState("");
  const [nuPassword, setNuPassword] = useState("");
  const [nuName, setNuName] = useState("");
  const [nuSystemRole, setNuSystemRole] = useState<"USER" | "ADMIN">("USER");
  const [nuWarehouseId, setNuWarehouseId] = useState("");
  const [nuWarehouseRole, setNuWarehouseRole] = useState<"VIEWER" | "OPERATOR" | "MANAGER">("OPERATOR");

  const [linkUserId, setLinkUserId] = useState("");
  const [linkWarehouseId, setLinkWarehouseId] = useState("");
  const [linkRole, setLinkRole] = useState<"VIEWER" | "OPERATOR" | "MANAGER">("OPERATOR");

  const [pageGrants, setPageGrants] = useState<PageGrantApiRow[]>([]);
  const [pgUserId, setPgUserId] = useState("");
  const [pgWarehouseId, setPgWarehouseId] = useState("");
  /** صفحات تُطبَّق عليها «حفظ المنح» أو «إرجاع للافتراضي» دفعة واحدة */
  const [pgSelectedPageKeys, setPgSelectedPageKeys] = useState<AppPageKey[]>([]);
  const [pgAllowed, setPgAllowed] = useState(true);

  function togglePgPageKey(k: AppPageKey) {
    setPgSelectedPageKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  const load = useCallback(async () => {
    setErr("");
    const [u, w, g] = await Promise.all([
      adminPost<{ users: AdminUserRow[] }>({ action: "listUsers" }),
      adminPost<{ warehouses: WarehouseRow[] }>({ action: "listWarehouses" }),
      adminPost<{ grants: PageGrantApiRow[] }>({ action: "listPageGrants", payload: {} })
    ]);
    setUsers(u.users);
    setWarehouses(w.warehouses);
    setPageGrants(g.grants);
  }, []);

  useEffect(() => {
    void load().catch((e: Error) => setErr(e.message));
  }, [load]);

  useEffect(() => {
    if (warehouses.length === 0) return;
    setLinkWarehouseId((prev) => prev || warehouses[0].id);
    setPgWarehouseId((prev) => prev || warehouses[0].id);
  }, [warehouses]);

  async function run(action: () => Promise<void>) {
    setMsg("");
    setErr("");
    try {
      await action();
      await load();
      await onRefreshMe();
      setMsg("تم التحديث.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "فشل الطلب");
    }
  }

  return (
    <section className="wh-card space-y-8 p-6 md:p-7">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900">إدارة النظام</h2>
        <p className="mt-1 text-sm text-slate-500">
          مستودعات متعددة، مستخدمون، وربط كل مستخدم بمستودع مع صلاحية (عرض / تشغيل / مدير مستودع).
        </p>
      </div>

      {msg ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">{msg}</p> : null}
      {err ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900">{err}</p> : null}

      <div className="wh-card-muted rounded-2xl p-5">
        <h3 className="mb-3 font-bold text-slate-900">مستودع جديد</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="wh-label">اسم المستودع</label>
            <input value={newWhName} onChange={(e) => setNewWhName(e.target.value)} className="wh-input" placeholder="مثال: مستودع الرياض" />
          </div>
          <button
            type="button"
            className="wh-btn-primary shrink-0"
            onClick={() =>
              void run(async () => {
                const name = newWhName.trim();
                if (!name) throw new Error("أدخل اسم المستودع.");
                await adminPost({ action: "createWarehouse", payload: { name } });
                setNewWhName("");
              })
            }
          >
            إنشاء
          </button>
        </div>
      </div>

      <div className="wh-card-muted rounded-2xl p-5">
        <h3 className="mb-3 font-bold text-slate-900">مستخدم جديد</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="wh-label">البريد</label>
            <input value={nuEmail} onChange={(e) => setNuEmail(e.target.value)} className="wh-input" type="email" autoComplete="off" />
          </div>
          <div>
            <label className="wh-label">كلمة المرور (6 أحرف فأكثر)</label>
            <input value={nuPassword} onChange={(e) => setNuPassword(e.target.value)} className="wh-input" type="password" autoComplete="new-password" />
          </div>
          <div>
            <label className="wh-label">الاسم (اختياري)</label>
            <input value={nuName} onChange={(e) => setNuName(e.target.value)} className="wh-input" />
          </div>
          <div>
            <label className="wh-label">نوع الحساب</label>
            <select value={nuSystemRole} onChange={(e) => setNuSystemRole(e.target.value as "USER" | "ADMIN")} className="wh-input">
              <option value="USER">مستخدم عادي</option>
              <option value="ADMIN">مسؤول النظام</option>
            </select>
          </div>
          <div>
            <label className="wh-label">مستودع أولي (اختياري)</label>
            <select value={nuWarehouseId} onChange={(e) => setNuWarehouseId(e.target.value)} className="wh-input">
              <option value="">— بدون ربط —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="wh-label">صلاحية على المستودع الأول</label>
            <select value={nuWarehouseRole} onChange={(e) => setNuWarehouseRole(e.target.value as typeof nuWarehouseRole)} className="wh-input">
              <option value="VIEWER">عرض فقط</option>
              <option value="OPERATOR">تشغيل</option>
              <option value="MANAGER">مدير مستودع</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          className="wh-btn-dark mt-4"
          onClick={() =>
            void run(async () => {
              const memberships =
                nuWarehouseId.trim().length > 0
                  ? [{ warehouseId: nuWarehouseId.trim(), role: nuWarehouseRole }]
                  : undefined;
              await adminPost({
                action: "createUser",
                payload: {
                  email: nuEmail,
                  password: nuPassword,
                  name: nuName || undefined,
                  systemRole: nuSystemRole,
                  memberships
                }
              });
              setNuEmail("");
              setNuPassword("");
              setNuName("");
            })
          }
        >
          إنشاء المستخدم
        </button>
      </div>

      <div className="wh-card-muted rounded-2xl p-5">
        <h3 className="mb-3 font-bold text-slate-900">ربط مستخدم بمستودع</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="wh-label">المستخدم</label>
            <select value={linkUserId} onChange={(e) => setLinkUserId(e.target.value)} className="wh-input">
              <option value="">— اختر —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email} {u.active ? "" : "(معطّل)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="wh-label">المستودع</label>
            <select value={linkWarehouseId} onChange={(e) => setLinkWarehouseId(e.target.value)} className="wh-input">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="wh-label">الصلاحية</label>
            <select value={linkRole} onChange={(e) => setLinkRole(e.target.value as typeof linkRole)} className="wh-input">
              <option value="VIEWER">عرض فقط</option>
              <option value="OPERATOR">تشغيل</option>
              <option value="MANAGER">مدير مستودع</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          className="wh-btn-teal mt-3"
          onClick={() =>
            void run(async () => {
              if (!linkUserId) throw new Error("اختر مستخدمًا.");
              if (!linkWarehouseId) throw new Error("اختر مستودعًا.");
              await adminPost({
                action: "setMember",
                payload: { userId: linkUserId, warehouseId: linkWarehouseId, role: linkRole }
              });
            })
          }
        >
          حفظ الربط
        </button>
      </div>

      <div className="wh-card-muted rounded-2xl p-5">
        <h3 className="mb-2 font-bold text-slate-900">صلاحيات الصفحات لكل مستودع</h3>
        <p className="mb-2 text-sm text-slate-500">
          افتراضيًا صفحتا الإحصائيات وسجل العمليات للمسؤول فقط. علّم على <strong className="font-semibold text-slate-700">صفحة واحدة أو أكثر</strong> ثم احفظ؛
          القائمة المنسدلة السابقة كانت لصفحة واحدة فقط، لذلك لم يكن التحديد المتعدد ممكنًا من المتصفح.
        </p>
        <p className="mb-4 text-sm text-slate-500">
          <strong className="font-semibold text-slate-700">إرجاع للافتراضي:</strong> يحذف سجل المنح المخزّن لهذا المستخدم والمستودع <em className="not-italic">لكل صفحة محددة</em>، فتعود صلاحية كل صفحة إلى القواعد الافتراضية حسب <em className="not-italic">دور المستودع</em> (وليس حذف ربط المستخدم بالمستودع).
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="wh-label">المستخدم</label>
            <select value={pgUserId} onChange={(e) => setPgUserId(e.target.value)} className="wh-input">
              <option value="">— اختر —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="wh-label">المستودع</label>
            <select value={pgWarehouseId} onChange={(e) => setPgWarehouseId(e.target.value)} className="wh-input">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="wh-label mb-0">الصفحات (علّم ما تريد تطبيق المنح أو الإرجاع عليه)</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="text-xs font-semibold text-teal-700 hover:underline"
                onClick={() => setPgSelectedPageKeys([...PAGE_KEYS])}
              >
                تحديد الكل
              </button>
              <button type="button" className="text-xs font-semibold text-slate-600 hover:underline" onClick={() => setPgSelectedPageKeys([])}>
                مسح التحديد
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PAGE_KEYS.map((k) => (
              <label
                key={k}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:border-teal-300"
              >
                <input
                  type="checkbox"
                  checked={pgSelectedPageKeys.includes(k)}
                  onChange={() => togglePgPageKey(k)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300"
                />
                <span>{PAGE_LABEL_AR[k]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={pgAllowed} onChange={(e) => setPgAllowed(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            عند الحفظ: مسموح بالوصول (إلغاء التفعيل يعني «غير مسموح» صراحةً للصفحات المحددة)
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="wh-btn-primary"
            onClick={() =>
              void run(async () => {
                if (!pgUserId) throw new Error("اختر مستخدمًا.");
                if (!pgWarehouseId) throw new Error("اختر مستودعًا.");
                if (pgSelectedPageKeys.length === 0) throw new Error("علّم على صفحة واحدة على الأقل.");
                for (const pageKey of pgSelectedPageKeys) {
                  await adminPost({
                    action: "setPageGrant",
                    payload: { userId: pgUserId, warehouseId: pgWarehouseId, pageKey, allowed: pgAllowed }
                  });
                }
              })
            }
          >
            حفظ المنح للصفحات المحددة
          </button>
          <button
            type="button"
            className="wh-btn-slate"
            title="يحذف سجل المنح المخصص فقط؛ الصلاحية تعود لقواعد الدور الافتراضية"
            onClick={() =>
              void run(async () => {
                if (!pgUserId) throw new Error("اختر مستخدمًا.");
                if (!pgWarehouseId) throw new Error("اختر مستودعًا.");
                if (pgSelectedPageKeys.length === 0) throw new Error("علّم على صفحة واحدة على الأقل.");
                for (const pageKey of pgSelectedPageKeys) {
                  await adminPost({
                    action: "removePageGrant",
                    payload: { userId: pgUserId, warehouseId: pgWarehouseId, pageKey }
                  });
                }
              })
            }
          >
            إرجاع للافتراضي (حذف المنح المخصص)
          </button>
        </div>

        <h4 className="mb-2 mt-6 text-sm font-bold text-slate-800">المنح الحالية</h4>
        <div className="wh-table-wrap overflow-x-auto">
          <table className="wh-table min-w-[640px] text-sm">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>المستودع</th>
                <th>الصفحة</th>
                <th>الحالة</th>
                <th className="w-28">إزالة</th>
              </tr>
            </thead>
            <tbody>
              {pageGrants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500">
                    لا توجد منح مخصّصة بعد.
                  </td>
                </tr>
              ) : (
                pageGrants.map((row) => {
                  const u = users.find((x) => x.id === row.userId);
                  const w = warehouses.find((x) => x.id === row.warehouseId);
                  const label =
                    PAGE_KEYS.includes(row.pageKey as AppPageKey) ? PAGE_LABEL_AR[row.pageKey as AppPageKey] : row.pageKey;
                  return (
                    <tr key={row.id}>
                      <td>{u?.email ?? row.userId}</td>
                      <td>{w?.name ?? row.warehouseId}</td>
                      <td>{label}</td>
                      <td>{row.allowed ? "مسموح" : "غير مسموح"}</td>
                      <td>
                        <button
                          type="button"
                          className="text-xs font-semibold text-rose-600 hover:underline"
                          onClick={() =>
                            void run(async () => {
                              await adminPost({
                                action: "removePageGrant",
                                payload: { userId: row.userId, warehouseId: row.warehouseId, pageKey: row.pageKey }
                              });
                            })
                          }
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-bold text-slate-900">المستخدمون</h3>
        <div className="wh-table-wrap overflow-x-auto">
          <table className="wh-table min-w-[720px]">
            <thead>
              <tr>
                <th>البريد</th>
                <th>النوع</th>
                <th>الحالة</th>
                <th>المستودعات</th>
                <th className="w-36">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.email}</td>
                  <td>{u.systemRole === "ADMIN" ? "مسؤول" : "مستخدم"}</td>
                  <td>{u.active ? "نشط" : "معطّل"}</td>
                  <td className="text-xs text-slate-600">
                    {u.memberships.length === 0 ? (
                      "—"
                    ) : (
                      <ul className="space-y-2">
                        {u.memberships.map((m) => (
                          <li key={m.id} className="flex flex-wrap items-center gap-2">
                            <span>
                              {m.warehouse.name}: {ROLE_LABEL[m.role] ?? m.role}
                            </span>
                            <button
                              type="button"
                              className="text-xs font-semibold text-rose-600 hover:underline"
                              onClick={() =>
                                void run(async () => {
                                  await adminPost({
                                    action: "removeMember",
                                    payload: { userId: u.id, warehouseId: m.warehouseId }
                                  });
                                })
                              }
                            >
                              إزالة الربط
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        className="wh-btn-slate !px-2 !py-1.5 text-xs"
                        onClick={() =>
                          void run(async () => {
                            await adminPost({
                              action: "updateUser",
                              payload: { id: u.id, active: !u.active }
                            });
                          })
                        }
                      >
                        {u.active ? "تعطيل" : "تفعيل"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
