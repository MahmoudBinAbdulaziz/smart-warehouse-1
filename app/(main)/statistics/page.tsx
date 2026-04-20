"use client";

import { PageGuard } from "@/components/warehouse/PageGuard";
import { WarehouseStatisticsPage } from "@/components/warehouse/pages/WarehouseStatisticsPage";

export default function StatisticsPage() {
  return (
    <PageGuard pageKey="statistics">
      <WarehouseStatisticsPage />
    </PageGuard>
  );
}
