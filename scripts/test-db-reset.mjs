import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { assertTestDatabaseUrl } from "./lib/assert-test-db.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

config({ path: path.join(projectRoot, ".env.testing"), override: true });

let resolvedDbPath;
try {
  resolvedDbPath = assertTestDatabaseUrl(process.env.DATABASE_URL, projectRoot);
} catch (err) {
  console.error(`\n[test-db-reset] ${err.message}\n`);
  process.exit(1);
}

for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  const file = `${resolvedDbPath}${suffix}`;
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`[test-db-reset] Removido: ${file}`);
  }
}

console.log(`[test-db-reset] Recriando banco de teste em: ${resolvedDbPath}`);

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
  cwd: projectRoot,
});

process.exit(result.status ?? 1);
