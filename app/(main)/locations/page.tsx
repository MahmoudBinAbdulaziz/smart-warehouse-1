"use client";

import { LocationsTab } from "@/components/warehouse/tabs/LocationsTab";
import { PageGuard } from "@/components/warehouse/PageGuard";
import { EditLocationModal } from "@/components/warehouse/EditLocationModal";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";

export default function LocationsPage() {
  const {
    locationsState,
    stockState,
    productsState,
    canWrite,
    editingLocation,
    setEditingLocation,
    postAction,
    setScanMessage
  } = useWarehouseSession();

  return (
    <PageGuard pageKey="locations">
      <LocationsTab
        locations={locationsState}
        stock={stockState}
        products={productsState}
        canWrite={canWrite}
        onEditLocation={setEditingLocation}
      />
      {editingLocation && (
        <EditLocationModal
          location={editingLocation}
          canWrite={canWrite}
          onClose={() => setEditingLocation(null)}
          onSave={async (updatedLocation) => {
            try {
              await postAction({
                action: "updateLocation",
                payload: {
                  id: updatedLocation.id,
                  name: updatedLocation.name,
                  qrCode: updatedLocation.qrCode
                }
              });
              setScanMessage("تم تعديل المكان بنجاح.");
            } catch {
              setScanMessage("فشل تعديل المكان.");
            } finally {
              setEditingLocation(null);
            }
          }}
          onClearLocation={async (locationId) => {
            try {
              await postAction({ action: "clearLocationStock", payload: { locationId } });
              setScanMessage("تم تفريغ المكان من جميع المنتجات.");
            } catch {
              setScanMessage("فشل تفريغ المكان.");
            } finally {
              setEditingLocation(null);
            }
          }}
        />
      )}
    </PageGuard>
  );
}
