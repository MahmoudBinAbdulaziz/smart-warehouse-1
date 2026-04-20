import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { LocaleProvider } from "@/contexts/LocaleContext";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Smart Warehouse",
  description: "Warehouse and inventory management with barcode scanning"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <body className={`${cairo.className} selection:bg-violet-200/80 selection:text-violet-950`}>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
