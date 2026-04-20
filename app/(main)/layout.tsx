import { WarehouseSessionProvider } from "@/contexts/WarehouseSessionContext";
import { AppShell } from "@/components/warehouse/AppShell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <WarehouseSessionProvider>
      <AppShell>{children}</AppShell>
    </WarehouseSessionProvider>
  );
}
