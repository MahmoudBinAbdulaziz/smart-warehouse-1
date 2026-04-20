"use client";

export type StatsBarDatum = { id: string; label: string; sublabel?: string; value: number };

type Props = {
  items: StatsBarDatum[];
  /** suffix after number e.g. "وحدة" */
  valueSuffix?: string;
  barClass: string;
  emptyHint?: string;
};

export function StatsHorizontalBars({ items, valueSuffix = "", barClass, emptyHint }: Props) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyHint ?? "لا توجد بيانات كافية."}</p>;
  }
  return (
    <div className="space-y-4">
      {items.map((row) => (
        <div key={row.id}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <div className="min-w-0 flex-1 truncate">
              <span className="font-medium text-slate-800" title={row.label}>
                {row.label}
              </span>
              {row.sublabel ? (
                <span className="mr-2 block truncate text-xs text-slate-500 sm:inline sm:truncate" title={row.sublabel}>
                  {row.sublabel}
                </span>
              ) : null}
            </div>
            <span className="shrink-0 tabular-nums font-semibold text-slate-900">
              {row.value}
              {valueSuffix ? <span className="mr-1 font-normal text-slate-500">{valueSuffix}</span> : null}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-3 min-w-[2px] rounded-full transition-[width] duration-500 ${barClass}`}
              style={{ width: `${Math.min(100, (row.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
