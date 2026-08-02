import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/setup/global-setup.ts"],
    setupFiles: ["./tests/setup/test-db-env.ts", "./tests/setup/seed-configuracoes.ts"],
    // Todos os testes de integração compartilham um único banco de teste (ver global-setup.ts) —
    // evita duas suítes rodando em paralelo contra o mesmo arquivo SQLite.
    fileParallelism: false,
  },
});
