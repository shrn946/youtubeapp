import "server-only";
import { PrismaClient } from "@/lib/generated/prisma";

const globalPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const getPrisma = () => {
  if (!globalPrisma.prisma) {
    globalPrisma.prisma = new PrismaClient();
  }
  return globalPrisma.prisma;
};

// Use a Proxy to delay instantiation until the first property access
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    const instance = getPrisma();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});
