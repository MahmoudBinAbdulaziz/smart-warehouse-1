"use client";

export function StatCard({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${danger ? "text-rose-600" : "text-indigo-700"}`}>{value}</p>
    </article>
  );
}
