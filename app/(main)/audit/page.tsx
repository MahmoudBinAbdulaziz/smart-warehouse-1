"use client";

import { PageGuard } from "@/components/warehouse/PageGuard";
import { WarehouseAuditPage } from "@/components/warehouse/pages/WarehouseAuditPage";

export default function AuditPage() {
  return (
    <PageGuard pageKey="audit">
      <WarehouseAuditPage />
    </PageGuard>
  );
}
