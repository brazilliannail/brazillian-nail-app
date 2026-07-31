import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { assertTestDatabaseUrl } from "../../scripts/lib/assert-test-db.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Mesmo arquivo usado por tests/setup/test-db-env.ts (setupFiles) — precisam apontar para o
// mesmo banco. Nome dedicado (não `brazillian-nail-test.db`) para não colidir com o banco usado
// por `npm run dev:test` / `db:test:setup`.
export const TEST_DATABASE_URL = "file:./prisma/test-db/brazillian-nail-vitest.db";

export default function setup() {
  const resolvedDbPath = assertTestDatabaseUrl(TEST_DATABASE_URL, projectRoot);

  // Começa sempre de um banco limpo: migrations aplicadas do zero validam que elas rodam
  // sem erro (mesmo caminho usado em produção), pegando o tipo de regressão de schema que
  // uma cópia reaproveitada do banco esconderia.
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${resolvedDbPath}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
    shell: true,
  });

  // Sem cleanup no teardown: o próximo `setup()` já apaga o banco antes de recriá-lo,
  // e manter o arquivo após a run ajuda a inspecionar falhas localmente.
  return () => {};
}
