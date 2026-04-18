"use client";

export function ScannerView({ title, onStop }: { title: string; onStop: () => void }) {
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
