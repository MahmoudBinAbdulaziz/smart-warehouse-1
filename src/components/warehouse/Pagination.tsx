"use client";

export function Pagination({
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
