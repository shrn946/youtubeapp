import "server-only";
import { PrismaClient } from "@/lib/generated/prisma";

const globalPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient();
}

export const prisma = globalPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalPrisma.prisma = prisma;
