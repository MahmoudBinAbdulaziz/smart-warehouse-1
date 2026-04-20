import type { AppPageKey } from "@/lib/app-pages";
import type { MessageKey } from "@/i18n/messages";

const MAP: Record<AppPageKey, MessageKey> = {
  dashboard: "page_dashboard",
  products: "page_products",
  locations: "page_locations",
  withdraw: "page_withdraw",
  "add-product": "page_add_product",
  "add-location": "page_add_location",
  statistics: "page_statistics",
  audit: "page_audit"
};

export function pageLabelKey(page: AppPageKey): MessageKey {
  return MAP[page];
}
