"use client";

import { AddLocationForm } from "@/components/warehouse/AddLocationForm";
import { PageGuard } from "@/components/warehouse/PageGuard";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";

export default function AddLocationPage() {
  const { locationsState, postAction, setScanMessage, scannedLocationQr, scannedLocationQrTick, scanTarget, setScanTarget, canWrite } =
    useWarehouseSession();

  return (
    <PageGuard pageKey="add-location">
      <AddLocationForm
        locationsList={locationsState}
        onAddLocation={async (name, qrCode) => {
          await postAction({ action: "addLocation", payload: { name, qrCode } });
        }}
        onMessage={(message) => setScanMessage(message)}
        scannedQr={scannedLocationQr}
        scannedQrTick={scannedLocationQrTick}
        onStartScan={() => setScanTarget("locationQr")}
        showScanner={scanTarget === "locationQr"}
        onStopScan={() => setScanTarget(null)}
        canWrite={canWrite}
      />
    </PageGuard>
  );
}
