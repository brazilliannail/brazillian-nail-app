import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";

// Precisa rodar antes de qualquer teste importar "@/lib/db". Assim, os testes usam PostgreSQL
// em memória e nunca acessam o banco Neon nem o banco local com dados reais.
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/brazillian_nail_test";

const memoryDb = new PGlite();
const migrationPath = path.resolve(
  process.cwd(),
  "prisma/migrations/20260804012000_postgresql_baseline/migration.sql",
);
const migrationSql = fs
  .readFileSync(migrationPath, "utf8")
  .replace('CREATE SCHEMA IF NOT EXISTS "public";', "");

await memoryDb.exec(migrationSql);

const testGlobal = globalThis as unknown as { brazillianNailTestAdapter?: unknown };
testGlobal.brazillianNailTestAdapter = new PrismaPGlite(memoryDb);
