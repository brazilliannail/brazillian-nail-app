import path from "node:path";
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
  console.error(`\n[with-test-db] ${err.message}\n`);
  process.exit(1);
}

console.log(`[with-test-db] Usando banco de teste: ${resolvedDbPath}`);

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("[with-test-db] Uso: node scripts/with-test-db.mjs <comando> [args...]");
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: process.env,
  shell: true,
  cwd: projectRoot,
});

process.exit(result.status ?? 1);
