"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Location, Product, ProductSummary, StockEntry, WarehouseSnapshot } from "@/lib/warehouse-types";
import { classifyExpiry } from "@/lib/product-expiry";
import { barcodeSearchMatches, buildBarcodeVariants } from "@/lib/barcode";
import { PAGE_SIZE, type ScanTarget } from "@/lib/warehouse-constants";
import { findProductFromQuery } from "@/lib/warehouse-search";
import type { AppPageKey } from "@/lib/app-pages";
import { resolvePageAccess } from "@/lib/app-pages";
import { useLocale } from "@/contexts/LocaleContext";

export type MeWarehouse = { id: string; name: string; role: "VIEWER" | "OPERATOR" | "MANAGER" };
export type MeResponse = {
  user: { id: string; email: string; name: string | null; systemRole: "ADMIN" | "USER" };
  warehouses: MeWarehouse[];
  pageGrants: Array<{ warehouseId: string; pageKey: string; allowed: boolean }>;
};

export type WarehouseSessionValue = {
  me: MeResponse;
  warehouseId: string;
  setWarehouseId: (id: string) => void;
  refreshMeAndWarehouse: () => Promise<void>;
  canWrite: boolean;
  canAccessPage: (pageKey: AppPageKey | "admin") => boolean;
  productsState: Product[];
  locationsState: Location[];
  stockState: StockEntry[];
  applySnapshot: (s: WarehouseSnapshot) => void;
  fetchSnapshot: () => Promise<void>;
  postAction: (body: { action: string; payload: unknown }) => Promise<void>;
  postWithdrawStock: (productId: string, lines: Array<{ locationId: string; qty: number }>) => Promise<void>;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (v: number | ((p: number) => number)) => void;
  scanTarget: ScanTarget;
  setScanTarget: (v: ScanTarget) => void;
  scanMessage: string;
  setScanMessage: (v: string) => void;
  scannedLocationQr: string;
  scannedLocationQrTick: number;
  editingProduct: Product | null;
  setEditingProduct: (p: Product | null) => void;
  editingLocation: Location | null;
  setEditingLocation: (l: Location | null) => void;
  formData: {
    barcode: string;
    name: string;
    sku: string;
    criticalQty: string;
    expiresAt: string;
    expiryAlertDaysBefore: string;
    qty: string;
    locationQr: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      barcode: string;
      name: string;
      sku: string;
      criticalQty: string;
      expiresAt: string;
      expiryAlertDaysBefore: string;
      qty: string;
      locationQr: string;
    }>
  >;
  withdrawSearch: string;
  setWithdrawSearch: (v: string) => void;
  withdrawProduct: Product | null;
  setWithdrawProduct: (p: Product | null) => void;
  withdrawNeeded: string;
  setWithdrawNeeded: (v: string) => void;
  withdrawAlloc: Record<string, string>;
  setWithdrawAlloc: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  withdrawMsg: string;
  setWithdrawMsg: (v: string) => void;
  summaries: ProductSummary[];
  filtered: ProductSummary[];
  paginated: ProductSummary[];
  maxPage: number;
  criticalCount: number;
  totalLocations: number;
  totalProducts: number;
  withdrawStockEntries: Array<StockEntry & { locationName: string }>;
  withdrawTotalAvailable: number;
  withdrawSumAllocated: number;
  withdrawNeededNum: number;
  withdrawDeficit: number;
  handleSaveProduct: () => Promise<void>;
  handleWithdrawLookup: () => void;
  handleWithdrawAutoFill: () => void;
  handleWithdrawConfirm: () => Promise<void>;
  resetAddForm: () => void;
};

const Ctx = createContext<WarehouseSessionValue | null>(null);

function buildSummaries(productsState: Product[], stockState: StockEntry[], locationsState: Location[]): ProductSummary[] {
  return productsState.map((product) => {
    const entries = stockState.filter((entry) => entry.productId === product.id);
    const totalQty = entries.reduce((sum, entry) => sum + entry.qty, 0);
    const exp = classifyExpiry(product.expiresAt ? new Date(product.expiresAt) : null, product.expiryAlertDaysBefore);
    const expiryStatus =
      exp.kind === "expired" ? ("expired" as const) : exp.kind === "soon" ? ("soon" as const) : ("none" as const);
    return {
      ...product,
      totalQty,
      status: totalQty <= product.criticalQty ? ("critical" as const) : ("ok" as const),
      expiryStatus,
      daysToExpiry: exp.daysLeft,
      locations: entries.map((entry) => ({
        locationName: locationsState.find((loc) => loc.id === entry.locationId)?.name ?? "—",
        qty: entry.qty
      }))
    };
  });
}

