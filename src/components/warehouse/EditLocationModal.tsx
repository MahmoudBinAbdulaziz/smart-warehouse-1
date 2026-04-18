"use client";

import { useState } from "react";
import type { Location } from "@/lib/warehouse-types";

type Props = {
  location: Location;
  onClose: () => void;
  onSave: (updated: Location) => void;
  onClearLocation: (locationId: string) => void;
};

export function EditLocationModal({ location, onClose, onSave, onClearLocation }: Props) {
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
