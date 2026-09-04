-- Origem rastreável dos retornos gerados por "Próximos Retornos" (Fase 5B+).
--
-- Objetivo único: impedir que a MESMA proposta (mesmo atendimento concluído + mesmo serviço de
-- origem) gere um segundo agendamento de retorno quando a conclusão/confirmação for repetida
-- (duplo clique, reabrir a prévia, reconcluir um atendimento estornado). A deduplicação é por
-- ORIGEM (atendimento_origem_id + servico_origem_id), nunca por nome/data/horário — dois retornos
-- podem legitimamente cair no mesmo dia e horário.
--
-- Aditiva: cria só uma tabela nova + índices. Nenhuma linha existente é alterada; nenhum
-- agendamento existente é tocado. Todas as FKs são RESTRICT (segunda camada de proteção: a
-- aplicação nunca deleta atendimento/serviço/agendamento).
--
-- `agendamento_id` é indexado, NÃO único: no modo "agendamento combinado" (Fase 5C) dois serviços
-- de origem viram duas linhas apontando para o mesmo agendamento.
--
-- Migration criada e validada apenas localmente (suíte de integração roda todas as migrations do
-- zero num PostgreSQL em memória). NÃO foi aplicada em produção — `prisma migrate deploy` de
-- produção continua sob controle do deploy normal. Como a tabela ainda não existe em nenhum banco
-- real, este arquivo foi ajustado na Fase 5C (índice em vez de unique em agendamento_id) em vez de
-- uma migration de alteração — não há histórico aplicado para preservar.

-- CreateTable
CREATE TABLE "retornos_agendados" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "atendimento_origem_id" TEXT NOT NULL,
    "servico_origem_id" TEXT NOT NULL,
    "agendamento_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retornos_agendados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "retornos_agendados_numero_sequencial_key" ON "retornos_agendados"("numero_sequencial");

-- CreateIndex
-- NÃO-único de propósito: no modo "agendamento combinado" (Fase 5C) duas linhas (um serviço de
-- origem cada) apontam para o mesmo agendamento.
CREATE INDEX "retornos_agendados_agendamento_id_idx" ON "retornos_agendados"("agendamento_id");

-- CreateIndex
CREATE INDEX "retornos_agendados_atendimento_origem_id_idx" ON "retornos_agendados"("atendimento_origem_id");

-- CreateIndex
CREATE UNIQUE INDEX "retornos_agendados_atendimento_origem_id_servico_origem_id_key" ON "retornos_agendados"("atendimento_origem_id", "servico_origem_id");

-- AddForeignKey
ALTER TABLE "retornos_agendados" ADD CONSTRAINT "retornos_agendados_atendimento_origem_id_fkey" FOREIGN KEY ("atendimento_origem_id") REFERENCES "atendimentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retornos_agendados" ADD CONSTRAINT "retornos_agendados_servico_origem_id_fkey" FOREIGN KEY ("servico_origem_id") REFERENCES "servicos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retornos_agendados" ADD CONSTRAINT "retornos_agendados_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
