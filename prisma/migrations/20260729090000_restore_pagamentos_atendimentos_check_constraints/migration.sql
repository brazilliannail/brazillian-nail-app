-- Manual migration: mesma classe de regressão já corrigida uma vez para "clientes" em
-- 20260727094500_restore_clientes_check_constraints — o rebuild automático de
-- "atendimentos" feito por 20260728120000_pagamentos_ledger (RedefineTables) descartou o
-- CHECK de "status" que existia desde a migration inicial, e a tabela "pagamentos" nunca
-- teve CHECK nenhum para "natureza"/"tipo"/"valor"/"forma_pagamento" (Prisma não expressa
-- CHECK de enum para o provider sqlite a partir do schema.prisma). Sem isso, um lançamento
-- com natureza/tipo/status fora do enum ou valor <= 0 passava direto para o livro-razão.
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
    "status" TEXT NOT NULL DEFAULT 'emAndamento' CHECK ("status" IN ('emAndamento', 'finalizadoPago', 'finalizadoPendente', 'finalizadoParcial', 'finalizadoCortesia', 'cancelado', 'estornado')),
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
INSERT INTO "new_atendimentos" SELECT * FROM "atendimentos";
DROP TABLE "atendimentos";
ALTER TABLE "new_atendimentos" RENAME TO "atendimentos";
CREATE INDEX "atendimentos_cliente_id_data_idx" ON "atendimentos"("cliente_id", "data");
CREATE INDEX "atendimentos_data_idx" ON "atendimentos"("data");
CREATE INDEX "atendimentos_status_idx" ON "atendimentos"("status");

CREATE TABLE "new_pagamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atendimento_id" TEXT NOT NULL,
    "natureza" TEXT NOT NULL CHECK ("natureza" IN ('servico', 'gorjeta')),
    "tipo" TEXT NOT NULL CHECK ("tipo" IN ('entrada', 'estorno')),
    "data_pagamento" TEXT NOT NULL,
    "valor" REAL NOT NULL CHECK ("valor" > 0),
    "forma_pagamento" TEXT CHECK ("forma_pagamento" IS NULL OR "forma_pagamento" IN ('dinheiro', 'cartaoCredito', 'cartaoDebito', 'zelle', 'venmo', 'cashApp', 'cheque', 'outra')),
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "estorna_pagamento_id" TEXT,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagamentos_atendimento_id_fkey" FOREIGN KEY ("atendimento_id") REFERENCES "atendimentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "pagamentos_estorna_pagamento_id_fkey" FOREIGN KEY ("estorna_pagamento_id") REFERENCES "pagamentos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_pagamentos" SELECT * FROM "pagamentos";
DROP TABLE "pagamentos";
ALTER TABLE "new_pagamentos" RENAME TO "pagamentos";
CREATE INDEX "pagamentos_atendimento_id_natureza_idx" ON "pagamentos"("atendimento_id", "natureza");
CREATE INDEX "pagamentos_data_pagamento_idx" ON "pagamentos"("data_pagamento");
CREATE INDEX "pagamentos_forma_pagamento_idx" ON "pagamentos"("forma_pagamento");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
