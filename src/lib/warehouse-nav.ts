import type { AppPageKey } from "@/lib/app-pages";
import type { MessageKey } from "@/i18n/messages";

export type NavItem = { href: string; pageKey: AppPageKey | "admin"; labelKey: MessageKey };

export const WAREHOUSE_NAV: NavItem[] = [
  { href: "/dashboard", pageKey: "dashboard", labelKey: "nav_dashboard" },
  { href: "/products", pageKey: "products", labelKey: "nav_products" },
  { href: "/locations", pageKey: "locations", labelKey: "nav_locations" },
  { href: "/withdraw", pageKey: "withdraw", labelKey: "nav_withdraw" },
  { href: "/add-product", pageKey: "add-product", labelKey: "nav_add_product" },
  { href: "/add-location", pageKey: "add-location", labelKey: "nav_add_location" },
  { href: "/statistics", pageKey: "statistics", labelKey: "nav_statistics" },
  { href: "/audit", pageKey: "audit", labelKey: "nav_audit" }
];

export const ADMIN_NAV_ITEM: NavItem = { href: "/admin", pageKey: "admin", labelKey: "nav_admin" };
