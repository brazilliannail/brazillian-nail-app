import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/test-db-env.ts", "./tests/setup/seed-configuracoes.ts"],
    // Cada arquivo usa um PostgreSQL efêmero em memória, inicializado em test-db-env.ts.
    fileParallelism: false,
  },
});
