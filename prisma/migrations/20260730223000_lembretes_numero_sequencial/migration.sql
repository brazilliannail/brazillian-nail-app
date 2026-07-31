-- Estende a "lembretes" e "mensagens_log" o mesmo padrão de `numero_sequencial` já aplicado às
-- demais tabelas em 20260730193500_padronizar_geracao_ids (coluna indexada e única, consultada via
-- `aggregate(_max)` para gerar o próximo id em O(log n) em vez de varrer a tabela inteira). Ambas
-- as tabelas estão vazias em produção até esta migration — nenhum dado real é reescrito, só a
-- estrutura passa a existir antes da funcionalidade de Lembretes gravar de fato no banco.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- lembretes (referencia agendamentos; referenciada por mensagens_log)
CREATE TABLE "new_lembretes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_sequencial" INTEGER NOT NULL,
    "agendamento_id" TEXT NOT NULL,
    "status_lembrete" TEXT NOT NULL DEFAULT 'pendente' CHECK ("status_lembrete" IN ('pendente', 'preparado', 'enviado', 'tratadoPessoalmente', 'ignorado', 'indisponivel')),
    "consentimento_registrado" BOOLEAN NOT NULL DEFAULT false,
    "mensagem_personalizada" TEXT,
    "mensagem_personalizada_secundario" TEXT,
    "enviado_em" DATETIME,
    CONSTRAINT "lembretes_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_lembretes" ("id", "numero_sequencial", "agendamento_id", "status_lembrete", "consentimento_registrado", "mensagem_personalizada", "mensagem_personalizada_secundario", "enviado_em")
SELECT "id", CAST(SUBSTR("id", 5) AS INTEGER), "agendamento_id", "status_lembrete", "consentimento_registrado", "mensagem_personalizada", "mensagem_personalizada_secundario", "enviado_em" FROM "lembretes";
DROP TABLE "lembretes";
ALTER TABLE "new_lembretes" RENAME TO "lembretes";
CREATE UNIQUE INDEX "lembretes_numero_sequencial_key" ON "lembretes"("numero_sequencial");
CREATE UNIQUE INDEX "lembretes_agendamento_id_key" ON "lembretes"("agendamento_id");
CREATE INDEX "lembretes_status_lembrete_idx" ON "lembretes"("status_lembrete");

-- mensagens_log (referencia clientes, contatos e lembretes)
CREATE TABLE "new_mensagens_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_sequencial" INTEGER NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "contato_id" TEXT NOT NULL,
    "lembrete_id" TEXT,
    "canal" TEXT NOT NULL CHECK ("canal" IN ('whatsapp', 'sms')),
    "idioma" TEXT NOT NULL CHECK ("idioma" IN ('pt', 'en', 'bilingue')),
    "texto_preparado" TEXT NOT NULL,
    "status_mensagem" TEXT NOT NULL DEFAULT 'preparada' CHECK ("status_mensagem" IN ('preparada', 'enviada', 'cancelada')),
    "preparado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmado_em" DATETIME,
    CONSTRAINT "mensagens_log_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mensagens_log_contato_id_fkey" FOREIGN KEY ("contato_id") REFERENCES "contatos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "mensagens_log_lembrete_id_fkey" FOREIGN KEY ("lembrete_id") REFERENCES "lembretes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_mensagens_log" ("id", "numero_sequencial", "cliente_id", "contato_id", "lembrete_id", "canal", "idioma", "texto_preparado", "status_mensagem", "preparado_em", "confirmado_em")
SELECT "id", CAST(SUBSTR("id", 5) AS INTEGER), "cliente_id", "contato_id", "lembrete_id", "canal", "idioma", "texto_preparado", "status_mensagem", "preparado_em", "confirmado_em" FROM "mensagens_log";
DROP TABLE "mensagens_log";
ALTER TABLE "new_mensagens_log" RENAME TO "mensagens_log";
CREATE UNIQUE INDEX "mensagens_log_numero_sequencial_key" ON "mensagens_log"("numero_sequencial");
CREATE INDEX "mensagens_log_cliente_id_idx" ON "mensagens_log"("cliente_id");
CREATE INDEX "mensagens_log_status_mensagem_idx" ON "mensagens_log"("status_mensagem");
CREATE INDEX "mensagens_log_preparado_em_idx" ON "mensagens_log"("preparado_em");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
