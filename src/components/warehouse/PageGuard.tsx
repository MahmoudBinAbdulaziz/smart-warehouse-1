"use client";

import type { ReactNode } from "react";
import type { AppPageKey } from "@/lib/app-pages";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";
import { useLocale } from "@/contexts/LocaleContext";

export function PageGuard({ pageKey, children }: { pageKey: AppPageKey | "admin"; children: ReactNode }) {
  const { canAccessPage } = useWarehouseSession();
  const { t } = useLocale();
  if (!canAccessPage(pageKey)) {
    return (
      <section className="wh-card p-8 text-center">
        <p className="font-semibold text-slate-900">{t("pageGuard_title")}</p>
        <p className="mt-2 text-sm text-slate-500">{t("pageGuard_subtitle")}</p>
      </section>
    );
  }
  return <>{children}</>;
}
