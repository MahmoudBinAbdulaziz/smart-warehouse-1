-- Optional product expiry + alert window (days before end date)
ALTER TABLE "Product" ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "expiryAlertDaysBefore" INTEGER NOT NULL DEFAULT 30;
