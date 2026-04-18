"use client";

export function ScannerView({ title, onStop }: { title: string; onStop: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-white p-4 shadow-inner ring-1 ring-violet-100/50">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-violet-900">{title}</p>
        <button
          type="button"
          onClick={onStop}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          إيقاف
        </button>
      </div>
      <div id="scanner-region" className="aspect-video max-h-[min(52vh,420px)] overflow-hidden rounded-xl bg-slate-900 shadow-lg ring-2 ring-slate-800/20" />
    </div>
  );
}
