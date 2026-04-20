"use client";

import { AdminTab } from "@/components/warehouse/tabs/AdminTab";
import { PageGuard } from "@/components/warehouse/PageGuard";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";

export default function AdminPage() {
  const { refreshMeAndWarehouse } = useWarehouseSession();
  return (
    <PageGuard pageKey="admin">
      <AdminTab onRefreshMe={refreshMeAndWarehouse} />
    </PageGuard>
  );
}
