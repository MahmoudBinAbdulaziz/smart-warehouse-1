"use client";

import { useMemo, useState } from "react";
import type { Location, Product, ProductSummary, StockEntry } from "../lib/warehouse-types";
import { locations, products, stock } from "../mock-data";

type TabKey = "dashboard" | "products" | "locations" | "add-product" | "add-location";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "dashboard", label: "الرئيسية" },
  { key: "products", label: "المنتجات" },
  { key: "locations", label: "الأماكن" },
  { key: "add-product", label: "إضافة منتج" },
  { key: "add-location", label: "إضافة مكان" }
];

const PAGE_SIZE = 2;

function buildProductSummaryFromData(productsList: Product[], locationsList: Location[], stockList: StockEntry[]): ProductSummary[] {
  return productsList.map((product) => {
    const entries = stockList.filter((entry) => entry.productId === product.id);
    const totalQty = entries.reduce((sum, entry) => sum + entry.qty, 0);
    return {
      ...product,
      totalQty,
      status: totalQty <= product.criticalQty ? "critical" : "ok",
      locations: entries.map((entry) => ({
        locationName: locationsList.find((loc) => loc.id === entry.locationId)?.name ?? "Unknown",
        qty: entry.qty
      }))
    };
  });
}

function searchProductsInData(term: string, productsList: Product[], locationsList: Location[], stockList: StockEntry[]): ProductSummary[] {
  const q = term.trim().toLowerCase();
  const summary = buildProductSummaryFromData(productsList, locationsList, stockList);
  if (!q) return summary;
  return summary.filter(
    (p) => p.sku.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
  );
}

