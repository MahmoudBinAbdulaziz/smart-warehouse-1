"use client";

import { useState } from "react";
import type { Location } from "@/lib/warehouse-types";

type Props = {
  location: Location;
  onClose: () => void;
  onSave: (updated: Location) => void;
  onClearLocation: (locationId: string) => void;
  canWrite?: boolean;
};

export function EditLocationModal({ location, onClose, onSave, onClearLocation, canWrite = true }: Props) {
  const [name, setName] = useState(location.name);
  const [qrCode, setQrCode] = useState(location.qrCode);
  const [error, setError] = useState("");

  return (
    <div className="wh-modal" role="dialog" aria-modal="true" aria-labelledby="edit-location-title">
      <div className="wh-modal-panel max-h-[90vh] overflow-y-auto">
        <h3 id="edit-location-title" className="mb-1 text-lg font-bold text-slate-900">
          تعديل المكان
        </h3>
        <p className="mb-5 text-sm text-slate-500">تحديث الاسم أو رمز QR</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="wh-label">اسم المكان</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم المكان"
              disabled={!canWrite}
              className="wh-input disabled:opacity-60"
            />
          </div>
          <div>
            <label className="wh-label">QR المكان</label>
            <input
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="QR المكان"
              disabled={!canWrite}
              className="wh-input disabled:opacity-60"
            />
          </div>
        </div>
        {error ? <p className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50/95 px-4 py-2 text-sm text-rose-900">{error}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (!name.trim() || !qrCode.trim()) {
                setError("يرجى تعبئة اسم المكان وQR.");
                return;
              }
              onSave({ ...location, name: name.trim(), qrCode: qrCode.trim().toUpperCase() });
            }}
            disabled={!canWrite}
            className="wh-btn-primary disabled:opacity-50"
          >
            حفظ
          </button>
          <button
            type="button"
            onClick={() => onClearLocation(location.id)}
            disabled={!canWrite}
            className="wh-btn border border-rose-200 bg-rose-50 text-rose-900 shadow-sm hover:bg-rose-100 disabled:opacity-50"
          >
            تفريغ المكان
          </button>
          <button type="button" onClick={onClose} className="wh-btn-slate">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
