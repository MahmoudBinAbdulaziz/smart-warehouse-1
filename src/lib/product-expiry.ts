/** Parse `YYYY-MM-DD` from date input to stable UTC noon (that calendar day). */
export function parseExpiryDateInput(isoDate: string): Date | null {
  const t = isoDate.trim();
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const [y, m, d] = t.split("-").map(Number);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

export function formatExpiryInputFromDb(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Whole days from `from` calendar day to `to` calendar day (can be negative). */
export function calendarDaysBetween(from: Date, to: Date): number {
  const a = utcDayStart(from).getTime();
  const b = utcDayStart(to).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export type ExpiryUiKind = "none" | "ok" | "soon" | "expired";

export function classifyExpiry(expiresAt: Date | null, alertDaysBefore: number, now = new Date()): { kind: ExpiryUiKind; daysLeft: number | null } {
  if (!expiresAt) return { kind: "none", daysLeft: null };
  const daysLeft = calendarDaysBetween(now, expiresAt);
  if (daysLeft < 0) return { kind: "expired", daysLeft };
  const alert = Math.max(0, Math.floor(alertDaysBefore));
  if (daysLeft <= alert) return { kind: "soon", daysLeft };
  return { kind: "ok", daysLeft };
}