export default function HomePage() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [localProducts, setLocalProducts] = useState(products);
  const [localLocations, setLocalLocations] = useState(locations);
  const [localStock, setLocalStock] = useState(stock);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const filtered = useMemo(
    () => searchProductsInData(search, localProducts, localLocations, localStock),
    [search, localProducts, localLocations, localStock]
  );
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE),
    [filtered, page]
  );
  const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  return (
    <main className="mx-auto min-h-screen max-w-6xl p-4 md:p-6">
      <section className="mb-6 rounded-3xl border border-slate-200/80 bg-gradient-to-l from-slate-50 via-indigo-50 to-sky-50 p-6 shadow-sm">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">نظام إدارة مستودع ذكي</h1>
        <p className="text-slate-600">بحث بالـ SKU أو الباركود، وتتبع الكميات حسب الموقع مع تنبيه الكمية الحرجة.</p>
      </section>

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${tab === t.key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث بـ SKU أو Barcode أو اسم المنتج"
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 outline-none transition focus:border-indigo-300 focus:bg-white"
            />
            <button className="rounded-xl bg-indigo-600 p-3 text-right font-semibold text-white hover:bg-indigo-700">
              زر السكان (واجهة جاهزة - يربط لاحقًا بالمكتبة)
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {paginated.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{item.name}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === "critical" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}
                  >
                    {item.status === "critical" ? "حرج" : "طبيعي"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  SKU: {item.sku} | Barcode: {item.barcode} | الكمية الإجمالية: {item.totalQty}
                </p>
                <ul className="mt-2 text-sm">
                  {item.locations.map((loc: { locationName: string; qty: number }) => (
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
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-right">
                <th className="border p-2">الاسم</th>
                <th className="border p-2">SKU</th>
                <th className="border p-2">Barcode</th>
                <th className="border p-2">الكمية</th>
                <th className="border p-2">الحالة</th>
                <th className="border p-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {buildProductSummaryFromData(localProducts, localLocations, localStock).map((p) => (
                <tr key={p.id}>
                  <td className="border p-2">{p.name}</td>
                  <td className="border p-2">{p.sku}</td>
                  <td className="border p-2">{p.barcode}</td>
                  <td className="border p-2">{p.totalQty}</td>
                  <td className="border p-2">{p.status === "critical" ? "حرج" : "طبيعي"}</td>
                  <td className="border p-2">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(localProducts.find((product) => product.id === p.id) ?? null)}
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
          <div className="grid gap-4 md:grid-cols-2">
            {localLocations.map((loc) => {
              const stocks = localStock.filter((s) => s.locationId === loc.id);
              return (
                <article key={loc.id} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold">{loc.name}</h3>
                    <button
                      type="button"
                      onClick={() => setEditingLocation(loc)}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
                    >
                      تعديل
                    </button>
                  </div>
                  <p className="mb-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">QR: {loc.qrCode}</p>
                  <ul className="mt-2 text-sm">
                    {stocks.map((s) => {
                      const p = localProducts.find((x) => x.id === s.productId);
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
        <SimpleForm title="إضافة منتج (يدوي / سكان)" fields={["Barcode المنتج", "اسم المنتج", "SKU", "الحد الحرج", "الكمية الحالية", "QR المكان"]} />
      )}
      {tab === "add-location" && <AddLocationForm locationsList={localLocations} onAddLocation={setLocalLocations} />}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(updatedProduct) => {
            setLocalProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
            setEditingProduct(null);
          }}
        />
      )}
      {editingLocation && (
        <EditLocationModal
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSave={(updatedLocation) => {
            setLocalLocations((prev) => prev.map((loc) => (loc.id === updatedLocation.id ? updatedLocation : loc)));
            setEditingLocation(null);
          }}
          onClearStock={(locationId) => {
            setLocalStock((prev) => prev.filter((entry) => entry.locationId !== locationId));
            setEditingLocation(null);
          }}
        />
      )}
    </main>
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
      <button onClick={onPrev} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:opacity-50" disabled={page <= 1}>
        السابق
      </button>
      <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-600">
        صفحة {page} من {maxPage}
      </span>
      <button onClick={onNext} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:opacity-50" disabled={page >= maxPage}>
        التالي
      </button>
    </div>
  );
}

function SimpleForm({ title, fields }: { title: string; fields: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <form className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <input key={field} placeholder={field} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 outline-none focus:border-indigo-300 focus:bg-white" />
        ))}
        <button type="button" className="col-span-full rounded-xl bg-indigo-600 p-3 font-semibold text-white hover:bg-indigo-700">
          حفظ
        </button>
      </form>
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
  onSave: (updatedProduct: Product) => void;
}) {
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [barcode, setBarcode] = useState(product.barcode);
  const [criticalQty, setCriticalQty] = useState(String(product.criticalQty));
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim() || !sku.trim() || !barcode.trim() || !criticalQty.trim()) {
      setError("الرجاء تعبئة جميع الحقول");
      return;
    }
    const qtyValue = Number(criticalQty);
    if (!Number.isFinite(qtyValue) || qtyValue < 0) {
      setError("الحد الحرج يجب أن يكون رقمًا صحيحًا");
      return;
    }
    onSave({
      ...product,
      name: name.trim(),
      sku: sku.trim(),
      barcode: barcode.trim(),
      criticalQty: Math.floor(qtyValue)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold">تعديل المنتج</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المنتج" className="rounded-lg border p-3" />
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" className="rounded-lg border p-3" />
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barcode" className="rounded-lg border p-3" />
          <input
            value={criticalQty}
            onChange={(e) => setCriticalQty(e.target.value)}
            placeholder="الحد الحرج"
            type="number"
            min={0}
            className="rounded-lg border p-3"
          />
        </div>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={handleSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            حفظ
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">
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
  onClearStock
}: {
  location: Location;
  onClose: () => void;
  onSave: (updatedLocation: Location) => void;
  onClearStock: (locationId: string) => void;
}) {
  const [name, setName] = useState(location.name);
  const [qrCode, setQrCode] = useState(location.qrCode);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim() || !qrCode.trim()) {
      setError("الرجاء تعبئة اسم المكان و QR Code");
      return;
    }
    onSave({
      ...location,
      name: name.trim(),
      qrCode: qrCode.trim().toUpperCase()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold">تعديل المكان</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المكان" className="rounded-lg border p-3" />
          <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="QR Code" className="rounded-lg border p-3" />
        </div>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={handleSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            حفظ
          </button>
          <button type="button" onClick={() => onClearStock(location.id)} className="rounded-lg bg-red-700 px-4 py-2 text-white">
            تفريغ المكان
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function AddLocationForm({
  locationsList,
  onAddLocation
}: {
  locationsList: typeof locations;
  onAddLocation: (value: ((prev: typeof locations) => typeof locations) | typeof locations) => void;
}) {
  const [name, setName] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedQr = qrCode.trim().toUpperCase();

    if (!trimmedName || !trimmedQr) {
      setError("الرجاء تعبئة اسم المكان و QR Code");
      setSuccess("");
      return;
    }

    const duplicateName = locationsList.some((loc) => loc.name.toLowerCase() === trimmedName.toLowerCase());
    const duplicateQr = locationsList.some((loc) => loc.qrCode.toLowerCase() === trimmedQr.toLowerCase());
    if (duplicateName || duplicateQr) {
      setError("هذا المكان أو كود QR موجود مسبقًا");
      setSuccess("");
      return;
    }

    const newLocation = {
      id: `l${locationsList.length + 1}`,
      name: trimmedName,
      qrCode: trimmedQr
    };

    onAddLocation((prev) => [...prev, newLocation]);
    setName("");
    setQrCode("");
    setError("");
    setSuccess("تمت إضافة المكان بنجاح");
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold">إضافة مكان</h2>
      <form
        className="grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المكان" className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 outline-none focus:border-indigo-300 focus:bg-white" />
        <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="QR Code" className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 outline-none focus:border-indigo-300 focus:bg-white" />
        <button type="submit" className="col-span-full rounded-xl bg-indigo-600 p-3 font-semibold text-white hover:bg-indigo-700">
          إضافة المكان
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="mt-2 text-sm text-green-700">{success}</p> : null}
    </section>
  );
}
