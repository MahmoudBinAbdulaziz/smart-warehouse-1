"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Location, Product, StockEntry } from "@/lib/warehouse-types";
import { barcodeSearchMatches, buildBarcodeVariants } from "@/lib/barcode";

type TabKey = "dashboard" | "products" | "locations" | "add-product" | "add-location";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "dashboard", label: "الرئيسية" },
  { key: "products", label: "المنتجات" },
  { key: "locations", label: "الأماكن" },
  { key: "add-product", label: "إضافة منتج" },
  { key: "add-location", label: "إضافة مكان" }
];

const PAGE_SIZE = 2;
type WarehouseSnapshot = { products: Product[]; locations: Location[]; stock: StockEntry[] };

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [scanTarget, setScanTarget] = useState<"search" | "productBarcode" | "locationQr" | null>(null);
  const [scanMessage, setScanMessage] = useState("");
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const scannerRunningRef = useRef(false);
  const scannerBusyRef = useRef(false);

  const [productsState, setProductsState] = useState<Product[]>([]);
  const [locationsState, setLocationsState] = useState<Location[]>([]);
  const [stockState, setStockState] = useState<StockEntry[]>([]);
  const [scannedLocationQr, setScannedLocationQr] = useState("");
  const [scannedLocationQrTick, setScannedLocationQrTick] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    sku: "",
    criticalQty: "10",
    qty: "1",
    locationQr: ""
  });

  const summaries = useMemo(() => {
    return productsState.map((product) => {
      const entries = stockState.filter((entry) => entry.productId === product.id);
      const totalQty = entries.reduce((sum, entry) => sum + entry.qty, 0);
      return {
        ...product,
        totalQty,
        status: totalQty <= product.criticalQty ? ("critical" as const) : ("ok" as const),
        locations: entries.map((entry) => ({
          locationName: locationsState.find((loc) => loc.id === entry.locationId)?.name ?? "Unknown",
          qty: entry.qty
        }))
      };
    });
  }, [productsState, stockState, locationsState]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        barcodeSearchMatches(search, p.barcode)
    );
  }, [search, summaries]);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE),
    [filtered, page]
  );
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const criticalCount = useMemo(() => summaries.filter((item) => item.status === "critical").length, [summaries]);
  const totalLocations = locationsState.length;
  const totalProducts = productsState.length;

  function applySnapshot(snapshot: WarehouseSnapshot) {
    setProductsState(snapshot.products);
    setLocationsState(snapshot.locations);
    setStockState(snapshot.stock);
  }

  async function fetchSnapshot() {
    const response = await fetch("/api/warehouse", { method: "GET", cache: "no-store" });
    if (!response.ok) throw new Error("FETCH_WAREHOUSE_FAILED");
    const snapshot = (await response.json()) as WarehouseSnapshot;
    applySnapshot(snapshot);
  }

  async function postAction(body: unknown) {
    const response = await fetch("/api/warehouse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      throw new Error(data.message || data.error || "WAREHOUSE_ACTION_FAILED");
    }
    const snapshot = (await response.json()) as WarehouseSnapshot;
    applySnapshot(snapshot);
  }

  async function safeStopScanner() {
    if (!scannerRef.current || !scannerRunningRef.current || scannerBusyRef.current) return;
    scannerBusyRef.current = true;
    try {
      await scannerRef.current.stop();
      scannerRef.current.clear();
      scannerRunningRef.current = false;
    } catch {
      scannerRunningRef.current = false;
    } finally {
      scannerBusyRef.current = false;
    }
  }

  function scannerErrorMessage(error: unknown): string {
    if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return "السكان يحتاج HTTPS على السيرفر. فعّل SSL للدومين في Hostinger.";
    }

    const text = error instanceof Error ? error.message : String(error ?? "");
    if (text.includes("NotAllowedError") || text.includes("Permission dismissed") || text.includes("Permission denied")) {
      return "تم رفض إذن الكاميرا. اسمح بالوصول للكاميرا من إعدادات المتصفح ثم أعد المحاولة.";
    }
    if (text.includes("NotFoundError")) {
      return "لم يتم العثور على كاميرا في هذا الجهاز.";
    }
    if (text.includes("NotReadableError")) {
      return "الكاميرا مستخدمة من تطبيق آخر. أغلقه ثم أعد المحاولة.";
    }

    return "تعذر تشغيل الكاميرا. تحقق من إذن الكاميرا أو جرّب متصفحًا آخر.";
  }

  useEffect(() => {
    let cancelled = false;

    async function setupScanner() {
      if (!scanTarget || scannerBusyRef.current) return;
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      await safeStopScanner();
      const html5QrCode = new Html5Qrcode("scanner-region");
      scannerRef.current = html5QrCode;
      scannerRunningRef.current = false;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 12,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.777
        },
        (decodedText: string) => {
          if (scanTarget === "search") {
            setSearch(decodedText);
            setPage(1);
            setScanMessage(`تمت قراءة كود البحث: ${decodedText}`);
          }

          if (scanTarget === "productBarcode") {
            const variants = new Set(buildBarcodeVariants(decodedText));
            const matchedProduct = productsState.find((item) => buildBarcodeVariants(item.barcode).some((v) => variants.has(v)));
            setFormData((prev) => ({
              ...prev,
              barcode: matchedProduct?.barcode ?? decodedText,
              name: matchedProduct?.name ?? prev.name,
              sku: matchedProduct?.sku ?? prev.sku,
              criticalQty: matchedProduct ? String(matchedProduct.criticalQty) : prev.criticalQty
            }));
            setScanMessage(matchedProduct ? `تم التعرف على المنتج: ${matchedProduct.name}` : `تمت قراءة باركود المنتج: ${decodedText}`);
          }

          if (scanTarget === "locationQr") {
            const matchedLocation = locationsState.find((item) => item.qrCode === decodedText.trim().toUpperCase());
            const normalizedQr = decodedText.trim().toUpperCase();
            setFormData((prev) => ({ ...prev, locationQr: normalizedQr }));
            setScannedLocationQr(normalizedQr);
            setScannedLocationQrTick((prev) => prev + 1);
            setScanMessage(matchedLocation ? `تم التعرف على الموقع: ${matchedLocation.name}` : `تمت قراءة QR الموقع: ${decodedText}`);
          }

          void safeStopScanner();
          setScanTarget(null);
        },
        () => null
      );
      scannerRunningRef.current = true;
    }

    void setupScanner().catch((error) => {
      void safeStopScanner();
      setScanTarget(null);
      setScanMessage(scannerErrorMessage(error));
    });

    return () => {
      cancelled = true;
      void safeStopScanner();
    };
  }, [scanTarget, locationsState, productsState]);

  useEffect(() => {
    void fetchSnapshot().catch(() => {
      setScanMessage("تعذر تحميل بيانات قاعدة البيانات. تأكد من تشغيل PostgreSQL وضبط DATABASE_URL.");
    });
  }, []);

  function resetAddForm() {
    setFormData({
      barcode: "",
      name: "",
      sku: "",
      criticalQty: "10",
      qty: "1",
      locationQr: ""
    });
  }

  async function handleSaveProduct() {
    const qtyNumber = Number(formData.qty || 0);
    const criticalNumber = Number(formData.criticalQty || 0);

    if (!formData.barcode || !formData.sku || !formData.name || !formData.locationQr || Number.isNaN(qtyNumber)) {
      setScanMessage("يرجى تعبئة البيانات المطلوبة أو استخدام السكان.");
      return;
    }

    try {
      await postAction({
        action: "saveProduct",
        payload: {
          barcode: formData.barcode,
          name: formData.name,
          sku: formData.sku,
          criticalQty: Number.isNaN(criticalNumber) ? 0 : criticalNumber,
          qty: qtyNumber,
          locationQr: formData.locationQr
        }
      });
      setScanMessage("تم حفظ المنتج بنجاح وتحديث الكمية في الموقع.");
      resetAddForm();
    } catch {
      setScanMessage("فشل حفظ المنتج في قاعدة البيانات.");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-4 md:p-6">
      <section className="mb-6 rounded-3xl border border-slate-200/80 bg-gradient-to-l from-slate-50 via-indigo-50 to-sky-50 p-6 text-slate-800 shadow-sm">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">نظام إدارة مستودع ذكي</h1>
        <p className="text-slate-600">واجهة منظمة لإدارة المنتجات والمواقع مع سكان كاميرا وتحديث مباشر لقاعدة البيانات.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatCard label="عدد المنتجات" value={totalProducts} />
          <StatCard label="عدد المواقع" value={totalLocations} />
          <StatCard label="منتجات حرجة" value={criticalCount} danger />
        </div>
      </section>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-sm backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث بـ SKU أو Barcode أو اسم المنتج"
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 outline-none transition focus:border-indigo-300 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setScanTarget("search")}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              سكان بالكاميرا للبحث
            </button>
          </div>

          {scanMessage ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{scanMessage}</p> : null}
          {scanTarget ? <ScannerView title="الكاميرا تعمل الآن - ضع الباركود داخل الإطار" onStop={() => setScanTarget(null)} /> : null}

          <div className="grid gap-3 md:grid-cols-2">
            {paginated.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{item.name}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === "critical" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {item.status === "critical" ? "حرج" : "طبيعي"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  SKU: {item.sku} | Barcode: {item.barcode} | الكمية الإجمالية: {item.totalQty}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  {item.locations.map((loc) => (
                    <li key={`${item.id}-${loc.locationName}`}>- {loc.locationName}: {loc.qty}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <Pagination page={page} maxPage={maxPage} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(maxPage, p + 1))} />
        </section>
      )}

      {tab === "products" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">كل المنتجات</h2>
          <table className="w-full overflow-hidden rounded-xl border border-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50 text-right text-slate-600">
                <th className="border p-2">الاسم</th>
                <th className="border p-2">SKU</th>
                <th className="border p-2">Barcode</th>
                <th className="border p-2">الكمية</th>
                <th className="border p-2">الحالة</th>
                <th className="border p-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((p) => (
                <tr key={p.id}>
                  <td className="border p-2">{p.name}</td>
                  <td className="border p-2">{p.sku}</td>
                  <td className="border p-2">{p.barcode}</td>
                  <td className="border p-2">{p.totalQty}</td>
                  <td className="border p-2">{p.status === "critical" ? "حرج" : "طبيعي"}</td>
                  <td className="border p-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(productsState.find((item) => item.id === p.id) ?? null)}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "locations" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">الأماكن وما تحتويه</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {locationsState.map((loc) => {
              const stocks = stockState.filter((s) => s.locationId === loc.id);
              return (
                <article key={loc.id} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">{loc.name}</h3>
                    <button
                      type="button"
                      onClick={() => setEditingLocation(loc)}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700"
                    >
                      تعديل
                    </button>
                  </div>
                  <p className="mb-3 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">QR: {loc.qrCode}</p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {stocks.map((s) => {
                      const p = productsState.find((x) => x.id === s.productId);
                      return <li key={`${loc.id}-${s.productId}`}>- {p?.name}: {s.qty}</li>;
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === "add-product" && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">إضافة منتج (يدوي / سكان)</h2>
          <div className="mb-4 grid gap-2 md:grid-cols-2">
            <button type="button" onClick={() => setScanTarget("productBarcode")} className="rounded-xl bg-indigo-600 p-3 font-semibold text-white hover:bg-indigo-700">
              سكان باركود المنتج
            </button>
            <button type="button" onClick={() => setScanTarget("locationQr")} className="rounded-xl bg-sky-600 p-3 font-semibold text-white hover:bg-sky-700">
              سكان QR للمكان
            </button>
          </div>
          {scanTarget ? <ScannerView title="امسح الكود الآن - اجعل الإضاءة قوية" onStop={() => setScanTarget(null)} /> : null}
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
            <button type="button" onClick={handleSaveProduct} className="col-span-full rounded-xl bg-slate-900 p-3 text-white">
              حفظ المنتج
            </button>
          </form>
        </section>
      )}
      {tab === "add-location" && (
        <AddLocationForm
          locationsList={locationsState}
          onAddLocation={async (name, qrCode) => {
            await postAction({ action: "addLocation", payload: { name, qrCode } });
          }}
          onMessage={(message) => setScanMessage(message)}
          scannedQr={scannedLocationQr}
          scannedQrTick={scannedLocationQrTick}
          onStartScan={() => setScanTarget("locationQr")}
          showScanner={scanTarget === "locationQr"}
          onStopScan={() => setScanTarget(null)}
        />
      )}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={async (updatedProduct) => {
            try {
              await postAction({
                action: "updateProduct",
                payload: {
                  id: updatedProduct.id,
                  name: updatedProduct.name,
                  sku: updatedProduct.sku,
                  barcode: updatedProduct.barcode,
                  criticalQty: updatedProduct.criticalQty
                }
              });
              setScanMessage("تم تعديل المنتج بنجاح.");
            } catch {
              setScanMessage("فشل تعديل المنتج.");
            } finally {
              setEditingProduct(null);
            }
          }}
        />
      )}
      {editingLocation && (
        <EditLocationModal
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSave={async (updatedLocation) => {
            try {
              await postAction({
                action: "updateLocation",
                payload: {
                  id: updatedLocation.id,
                  name: updatedLocation.name,
                  qrCode: updatedLocation.qrCode
                }
              });
              setScanMessage("تم تعديل المكان بنجاح.");
            } catch {
              setScanMessage("فشل تعديل المكان.");
            } finally {
              setEditingLocation(null);
            }
          }}
          onClearLocation={async (locationId) => {
            try {
              await postAction({ action: "clearLocationStock", payload: { locationId } });
              setScanMessage("تم تفريغ المكان من جميع المنتجات.");
            } catch {
              setScanMessage("فشل تفريغ المكان.");
            } finally {
              setEditingLocation(null);
            }
          }}
        />
      )}
    </main>
  );
}

function ScannerView({ title, onStop }: { title: string; onStop: () => void }) {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-indigo-800">{title}</p>
        <button type="button" onClick={onStop} className="rounded-lg border border-indigo-200 bg-white px-3 py-1 text-sm text-slate-700">
          إيقاف
        </button>
      </div>
      <div id="scanner-region" className="overflow-hidden rounded-xl bg-black p-2" />
    </div>
  );
}

function StatCard({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${danger ? "text-rose-600" : "text-indigo-700"}`}>{value}</p>
    </article>
  );
}

function Pagination({
  page,
  maxPage,
  onPrev,
  onNext
}: {
  page: number;
  maxPage: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onPrev} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:opacity-50" disabled={page <= 1}>
        السابق
      </button>
      <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-600">
        صفحة {page} من {maxPage}
      </span>
      <button type="button" onClick={onNext} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:opacity-50" disabled={page >= maxPage}>
        التالي
      </button>
    </div>
  );
}

function AddLocationForm({
  locationsList,
  onAddLocation,
  onMessage,
  scannedQr,
  scannedQrTick,
  onStartScan,
  showScanner,
  onStopScan
}: {
  locationsList: Location[];
  onAddLocation: (name: string, qrCode: string) => Promise<void>;
  onMessage: (message: string) => void;
  scannedQr: string;
  scannedQrTick: number;
  onStartScan: () => void;
  showScanner: boolean;
  onStopScan: () => void;
}) {
  const [name, setName] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (scannedQr) {
      setQrCode(scannedQr);
      setError("");
    }
  }, [scannedQr, scannedQrTick]);

  const handleSubmit = async () => {
    const normalizedName = name.trim();
    const normalizedQr = qrCode.trim().toUpperCase();
    if (!normalizedName || !normalizedQr) {
      setError("يرجى تعبئة اسم المكان وQR.");
      return;
    }

    const duplicate = locationsList.some(
      (loc) => loc.name.toLowerCase() === normalizedName.toLowerCase() || loc.qrCode.toLowerCase() === normalizedQr.toLowerCase()
    );
    if (duplicate) {
      setError("المكان أو QR موجود مسبقًا.");
      return;
    }

    try {
      await onAddLocation(normalizedName, normalizedQr);
      setName("");
      setQrCode("");
      setError("");
      onMessage("تم إضافة مكان جديد.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("ALREADY_EXISTS")) {
        setError("هذا الـ QR مستخدم مسبقًا.");
        return;
      }
      setError(`فشل إضافة المكان: ${message || "خطأ غير معروف"}`);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold">إضافة مكان جديد</h2>
      <button
        type="button"
        onClick={() => {
          setError("");
          onStartScan();
        }}
        className="mb-3 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
      >
        سكان QR للمكان
      </button>
      {showScanner ? <ScannerView title="امسح QR المكان الآن" onStop={onStopScan} /> : null}
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المكان" className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 outline-none focus:border-indigo-300 focus:bg-white" />
        <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="QR المكان" className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 outline-none focus:border-indigo-300 focus:bg-white" />
        <button type="submit" className="col-span-full rounded-xl bg-indigo-600 p-3 font-semibold text-white hover:bg-indigo-700">
          إضافة المكان
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}

function EditProductModal({
  product,
  onClose,
  onSave
}: {
  product: Product;
  onClose: () => void;
  onSave: (updated: Product) => void;
}) {
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [barcode, setBarcode] = useState(product.barcode);
  const [criticalQty, setCriticalQty] = useState(String(product.criticalQty));
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold">تعديل المنتج</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المنتج" className="rounded-xl border border-slate-200 p-3" />
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="rounded-xl border border-slate-200 p-3" />
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode" className="rounded-xl border border-slate-200 p-3" />
          <input
            value={criticalQty}
            onChange={(e) => setCriticalQty(e.target.value)}
            placeholder="الحد الحرج"
            type="number"
            min={0}
            className="rounded-xl border border-slate-200 p-3"
          />
        </div>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
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
              onSave({ ...product, name: name.trim(), sku: sku.trim(), barcode: barcode.trim(), criticalQty: Math.floor(qty) });
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            حفظ
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function EditLocationModal({
  location,
  onClose,
  onSave,
  onClearLocation
}: {
  location: Location;
  onClose: () => void;
  onSave: (updated: Location) => void;
  onClearLocation: (locationId: string) => void;
}) {
  const [name, setName] = useState(location.name);
  const [qrCode, setQrCode] = useState(location.qrCode);
  const [error, setError] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold">تعديل المكان</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المكان" className="rounded-xl border border-slate-200 p-3" />
          <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="QR المكان" className="rounded-xl border border-slate-200 p-3" />
        </div>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!name.trim() || !qrCode.trim()) {
                setError("يرجى تعبئة اسم المكان وQR.");
                return;
              }
              onSave({ ...location, name: name.trim(), qrCode: qrCode.trim().toUpperCase() });
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            حفظ
          </button>
          <button type="button" onClick={() => onClearLocation(location.id)} className="rounded-xl bg-red-700 px-4 py-2 text-white">
            تفريغ المكان
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
