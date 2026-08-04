import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  brazillianNailTestAdapter?: unknown;
};

const connectionString =
  process.env.DATABASE_POSTGRES_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

if (!globalForPrisma.brazillianNailTestAdapter && !connectionString?.startsWith("postgres")) {
  throw new Error(
    "Banco PostgreSQL não configurado. Defina DATABASE_POSTGRES_URL, POSTGRES_URL ou DATABASE_URL.",
  );
}

const adapter = globalForPrisma.brazillianNailTestAdapter
  ? (globalForPrisma.brazillianNailTestAdapter as PrismaPg)
  : new PrismaPg({ connectionString: connectionString! });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
