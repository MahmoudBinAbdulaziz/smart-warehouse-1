"use client";

import { ProductsTab } from "@/components/warehouse/tabs/ProductsTab";
import { PageGuard } from "@/components/warehouse/PageGuard";
import { EditProductModal } from "@/components/warehouse/EditProductModal";
import { useWarehouseSession } from "@/contexts/WarehouseSessionContext";
import { useLocale } from "@/contexts/LocaleContext";

export default function ProductsPage() {
  const { t } = useLocale();
  const {
    summaries,
    canWrite,
    editingProduct,
    setEditingProduct,
    productsState,
    postAction,
    setScanMessage
  } = useWarehouseSession();

  return (
    <PageGuard pageKey="products">
      <ProductsTab
        summaries={summaries}
        canWrite={canWrite}
        onEditProductId={(id) => setEditingProduct(productsState.find((item) => item.id === id) ?? null)}
      />
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          canWrite={canWrite}
          onClose={() => setEditingProduct(null)}
          onSave={async (updatedProduct) => {
            try {
              await postAction({
                action: "updateProduct",
                payload: {
                  id: updatedProduct.id,
                  name: updatedProduct.name,
                  sku: updatedProduct.sku,
                  barcode: updatedProduct.barcode,
                  criticalQty: updatedProduct.criticalQty,
                  expiresAt: updatedProduct.expiresAt,
                  expiryAlertDaysBefore: updatedProduct.expiryAlertDaysBefore
                }
              });
              setScanMessage(t("products_toast_edit_ok"));
            } catch {
              setScanMessage(t("products_toast_edit_fail"));
            } finally {
              setEditingProduct(null);
            }
          }}
        />
      )}
    </PageGuard>
  );
}
