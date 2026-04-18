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
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-100 pt-5 md:justify-between">
      <button
        type="button"
        onClick={onPrev}
        className="wh-btn-slate min-w-[100px] py-2.5 disabled:opacity-40"
        disabled={page <= 1}
      >
        السابق
      </button>
      <span className="rounded-xl bg-slate-100/90 px-4 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200/60">
        صفحة {page} من {maxPage}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="wh-btn-slate min-w-[100px] py-2.5 disabled:opacity-40"
        disabled={page >= maxPage}
      >
        التالي
      </button>
    </div>
  );
}
