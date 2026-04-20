"use client";

import { AddProductTab } from "@/components/warehouse/tabs/AddProductTab";
import { PageGuard } from "@/components/warehouse/PageGuard";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";

export default function AddProductPage() {
  const {
    formData,
    setFormData,
    scanMessage,
    scanTarget,
    setScanTarget,
    canWrite,
    handleSaveProduct
  } = useWarehouseSession();

  return (
    <PageGuard pageKey="add-product">
      <AddProductTab
        formData={formData}
        setFormData={setFormData}
        scanMessage={scanMessage}
        showScanner={scanTarget === "productBarcode" || scanTarget === "locationQr"}
        onStartProductBarcodeScan={() => setScanTarget("productBarcode")}
        onStartLocationQrScan={() => setScanTarget("locationQr")}
        onStopScan={() => setScanTarget(null)}
        onSave={handleSaveProduct}
        canWrite={canWrite}
      />
    </PageGuard>
  );
}
