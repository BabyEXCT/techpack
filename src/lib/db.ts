import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { D1Database } from "@cloudflare/workers-types";

// Detect Cloudflare Workers runtime via global `cloudflare`
declare const cloudflare: { env: { DB: D1Database } } | undefined;

const isCloudflare = typeof cloudflare !== "undefined" && cloudflare?.env?.DB;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  if (isCloudflare) {
    const adapter = new PrismaD1(cloudflare.env.DB);
    return new PrismaClient({ adapter });
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
