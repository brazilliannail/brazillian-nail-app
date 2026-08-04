-- Pagamentos vira livro-razão (1:N com atendimentos), com `natureza` (servico/gorjeta) e
-- `tipo` (entrada/estorno) como eixos independentes. `gorjeta`/`valor_recebido`/`forma_pagamento`
-- saem de `atendimentos` (deixam de ser fonte de verdade — passam a ser derivados de `pagamentos`).
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_atendimentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cliente_id" TEXT NOT NULL,
    "agendamento_id" TEXT,
    "profissional" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "horario_inicio" TEXT NOT NULL,
    "horario_fim" TEXT,
    "duracao_min" INTEGER,
    "desconto" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'emAndamento',
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "retorno_sugerido_dias" INTEGER,
    "proximo_agendamento_id" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL,
    CONSTRAINT "atendimentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "atendimentos_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "atendimentos_proximo_agendamento_id_fkey" FOREIGN KEY ("proximo_agendamento_id") REFERENCES "agendamentos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_atendimentos" ("agendamento_id", "atualizado_em", "cliente_id", "criado_em", "data", "desconto", "duracao_min", "horario_fim", "horario_inicio", "id", "observacoes_en", "observacoes_pt", "profissional", "proximo_agendamento_id", "retorno_sugerido_dias", "status") SELECT "agendamento_id", "atualizado_em", "cliente_id", "criado_em", "data", "desconto", "duracao_min", "horario_fim", "horario_inicio", "id", "observacoes_en", "observacoes_pt", "profissional", "proximo_agendamento_id", "retorno_sugerido_dias", "status" FROM "atendimentos";
DROP TABLE "atendimentos";
ALTER TABLE "new_atendimentos" RENAME TO "atendimentos";
CREATE INDEX "atendimentos_cliente_id_data_idx" ON "atendimentos"("cliente_id", "data");
CREATE INDEX "atendimentos_data_idx" ON "atendimentos"("data");
CREATE INDEX "atendimentos_status_idx" ON "atendimentos"("status");
CREATE TABLE "new_pagamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atendimento_id" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data_pagamento" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "estorna_pagamento_id" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagamentos_atendimento_id_fkey" FOREIGN KEY ("atendimento_id") REFERENCES "atendimentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pagamentos_estorna_pagamento_id_fkey" FOREIGN KEY ("estorna_pagamento_id") REFERENCES "pagamentos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_pagamentos" ("atendimento_id", "data_pagamento", "forma_pagamento", "id", "observacoes_en", "observacoes_pt") SELECT "atendimento_id", "data_pagamento", "forma_pagamento", "id", "observacoes_en", "observacoes_pt" FROM "pagamentos";
DROP TABLE "pagamentos";
ALTER TABLE "new_pagamentos" RENAME TO "pagamentos";
CREATE INDEX "pagamentos_atendimento_id_natureza_idx" ON "pagamentos"("atendimento_id", "natureza");
CREATE INDEX "pagamentos_data_pagamento_idx" ON "pagamentos"("data_pagamento");
CREATE INDEX "pagamentos_forma_pagamento_idx" ON "pagamentos"("forma_pagamento");

-- Backfill manual (ainda com FKs suspensas pelo bloco de RedefineTables acima): os únicos 3
-- lançamentos reais que existiam como colunas em `atendimentos` antes desta migration (valores
-- capturados por consulta direta ao banco antes da alteração, já que a tabela `pagamentos`
-- antiga estava vazia). Sem isso, o histórico/saldo desses atendimentos já finalizados
-- apareceria como "nada recebido" depois da migration. Fica antes do PRAGMA foreign_keys=ON
-- de propósito, para não quebrar o shadow database (schema vazio, sem os atendimentos ATD-*)
-- usado por `prisma migrate dev`/`diff` em execuções futuras.
INSERT INTO "pagamentos" ("id", "atendimento_id", "natureza", "tipo", "data_pagamento", "valor", "forma_pagamento", "observacoes_pt", "observacoes_en", "estorna_pagamento_id", "criado_em")
VALUES
  ('PAG-000001', 'ATD-000002', 'servico', 'entrada', '2026-07-14', 40.0, 'cartaoCredito', '', '', NULL, CURRENT_TIMESTAMP),
  ('PAG-000002', 'ATD-000002', 'gorjeta', 'entrada', '2026-07-14', 10.0, 'cartaoCredito', '', '', NULL, CURRENT_TIMESTAMP),
  ('PAG-000003', 'ATD-000003', 'servico', 'entrada', '2026-07-13', 65.0, 'dinheiro', '', '', NULL, CURRENT_TIMESTAMP);

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
