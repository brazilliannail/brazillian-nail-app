-- Manual migration: mesma classe de correção já aplicada para "clientes" em
-- 20260727094500_restore_clientes_check_constraints e para "atendimentos"/"pagamentos" em
-- 20260729090000_restore_pagamentos_atendimentos_check_constraints — "servicos" nunca teve
-- CHECK nenhum (Prisma não expressa CHECK a partir do schema.prisma para o provider sqlite).
-- Sem isso, nada no banco impedia preço negativo ou duração zero/negativa caso alguma escrita
-- futura pulasse a validação já existente em servicos-actions.ts (createServicoAction/
-- updateServicoAction já rejeitam esses mesmos casos na camada de aplicação).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_servicos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_sequencial" INTEGER NOT NULL,
    "nome_pt" TEXT NOT NULL,
    "nome_en" TEXT,
    "categoria" TEXT NOT NULL,
    "descricao_pt" TEXT NOT NULL DEFAULT '',
    "descricao_en" TEXT NOT NULL DEFAULT '',
    "preco_padrao" REAL NOT NULL CHECK ("preco_padrao" >= 0),
    "preco_variavel" BOOLEAN NOT NULL DEFAULT false,
    "preco_minimo" REAL CHECK ("preco_minimo" IS NULL OR "preco_minimo" >= 0),
    "preco_maximo" REAL CHECK ("preco_maximo" IS NULL OR "preco_maximo" >= 0),
    "duracao_padrao_min" INTEGER NOT NULL CHECK ("duracao_padrao_min" > 0),
    "duracao_minima_min" INTEGER CHECK ("duracao_minima_min" IS NULL OR "duracao_minima_min" > 0),
    "duracao_maxima_min" INTEGER CHECK ("duracao_maxima_min" IS NULL OR "duracao_maxima_min" > 0),
    "retorno_sugerido_dias" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_servicos" SELECT * FROM "servicos";
DROP TABLE "servicos";
ALTER TABLE "new_servicos" RENAME TO "servicos";
CREATE UNIQUE INDEX "servicos_numero_sequencial_key" ON "servicos"("numero_sequencial");
CREATE INDEX "servicos_status_idx" ON "servicos"("status");
CREATE INDEX "servicos_categoria_idx" ON "servicos"("categoria");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
