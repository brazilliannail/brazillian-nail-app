-- Módulo "Despesas e saldo real" (EXPENSES_DESIGN.md). Duas tabelas novas; nenhuma tabela
-- existente é alterada, nenhum dado retroativo é inserido.

-- CreateTable
CREATE TABLE "despesas" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor_total_centavos" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "parcelas" INTEGER,
    "dia_semana" INTEGER,
    "data_encerramento" TEXT,
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos_despesa" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "despesa_id" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "vencimento" TEXT NOT NULL,
    "numero_parcela" INTEGER,
    "total_parcelas" INTEGER,
    "valor_centavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "data_pagamento" TEXT,
    "forma_pagamento" TEXT,
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "ajusta_lancamento_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lancamentos_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "despesas_numero_sequencial_key" ON "despesas"("numero_sequencial");

-- CreateIndex
CREATE INDEX "despesas_status_idx" ON "despesas"("status");

-- CreateIndex
CREATE INDEX "despesas_categoria_idx" ON "despesas"("categoria");

-- CreateIndex
CREATE INDEX "despesas_tipo_idx" ON "despesas"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "lancamentos_despesa_numero_sequencial_key" ON "lancamentos_despesa"("numero_sequencial");

-- CreateIndex
CREATE INDEX "lancamentos_despesa_despesa_id_idx" ON "lancamentos_despesa"("despesa_id");

-- CreateIndex
CREATE INDEX "lancamentos_despesa_vencimento_idx" ON "lancamentos_despesa"("vencimento");

-- CreateIndex
CREATE INDEX "lancamentos_despesa_status_idx" ON "lancamentos_despesa"("status");

-- AddForeignKey
-- RESTRICT: uma despesa nunca pode apagar seus lançamentos (a aplicação nunca deleta despesas,
-- só marca `status = 'cancelada'' — ver cancelarDespesaAction).
ALTER TABLE "lancamentos_despesa" ADD CONSTRAINT "lancamentos_despesa_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- RESTRICT (não SET NULL): o vínculo de auditoria de um lançamento de ajuste com o lançamento
-- original nunca pode desaparecer silenciosamente.
ALTER TABLE "lancamentos_despesa" ADD CONSTRAINT "lancamentos_despesa_ajusta_lancamento_id_fkey" FOREIGN KEY ("ajusta_lancamento_id") REFERENCES "lancamentos_despesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CheckConstraint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_tipo_check" CHECK ("tipo" IN ('avulsa', 'recorrente', 'parcelada'));
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_categoria_check" CHECK ("categoria" IN ('aluguel', 'contasFixas', 'comprasEquipamentos', 'servicosProfissionais', 'marketing', 'outros'));
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_status_check" CHECK ("status" IN ('ativa', 'encerrada', 'cancelada'));
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_valor_total_check" CHECK ("valor_total_centavos" > 0);
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_parcelas_check" CHECK ("parcelas" IS NULL OR "parcelas" > 0);
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_dia_semana_check" CHECK ("dia_semana" IS NULL OR ("dia_semana" >= 0 AND "dia_semana" <= 6));

ALTER TABLE "lancamentos_despesa" ADD CONSTRAINT "lancamentos_despesa_status_check" CHECK ("status" IN ('pendente', 'pago', 'cancelado'));
ALTER TABLE "lancamentos_despesa" ADD CONSTRAINT "lancamentos_despesa_forma_check" CHECK ("forma_pagamento" IS NULL OR "forma_pagamento" IN ('dinheiro', 'cartaoCredito', 'cartaoDebito', 'zelle', 'venmo', 'cashApp', 'cheque', 'outra'));
-- Reforçado no próprio banco (não só na aplicação): um lançamento comum (sem `ajusta_lancamento_id`)
-- precisa ter valor positivo; valor negativo só é aceito quando é, de fato, um ajuste
-- (`ajusta_lancamento_id` preenchido) — e todo ajuste nasce já `pago` (nunca fica pendente/cancelado).
ALTER TABLE "lancamentos_despesa" ADD CONSTRAINT "lancamentos_despesa_valor_check" CHECK (
  ("ajusta_lancamento_id" IS NULL AND "valor_centavos" > 0)
  OR ("ajusta_lancamento_id" IS NOT NULL AND "valor_centavos" <> 0 AND "status" = 'pago')
);
ALTER TABLE "lancamentos_despesa" ADD CONSTRAINT "lancamentos_despesa_numero_parcela_check" CHECK ("numero_parcela" IS NULL OR "numero_parcela" > 0);
