"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Location, Product, StockEntry, WarehouseSnapshot } from "@/lib/warehouse-types";
import { barcodeSearchMatches, buildBarcodeVariants } from "@/lib/barcode";
import { PAGE_SIZE, WAREHOUSE_TABS, type TabKey, type ScanTarget } from "@/lib/warehouse-constants";
import { findProductFromQuery } from "@/lib/warehouse-search";
import { StatCard } from "@/components/warehouse/StatCard";
import { DashboardTab } from "@/components/warehouse/tabs/DashboardTab";
import { ProductsTab } from "@/components/warehouse/tabs/ProductsTab";
import { LocationsTab } from "@/components/warehouse/tabs/LocationsTab";
import { WithdrawTab } from "@/components/warehouse/tabs/WithdrawTab";
import { AddProductTab } from "@/components/warehouse/tabs/AddProductTab";
import { AddLocationForm } from "@/components/warehouse/AddLocationForm";
import { EditProductModal } from "@/components/warehouse/EditProductModal";
import { EditLocationModal } from "@/components/warehouse/EditLocationModal";

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [scanTarget, setScanTarget] = useState<ScanTarget>(null);
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

  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [withdrawProduct, setWithdrawProduct] = useState<Product | null>(null);
  const [withdrawNeeded, setWithdrawNeeded] = useState("");
  const [withdrawAlloc, setWithdrawAlloc] = useState<Record<string, string>>({});
  const [withdrawMsg, setWithdrawMsg] = useState("");

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

  const withdrawStockEntries = useMemo(() => {
    if (!withdrawProduct) return [];
    return stockState
      .filter((s) => s.productId === withdrawProduct.id)
      .map((s) => ({
        ...s,
        locationName: locationsState.find((l) => l.id === s.locationId)?.name ?? "—"
      }))
      .sort((a, b) => a.locationName.localeCompare(b.locationName, "ar"));
  }, [withdrawProduct, stockState, locationsState]);

  const withdrawTotalAvailable = useMemo(
    () => withdrawStockEntries.reduce((sum, row) => sum + row.qty, 0),
    [withdrawStockEntries]
  );

  const withdrawSumAllocated = useMemo(() => {
    return withdrawStockEntries.reduce((sum, row) => {
      const v = Math.max(0, Math.floor(Number(withdrawAlloc[row.locationId]) || 0));
      return sum + v;
    }, 0);
  }, [withdrawStockEntries, withdrawAlloc]);

  const withdrawNeededNum = Math.max(0, Math.floor(Number(withdrawNeeded) || 0));
  const withdrawDeficit =
    withdrawNeededNum > 0 && withdrawNeededNum > withdrawTotalAvailable ? withdrawNeededNum - withdrawTotalAvailable : 0;

  useEffect(() => {
    if (!withdrawProduct) {
      setWithdrawAlloc({});
      return;
    }
    const next: Record<string, string> = {};
    for (const row of stockState.filter((x) => x.productId === withdrawProduct.id)) {
      next[row.locationId] = "0";
    }
    setWithdrawAlloc(next);
  }, [withdrawProduct?.id]);

  useEffect(() => {
    if (tab !== "withdraw" && scanTarget === "withdrawBarcode") {
      setScanTarget(null);
    }
  }, [tab, scanTarget]);

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

  async function postWithdrawStock(productId: string, lines: Array<{ locationId: string; qty: number }>) {
    const response = await fetch("/api/warehouse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdrawStock", payload: { productId, lines } })
    });
    const data = (await response.json()) as WarehouseSnapshot & { error?: string; message?: string };
    if (!response.ok) {
      const err = new Error(data.message || data.error || "WITHDRAW_FAILED") as Error & { code?: string };
      err.code = data.error;
      throw err;
    }
    applySnapshot(data as WarehouseSnapshot);
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

          if (scanTarget === "withdrawBarcode") {
            setWithdrawSearch(decodedText);
            const matched = findProductFromQuery(productsState, decodedText);
            setWithdrawProduct(matched);
            setWithdrawMsg(
              matched
                ? `تم تحديد المنتج: ${matched.name}`
                : "لم يُعثر على منتج بهذا الباركود أو الـ SKU أو الاسم."
            );
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

  function handleWithdrawLookup() {
    const matched = findProductFromQuery(productsState, withdrawSearch);
    setWithdrawProduct(matched);
    setWithdrawMsg(
      matched
        ? `تم تحديد المنتج: ${matched.name}`
        : "المنتج غير موجود في النظام. تحقق من الباركود أو الـ SKU أو أضف المنتج من تبويب «إضافة منتج»."
    );
  }

  function handleWithdrawAutoFill() {
    if (!withdrawProduct) {
      setWithdrawMsg("حدد منتجًا أولًا.");
      return;
    }
    if (withdrawNeededNum <= 0) {
      setWithdrawMsg("أدخل الكمية المطلوبة أولًا.");
      return;
    }
    let remaining = Math.min(withdrawNeededNum, withdrawTotalAvailable);
    const next: Record<string, string> = {};
    for (const row of withdrawStockEntries) {
      next[row.locationId] = "0";
    }
    for (const row of withdrawStockEntries) {
      if (remaining <= 0) break;
      const take = Math.min(row.qty, remaining);
      next[row.locationId] = String(take);
      remaining -= take;
    }
    setWithdrawAlloc(next);
    setWithdrawMsg("تم توزيع الكمية تلقائيًا على الأماكن بالترتيب.");
  }

  async function handleWithdrawConfirm() {
    setWithdrawMsg("");
    if (!withdrawProduct) {
      setWithdrawMsg("ابحث عن منتج أولًا.");
      return;
    }
    if (withdrawStockEntries.length === 0) {
      setWithdrawMsg("لا يوجد مخزون لهذا المنتج في أي مكان.");
      return;
    }
    const lines: Array<{ locationId: string; qty: number }> = [];
    for (const row of withdrawStockEntries) {
      const q = Math.max(0, Math.floor(Number(withdrawAlloc[row.locationId]) || 0));
      if (q > 0) lines.push({ locationId: row.locationId, qty: q });
    }
    if (lines.length === 0) {
      setWithdrawMsg("حدد كمية للسحب من مكان واحد على الأقل.");
      return;
    }
    for (const line of lines) {
      const entry = withdrawStockEntries.find((r) => r.locationId === line.locationId);
      if (!entry || line.qty > entry.qty) {
        setWithdrawMsg("إحدى الكميات أكبر من المتوفر في المكان.");
        return;
      }
    }
    const sum = lines.reduce((s, l) => s + l.qty, 0);
    if (withdrawNeededNum > 0 && withdrawTotalAvailable >= withdrawNeededNum && sum !== withdrawNeededNum) {
      if (!window.confirm(`الكمية المطلوبة ${withdrawNeededNum}، ومجموع السحب ${sum}. هل تريد المتابعة؟`)) {
        return;
      }
    }
    if (withdrawNeededNum > withdrawTotalAvailable) {
      if (
        !window.confirm(
          `المخزون الكلي ${withdrawTotalAvailable} فقط. العجز ${withdrawDeficit}. سيتم سحب ${sum} وحدة. متابعة؟`
        )
      ) {
        return;
      }
    } else if (withdrawNeededNum > 0 && sum < withdrawNeededNum) {
      if (!window.confirm(`لم يُسحب كامل المطلوب (${withdrawNeededNum}). مجموع السحب ${sum}. متابعة؟`)) {
        return;
      }
    }
    try {
      await postWithdrawStock(withdrawProduct.id, lines);
      setWithdrawMsg(`تم سحب ${sum} وحدة وتحديث المخزون بنجاح.`);
      setWithdrawNeeded("");
    } catch (e) {
      const code = (e as Error & { code?: string }).code;
      if (code === "INSUFFICIENT_STOCK") {
        setWithdrawMsg("تعذر السحب: تحقق من الكميات (ربما تغيّر المخزون). أعد التحميل وحاول مجددًا.");
      } else if (code === "PRODUCT_NOT_FOUND") {
        setWithdrawMsg("المنتج غير موجود في النظام.");
      } else {
        setWithdrawMsg((e as Error).message || "فشل تنفيذ السحب.");
      }
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 pb-16 md:px-6 md:py-10">
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/90 bg-gradient-to-bl from-white via-violet-50/40 to-teal-50/50 p-6 shadow-soft-lg md:p-8">
        <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-violet-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="relative">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-600/90">Smart Warehouse</p>
          <h1 className="mb-2 bg-gradient-to-l from-slate-900 via-violet-900 to-slate-800 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl">
            نظام إدارة مستودع ذكي
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
            لوحة تحكم عصرية لإدارة المنتجات والمواقع، مع سكان الباركود وتحديث فوري للمخزون.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="عدد المنتجات" value={totalProducts} accent="violet" />
            <StatCard label="عدد المواقع" value={totalLocations} accent="teal" />
            <StatCard label="منتجات حرجة" value={criticalCount} danger />
          </div>
        </div>
      </section>

      <nav className="wh-tabs-shell mb-8" aria-label="أقسام النظام">
        {WAREHOUSE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={tab === t.key ? "wh-tab wh-tab-active" : "wh-tab"}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "dashboard" && (
        <DashboardTab
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          scanMessage={scanMessage}
          showScanner={scanTarget === "search"}
          onStartSearchScan={() => setScanTarget("search")}
          onStopScan={() => setScanTarget(null)}
          paginated={paginated}
          page={page}
          maxPage={maxPage}
          onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setPage((p) => Math.min(maxPage, p + 1))}
        />
      )}

      {tab === "products" && (
        <ProductsTab
          summaries={summaries}
          onEditProductId={(id) => setEditingProduct(productsState.find((item) => item.id === id) ?? null)}
        />
      )}

      {tab === "locations" && (
        <LocationsTab
          locations={locationsState}
          stock={stockState}
          products={productsState}
          onEditLocation={setEditingLocation}
        />
      )}

      {tab === "withdraw" && (
        <WithdrawTab
          withdrawSearch={withdrawSearch}
          onWithdrawSearchChange={setWithdrawSearch}
          onLookup={handleWithdrawLookup}
          onStartWithdrawScan={() => setScanTarget("withdrawBarcode")}
          showScanner={scanTarget === "withdrawBarcode"}
          onStopScan={() => setScanTarget(null)}
          withdrawMsg={withdrawMsg}
          withdrawProduct={withdrawProduct}
          withdrawNeeded={withdrawNeeded}
          onWithdrawNeededChange={setWithdrawNeeded}
          withdrawNeededNum={withdrawNeededNum}
          withdrawDeficit={withdrawDeficit}
          withdrawTotalAvailable={withdrawTotalAvailable}
          withdrawSumAllocated={withdrawSumAllocated}
          withdrawStockEntries={withdrawStockEntries}
          withdrawAlloc={withdrawAlloc}
          onAllocChange={(locationId, value) =>
            setWithdrawAlloc((prev) => ({
              ...prev,
              [locationId]: value
            }))
          }
          onAutoFill={handleWithdrawAutoFill}
          onConfirm={handleWithdrawConfirm}
        />
      )}

      {tab === "add-product" && (
        <AddProductTab
          formData={formData}
          setFormData={setFormData}
          scanMessage={scanMessage}
          showScanner={scanTarget === "productBarcode" || scanTarget === "locationQr"}
          onStartProductBarcodeScan={() => setScanTarget("productBarcode")}
          onStartLocationQrScan={() => setScanTarget("locationQr")}
          onStopScan={() => setScanTarget(null)}
          onSave={handleSaveProduct}
        />
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
