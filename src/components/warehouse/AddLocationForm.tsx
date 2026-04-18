"use client";

import { useEffect, useState } from "react";
import type { Location } from "@/lib/warehouse-types";
import { ScannerView } from "@/components/warehouse/ScannerView";

type Props = {
  locationsList: Location[];
  onAddLocation: (name: string, qrCode: string) => Promise<void>;
  onMessage: (message: string) => void;
  scannedQr: string;
  scannedQrTick: number;
  onStartScan: () => void;
  showScanner: boolean;
  onStopScan: () => void;
};

export function AddLocationForm({
  locationsList,
  onAddLocation,
  onMessage,
  scannedQr,
  scannedQrTick,
  onStartScan,
  showScanner,
  onStopScan
}: Props) {
  const [name, setName] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      setSuccess("");
      return;
    }

    const duplicate = locationsList.some(
      (loc) => loc.name.toLowerCase() === normalizedName.toLowerCase() || loc.qrCode.toLowerCase() === normalizedQr.toLowerCase()
    );
    if (duplicate) {
      setError("المكان أو QR موجود مسبقًا.");
      setSuccess("");
      return;
    }

    try {
      await onAddLocation(normalizedName, normalizedQr);
      setName("");
      setQrCode("");
      setError("");
      setSuccess("تم إضافة المكان بنجاح.");
      onMessage("تم إضافة مكان جديد.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setSuccess("");
      if (message.includes("ALREADY_EXISTS")) {
        setError("هذا الـ QR مستخدم مسبقًا.");
        return;
      }
      setError(`فشل إضافة المكان: ${message || "خطأ غير معروف"}`);
    }
  };

  return (
    <section className="wh-card p-6 md:p-7">
      <div className="mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900">إضافة مكان جديد</h2>
        <p className="mt-1 text-sm text-slate-500">امسح QR أو أدخل البيانات يدويًا</p>
      </div>

      <button
        type="button"
        onClick={() => {
          setError("");
          setSuccess("");
          onStartScan();
        }}
        className="wh-btn-primary mb-5"
      >
        سكان QR للمكان
      </button>

      {showScanner ? <ScannerView title="امسح QR المكان الآن" onStop={onStopScan} /> : null}

      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <div>
          <label className="wh-label">اسم المكان</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المكان" className="wh-input" />
        </div>
        <div>
          <label className="wh-label">QR المكان</label>
          <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="QR المكان" className="wh-input" />
        </div>
        <button type="submit" className="wh-btn-teal col-span-full py-3.5">
          إضافة المكان
        </button>
      </form>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50/95 px-4 py-3 text-sm font-medium text-rose-900">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/95 px-4 py-3 text-sm font-medium text-emerald-900">{success}</p>
      ) : null}
    </section>
  );
}
