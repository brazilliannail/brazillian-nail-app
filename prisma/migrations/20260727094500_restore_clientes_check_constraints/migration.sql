-- Manual migration: restaura os CHECK constraints de "clientes" que foram
-- descartados pelo rebuild automático da migration anterior (Prisma não
-- expressa CHECK de enum para o provider sqlite a partir do schema.prisma).
-- Também adiciona o CHECK do novo enum reengajamento_status.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_clientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_sequencial" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_preferencia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa' CHECK ("status" IN ('ativa', 'inativa')),
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "avisos_importantes_pt" TEXT NOT NULL DEFAULT '[]',
    "avisos_importantes_en" TEXT NOT NULL DEFAULT '[]',
    "reengajamento_status" TEXT NOT NULL DEFAULT 'nenhum' CHECK ("reengajamento_status" IN ('nenhum', 'contatado', 'adiado', 'ignorado')),
    "reengajamento_atualizado_em" DATETIME,
    "reengajamento_adiado_ate" TEXT,
    "reengajamento_observacao" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);
INSERT INTO "new_clientes" ("id", "numero_sequencial", "nome", "nome_preferencia", "status", "observacoes_pt", "observacoes_en", "avisos_importantes_pt", "avisos_importantes_en", "reengajamento_status", "reengajamento_atualizado_em", "reengajamento_adiado_ate", "reengajamento_observacao", "criado_em", "atualizado_em")
SELECT "id", "numero_sequencial", "nome", "nome_preferencia", "status", "observacoes_pt", "observacoes_en", "avisos_importantes_pt", "avisos_importantes_en", "reengajamento_status", "reengajamento_atualizado_em", "reengajamento_adiado_ate", "reengajamento_observacao", "criado_em", "atualizado_em"
FROM "clientes";
DROP TABLE "clientes";
ALTER TABLE "new_clientes" RENAME TO "clientes";
CREATE UNIQUE INDEX "clientes_numero_sequencial_key" ON "clientes"("numero_sequencial");
CREATE INDEX "clientes_status_idx" ON "clientes"("status");
CREATE INDEX "clientes_nome_idx" ON "clientes"("nome");
CREATE INDEX "clientes_reengajamento_status_idx" ON "clientes"("reengajamento_status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