export function WarehouseSessionProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();
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
    expiresAt: "",
    expiryAlertDaysBefore: "30",
    qty: "1",
    locationQr: ""
  });

  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [withdrawProduct, setWithdrawProduct] = useState<Product | null>(null);
  const [withdrawNeeded, setWithdrawNeeded] = useState("");
  const [withdrawAlloc, setWithdrawAlloc] = useState<Record<string, string>>({});
  const [withdrawMsg, setWithdrawMsg] = useState("");

  const [me, setMe] = useState<MeResponse | null>(null);
  const [warehouseId, setWarehouseIdState] = useState("");
  const [authReady, setAuthReady] = useState(false);

  const setWarehouseId = useCallback((id: string) => {
    setWarehouseIdState(id);
    localStorage.setItem("sw_wh_id", id);
  }, []);

  const canWrite = useMemo(() => {
    if (!me || !warehouseId) return false;
    if (me.user.systemRole === "ADMIN") return true;
    const w = me.warehouses.find((x) => x.id === warehouseId);
    return Boolean(w && w.role !== "VIEWER");
  }, [me, warehouseId]);

  const canAccessPage = useCallback(
    (pageKey: AppPageKey | "admin") => {
      if (!me) return false;
      if (pageKey === "admin") return me.user.systemRole === "ADMIN";
      if (!warehouseId) return false;
      if (me.user.systemRole === "ADMIN") return true;
      const w = me.warehouses.find((x) => x.id === warehouseId);
      if (!w) return false;
      return resolvePageAccess({
        systemRole: "USER",
        membershipRole: w.role,
        warehouseId,
        pageKey,
        grants: me.pageGrants ?? []
      });
    },
    [me, warehouseId]
  );

  const summaries = useMemo(
    () => buildSummaries(productsState, stockState, locationsState),
    [productsState, stockState, locationsState]
  );

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
    if (!pathname?.startsWith("/withdraw")) {
      setScanTarget((t) => (t === "withdrawBarcode" ? null : t));
    }
  }, [pathname]);

  function applySnapshot(snapshot: WarehouseSnapshot) {
    setProductsState(snapshot.products);
    setLocationsState(snapshot.locations);
    setStockState(snapshot.stock);
  }

  async function fetchSnapshot() {
    if (!warehouseId) return;
    const response = await fetch(`/api/warehouse?warehouseId=${encodeURIComponent(warehouseId)}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!response.ok) throw new Error("FETCH_WAREHOUSE_FAILED");
    const snapshot = (await response.json()) as WarehouseSnapshot;
    applySnapshot(snapshot);
  }

  async function postAction(body: { action: string; payload: unknown }) {
    if (!warehouseId) throw new Error("MISSING_WAREHOUSE");
    const response = await fetch("/api/warehouse", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, warehouseId })
    });
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      throw new Error(data.message || data.error || "WAREHOUSE_ACTION_FAILED");
    }
    const snapshot = (await response.json()) as WarehouseSnapshot;
    applySnapshot(snapshot);
  }

  async function postWithdrawStock(productId: string, lines: Array<{ locationId: string; qty: number }>) {
    if (!warehouseId) throw new Error("MISSING_WAREHOUSE");
    const response = await fetch("/api/warehouse", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warehouseId, action: "withdrawStock", payload: { productId, lines } })
    });
    if (response.status === 401) {
      window.location.href = "/login";
      throw new Error("UNAUTHORIZED");
    }
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
      return t("session_scan_https");
    }
    const text = error instanceof Error ? error.message : String(error ?? "");
    if (text.includes("NotAllowedError") || text.includes("Permission dismissed") || text.includes("Permission denied")) {
      return t("session_scan_denied");
    }
    if (text.includes("NotFoundError")) {
      return t("session_scan_not_found");
    }
    if (text.includes("NotReadableError")) {
      return t("session_scan_busy");
    }
    return t("session_scan_generic");
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
        { fps: 12, qrbox: { width: 280, height: 280 }, aspectRatio: 1.777 },
        (decodedText: string) => {
          if (scanTarget === "search") {
            setSearch(decodedText);
            setPage(1);
            setScanMessage(t("session_search_read", { code: decodedText }));
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
            setScanMessage(
              matchedProduct
                ? t("session_product_recognized", { name: matchedProduct.name })
                : t("session_product_barcode_read", { code: decodedText })
            );
          }
          if (scanTarget === "locationQr") {
            const matchedLocation = locationsState.find((item) => item.qrCode === decodedText.trim().toUpperCase());
            const normalizedQr = decodedText.trim().toUpperCase();
            setFormData((prev) => ({ ...prev, locationQr: normalizedQr }));
            setScannedLocationQr(normalizedQr);
            setScannedLocationQrTick((prev) => prev + 1);
            setScanMessage(
              matchedLocation
                ? t("session_loc_recognized", { name: matchedLocation.name })
                : t("session_loc_qr_read", { code: decodedText })
            );
          }
          if (scanTarget === "withdrawBarcode") {
            setWithdrawSearch(decodedText);
            const matched = findProductFromQuery(productsState, decodedText);
            setWithdrawProduct(matched);
            setWithdrawMsg(matched ? t("session_withdraw_scan_ok", { name: matched.name }) : t("session_withdraw_scan_fail"));
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
  }, [scanTarget, locationsState, productsState, t]);

  const refreshMeAndWarehouse = useCallback(async () => {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) throw new Error("ME_FAILED");
    const data = (await res.json()) as MeResponse;
    if (!data.pageGrants) data.pageGrants = [];
    setMe(data);
    setWarehouseIdState((current) => {
      const still = data.warehouses.some((w) => w.id === current);
      if (still) return current;
      const stored = typeof window !== "undefined" ? localStorage.getItem("sw_wh_id") : null;
      const next = data.warehouses.find((w) => w.id === stored) ?? data.warehouses[0];
      if (next) {
        localStorage.setItem("sw_wh_id", next.id);
        return next.id;
      }
      return "";
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refreshMeAndWarehouse();
      } catch {
        if (!cancelled) {
          setMe(null);
          setScanMessage(t("session_auth_load_fail"));
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMeAndWarehouse]);

  useEffect(() => {
    if (!authReady || !warehouseId) return;
    void fetchSnapshot().catch(() => {
      setScanMessage(t("session_wh_load_fail"));
    });
  }, [authReady, warehouseId]);

  function resetAddForm() {
    setFormData({
      barcode: "",
      name: "",
      sku: "",
      criticalQty: "10",
      expiresAt: "",
      expiryAlertDaysBefore: "30",
      qty: "1",
      locationQr: ""
    });
  }

  async function handleSaveProduct() {
    const qtyNumber = Number(formData.qty || 0);
    const criticalNumber = Number(formData.criticalQty || 0);
    if (!formData.barcode || !formData.sku || !formData.name || !formData.locationQr || Number.isNaN(qtyNumber)) {
      setScanMessage(t("session_fill_required"));
      return;
    }
    const rawAlert = Number(formData.expiryAlertDaysBefore);
    const alertDays = Number.isFinite(rawAlert) ? Math.max(0, Math.floor(rawAlert)) : 30;
    try {
      await postAction({
        action: "saveProduct",
        payload: {
          barcode: formData.barcode,
          name: formData.name,
          sku: formData.sku,
          criticalQty: Number.isNaN(criticalNumber) ? 0 : criticalNumber,
          qty: qtyNumber,
          locationQr: formData.locationQr,
          expiresAt: formData.expiresAt.trim() || null,
          expiryAlertDaysBefore: Number.isNaN(alertDays) ? 30 : alertDays
        }
      });
      setScanMessage(t("session_product_saved"));
      resetAddForm();
    } catch {
      setScanMessage(t("session_product_save_fail"));
    }
  }

  function handleWithdrawLookup() {
    const matched = findProductFromQuery(productsState, withdrawSearch);
    setWithdrawProduct(matched);
    setWithdrawMsg(matched ? t("session_withdraw_scan_ok", { name: matched.name }) : t("session_withdraw_lookup_hint"));
  }

  function handleWithdrawAutoFill() {
    if (!withdrawProduct) {
      setWithdrawMsg(t("session_withdraw_pick_first"));
      return;
    }
    if (withdrawNeededNum <= 0) {
      setWithdrawMsg(t("session_withdraw_qty_first"));
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
    setWithdrawMsg(t("session_withdraw_autofill_ok"));
  }

  async function handleWithdrawConfirm() {
    setWithdrawMsg("");
    if (!withdrawProduct) {
      setWithdrawMsg(t("session_withdraw_search_first"));
      return;
    }
    if (withdrawStockEntries.length === 0) {
      setWithdrawMsg(t("session_withdraw_no_stock"));
      return;
    }
    const lines: Array<{ locationId: string; qty: number }> = [];
    for (const row of withdrawStockEntries) {
      const q = Math.max(0, Math.floor(Number(withdrawAlloc[row.locationId]) || 0));
      if (q > 0) lines.push({ locationId: row.locationId, qty: q });
    }
    if (lines.length === 0) {
      setWithdrawMsg(t("session_withdraw_pick_qty"));
      return;
    }
    for (const line of lines) {
      const entry = withdrawStockEntries.find((r) => r.locationId === line.locationId);
      if (!entry || line.qty > entry.qty) {
        setWithdrawMsg(t("session_withdraw_qty_exceeds"));
        return;
      }
    }
    const sum = lines.reduce((s, l) => s + l.qty, 0);
    if (withdrawNeededNum > 0 && withdrawTotalAvailable >= withdrawNeededNum && sum !== withdrawNeededNum) {
      if (!window.confirm(t("session_confirm_mismatch", { need: withdrawNeededNum, sum }))) {
        return;
      }
    }
    if (withdrawNeededNum > withdrawTotalAvailable) {
      if (
        !window.confirm(
          t("session_confirm_deficit", { avail: withdrawTotalAvailable, deficit: withdrawDeficit, sum })
        )
      ) {
        return;
      }
    } else if (withdrawNeededNum > 0 && sum < withdrawNeededNum) {
      if (!window.confirm(t("session_confirm_partial", { need: withdrawNeededNum, sum }))) {
        return;
      }
    }
    try {
      await postWithdrawStock(withdrawProduct.id, lines);
      setWithdrawMsg(t("session_withdraw_success", { sum }));
      setWithdrawNeeded("");
    } catch (e) {
      const code = (e as Error & { code?: string }).code;
      if (code === "INSUFFICIENT_STOCK") {
        setWithdrawMsg(t("session_withdraw_fail_qty"));
      } else if (code === "PRODUCT_NOT_FOUND") {
        setWithdrawMsg(t("session_withdraw_fail_not_found"));
      } else {
        setWithdrawMsg((e as Error).message || t("session_withdraw_fail_generic"));
      }
    }
  }

  if (!authReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
        <p className="text-slate-500">{t("common_loading")}</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-slate-600">{t("session_auth_load_fail")}</p>
        <a href="/login" className="mt-4 inline-block text-violet-700 underline">
          {t("session_back_login")}
        </a>
      </div>
    );
  }

  const value: WarehouseSessionValue = {
    me,
    warehouseId,
    setWarehouseId,
    refreshMeAndWarehouse,
    canWrite,
    canAccessPage,
    productsState,
    locationsState,
    stockState,
    applySnapshot,
    fetchSnapshot,
    postAction,
    postWithdrawStock,
    search,
    setSearch,
    page,
    setPage,
    scanTarget,
    setScanTarget,
    scanMessage,
    setScanMessage,
    scannedLocationQr,
    scannedLocationQrTick,
    editingProduct,
    setEditingProduct,
    editingLocation,
    setEditingLocation,
    formData,
    setFormData,
    withdrawSearch,
    setWithdrawSearch,
    withdrawProduct,
    setWithdrawProduct,
    withdrawNeeded,
    setWithdrawNeeded,
    withdrawAlloc,
    setWithdrawAlloc,
    withdrawMsg,
    setWithdrawMsg,
    summaries,
    filtered,
    paginated,
    maxPage,
    criticalCount,
    totalLocations,
    totalProducts,
    withdrawStockEntries,
    withdrawTotalAvailable,
    withdrawSumAllocated,
    withdrawNeededNum,
    withdrawDeficit,
    handleSaveProduct,
    handleWithdrawLookup,
    handleWithdrawAutoFill,
    handleWithdrawConfirm,
    resetAddForm
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWarehouseSession(): WarehouseSessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWarehouseSession must be used inside WarehouseSessionProvider");
  return v;
}
