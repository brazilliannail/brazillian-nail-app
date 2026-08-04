import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";

// Precisa rodar antes de qualquer teste importar "@/lib/db". Assim, os testes usam PostgreSQL
// em memória e nunca acessam o banco Neon nem o banco local com dados reais.
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/brazillian_nail_test";

const memoryDb = new PGlite();
const migrationsDir = path.resolve(process.cwd(), "prisma/migrations");
const migrationFolders = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const folder of migrationFolders) {
  const migrationSql = fs
    .readFileSync(path.join(migrationsDir, folder, "migration.sql"), "utf8")
    .replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
  await memoryDb.exec(migrationSql);
}

const testGlobal = globalThis as unknown as { brazillianNailTestAdapter?: unknown };
testGlobal.brazillianNailTestAdapter = new PrismaPGlite(memoryDb);
