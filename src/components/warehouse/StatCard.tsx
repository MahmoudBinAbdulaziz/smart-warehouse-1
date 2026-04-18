"use client";

type Accent = "violet" | "teal";

export function StatCard({
  label,
  value,
  danger,
  accent = "violet"
}: {
  label: string;
  value: number;
  danger?: boolean;
  accent?: Accent;
}) {
  if (danger) {
    return (
      <article className="relative overflow-hidden rounded-2xl border border-rose-100 bg-white p-5 shadow-soft transition hover:shadow-md">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-rose-400 to-rose-500" />
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-4xl font-extrabold tabular-nums text-rose-600">{value}</p>
        <p className="mt-2 text-xs text-rose-500/90">يتطلب متابعة</p>
      </article>
    );
  }

  const bar = accent === "teal" ? "from-teal-400 to-teal-600" : "from-violet-400 to-violet-600";
  const num = accent === "teal" ? "text-teal-700" : "text-violet-700";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-100/90 bg-white p-5 shadow-soft ring-1 ring-slate-200/30 transition hover:-translate-y-0.5 hover:shadow-soft-lg">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${bar}`} />
      <div
        className={`pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full opacity-40 blur-2xl ${
          accent === "teal" ? "bg-teal-400" : "bg-violet-400"
        }`}
      />
      <p className="relative text-sm font-medium text-slate-500">{label}</p>
      <p className={`relative mt-2 text-4xl font-extrabold tabular-nums ${num}`}>{value}</p>
    </article>
  );
}
