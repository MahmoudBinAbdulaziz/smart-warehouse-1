import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type GlobalPrisma = typeof globalThis & { __sw_prisma?: PrismaClient; __sw_prisma_gen_mtime?: number };

const globalForPrisma = globalThis as GlobalPrisma;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });

/** After `prisma generate`, the engine files under .prisma/client change; dev singleton may still be the old client. */
function generatedEngineMtime(): number {
  try {
    const marker = path.join(process.cwd(), "node_modules", ".prisma", "client", "default.js");
    return fs.statSync(marker).mtimeMs;
  } catch {
    return 0;
  }
}

const genMtime = generatedEngineMtime();
if (process.env.NODE_ENV !== "production") {
  if (globalForPrisma.__sw_prisma_gen_mtime !== undefined && globalForPrisma.__sw_prisma_gen_mtime !== genMtime) {
    void globalForPrisma.__sw_prisma?.$disconnect().catch(() => {});
    globalForPrisma.__sw_prisma = undefined;
  }
  globalForPrisma.__sw_prisma_gen_mtime = genMtime;
}

export const prisma = globalForPrisma.__sw_prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__sw_prisma = prisma;
} else if (!globalForPrisma.__sw_prisma) {
  globalForPrisma.__sw_prisma = prisma;
}
