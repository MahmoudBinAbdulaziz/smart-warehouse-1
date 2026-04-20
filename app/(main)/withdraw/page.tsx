"use client";

import { WithdrawTab } from "@/components/warehouse/tabs/WithdrawTab";
import { PageGuard } from "@/components/warehouse/PageGuard";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";

export default function WithdrawPage() {
  const {
    withdrawSearch,
    setWithdrawSearch,
    scanTarget,
    setScanTarget,
    withdrawMsg,
    withdrawProduct,
    withdrawNeeded,
    setWithdrawNeeded,
    withdrawNeededNum,
    withdrawDeficit,
    withdrawTotalAvailable,
    withdrawSumAllocated,
    withdrawStockEntries,
    withdrawAlloc,
    setWithdrawAlloc,
    canWrite,
    handleWithdrawLookup,
    handleWithdrawAutoFill,
    handleWithdrawConfirm
  } = useWarehouseSession();

  return (
    <PageGuard pageKey="withdraw">
      <WithdrawTab
        withdrawSearch={withdrawSearch}
        onWithdrawSearchChange={setWithdrawSearch}
        onLookup={handleWithdrawLookup}
        onStartWithdrawScan={() => setScanTarget("withdrawBarcode")}
        showScanner={scanTarget === "withdrawBarcode"}
        onStopScan={() => setScanTarget(null)}
        withdrawMsg={withdrawMsg}
        withdrawProduct={withdrawProduct}
        withdrawNeeded={withdrawNeeded}
        onWithdrawNeededChange={setWithdrawNeeded}
        withdrawNeededNum={withdrawNeededNum}
        withdrawDeficit={withdrawDeficit}
        withdrawTotalAvailable={withdrawTotalAvailable}
        withdrawSumAllocated={withdrawSumAllocated}
        withdrawStockEntries={withdrawStockEntries}
        withdrawAlloc={withdrawAlloc}
        onAllocChange={(locationId, value) =>
          setWithdrawAlloc((prev) => ({
            ...prev,
            [locationId]: value
          }))
        }
        onAutoFill={handleWithdrawAutoFill}
        onConfirm={handleWithdrawConfirm}
        canWrite={canWrite}
      />
    </PageGuard>
  );
}
