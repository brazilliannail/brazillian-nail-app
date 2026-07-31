-- A migration 20260728120000_pagamentos_ledger fez um backfill manual de 3 lançamentos reais de
-- produção (PAG-000001/PAG-000002, ligados a ATD-000002; PAG-000003, ligado a ATD-000003) que já
-- existiam quando ela rodou em produção. Em qualquer banco criado do zero (dev, teste, CI), essa
-- migration roda do mesmo jeito e insere esses 3 lançamentos antes de ATD-000002/ATD-000003
-- existirem — ficam órfãos, e colidem com os IDs que a aplicação atribui aos primeiros
-- atendimentos criados nesse banco (nextAtendimentoId usa MAX(numero_sequencial)+1 em
-- atendimentos), fazendo um atendimento novo parecer já ter pagamento registrado.
--
-- No-op em produção: lá ATD-000002/ATD-000003 existem de verdade, então o NOT EXISTS abaixo não
-- bate em nada e nenhuma linha é removida.
DELETE FROM "pagamentos"
WHERE "id" IN ('PAG-000001', 'PAG-000002', 'PAG-000003')
  AND NOT EXISTS (
    SELECT 1 FROM "atendimentos" WHERE "atendimentos"."id" = "pagamentos"."atendimento_id"
  );
