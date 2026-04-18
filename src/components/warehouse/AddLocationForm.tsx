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
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold">إضافة مكان جديد</h2>
      <button
        type="button"
        onClick={() => {
          setError("");
          setSuccess("");
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
      {success ? <p className="mt-2 text-sm text-green-700">{success}</p> : null}
    </section>
  );
}
