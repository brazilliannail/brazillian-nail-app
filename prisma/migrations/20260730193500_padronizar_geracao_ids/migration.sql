-- Padroniza a geração de IDs sequenciais. Até aqui, "atendimentos", "pagamentos",
-- "agendamentos", "contatos" e "servicos" descobriam o próximo id fazendo uma varredura da
-- tabela inteira (SELECT de todos os ids + regex em memória) — o mesmo problema que "clientes"
-- já não tem, por ter a coluna `numero_sequencial` (indexada, consultada via `aggregate(_max)`).
-- Esta migration replica esse padrão nas 5 tabelas restantes: adiciona `numero_sequencial`,
-- preenchida a partir do sufixo numérico do id existente (ex.: "ATD-000042" -> 42), com índice
-- único. Nenhum id existente muda de valor, nenhuma linha é removida — só passa a existir uma
-- coluna auxiliar indexada para gerar o próximo id em O(log n) em vez de O(n).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- servicos (sem FK de saída; precisa vir antes de "agendamentos", que a referencia)
CREATE TABLE "new_servicos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_sequencial" INTEGER NOT NULL,
    "nome_pt" TEXT NOT NULL,
    "nome_en" TEXT,
    "categoria" TEXT NOT NULL,
    "descricao_pt" TEXT NOT NULL DEFAULT '',
    "descricao_en" TEXT NOT NULL DEFAULT '',
    "preco_padrao" REAL NOT NULL,
    "preco_variavel" BOOLEAN NOT NULL DEFAULT false,
    "preco_minimo" REAL,
    "preco_maximo" REAL,
    "duracao_padrao_min" INTEGER NOT NULL,
    "duracao_minima_min" INTEGER,
    "duracao_maxima_min" INTEGER,
    "retorno_sugerido_dias" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ativo' CHECK ("status" IN ('ativo', 'inativo')),
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_servicos" ("id", "numero_sequencial", "nome_pt", "nome_en", "categoria", "descricao_pt", "descricao_en", "preco_padrao", "preco_variavel", "preco_minimo", "preco_maximo", "duracao_padrao_min", "duracao_minima_min", "duracao_maxima_min", "retorno_sugerido_dias", "status", "observacoes_pt", "observacoes_en")
SELECT "id", CAST(SUBSTR("id", 5) AS INTEGER), "nome_pt", "nome_en", "categoria", "descricao_pt", "descricao_en", "preco_padrao", "preco_variavel", "preco_minimo", "preco_maximo", "duracao_padrao_min", "duracao_minima_min", "duracao_maxima_min", "retorno_sugerido_dias", "status", "observacoes_pt", "observacoes_en" FROM "servicos";
DROP TABLE "servicos";
ALTER TABLE "new_servicos" RENAME TO "servicos";
CREATE UNIQUE INDEX "servicos_numero_sequencial_key" ON "servicos"("numero_sequencial");
CREATE INDEX "servicos_status_idx" ON "servicos"("status");
CREATE INDEX "servicos_categoria_idx" ON "servicos"("categoria");

-- agendamentos (referencia clientes e servicos; referenciada por atendimentos)
CREATE TABLE "new_agendamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_sequencial" INTEGER NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "servico_id" TEXT,
    "data" TEXT NOT NULL,
    "inicio_min" INTEGER NOT NULL,
    "fim_min" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aguardando' CHECK ("status" IN ('aguardando', 'confirmado', 'emAtendimento', 'concluido', 'cancelado', 'naoCompareceu')),
    "valor_estimado" REAL,
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agendamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "agendamentos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_agendamentos" ("id", "numero_sequencial", "cliente_id", "servico_id", "data", "inicio_min", "fim_min", "status", "valor_estimado", "observacoes_pt", "observacoes_en", "criado_em")
SELECT "id", CAST(SUBSTR("id", 5) AS INTEGER), "cliente_id", "servico_id", "data", "inicio_min", "fim_min", "status", "valor_estimado", "observacoes_pt", "observacoes_en", "criado_em" FROM "agendamentos";
DROP TABLE "agendamentos";
ALTER TABLE "new_agendamentos" RENAME TO "agendamentos";
CREATE UNIQUE INDEX "agendamentos_numero_sequencial_key" ON "agendamentos"("numero_sequencial");
CREATE INDEX "agendamentos_data_inicio_min_idx" ON "agendamentos"("data", "inicio_min");
CREATE INDEX "agendamentos_cliente_id_idx" ON "agendamentos"("cliente_id");
CREATE INDEX "agendamentos_status_idx" ON "agendamentos"("status");

-- contatos (referencia clientes)
CREATE TABLE "new_contatos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_sequencial" INTEGER NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "papel" TEXT NOT NULL CHECK ("papel" IN ('principal', 'secundario')),
    "nome_contato" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "relacao" TEXT NOT NULL DEFAULT 'propria' CHECK ("relacao" IN ('propria', 'mae', 'pai', 'conjuge', 'responsavel', 'outro')),
    "idioma" TEXT NOT NULL DEFAULT 'pt' CHECK ("idioma" IN ('pt', 'en', 'bilingue')),
    "canal_preferido" TEXT NOT NULL DEFAULT 'whatsapp' CHECK ("canal_preferido" IN ('whatsapp', 'sms', 'ambos')),
    "receber_lembretes" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contatos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_contatos" ("id", "numero_sequencial", "cliente_id", "papel", "nome_contato", "telefone", "relacao", "idioma", "canal_preferido", "receber_lembretes", "criado_em")
SELECT "id", CAST(SUBSTR("id", 5) AS INTEGER), "cliente_id", "papel", "nome_contato", "telefone", "relacao", "idioma", "canal_preferido", "receber_lembretes", "criado_em" FROM "contatos";
DROP TABLE "contatos";
ALTER TABLE "new_contatos" RENAME TO "contatos";
CREATE UNIQUE INDEX "contatos_numero_sequencial_key" ON "contatos"("numero_sequencial");
CREATE INDEX "contatos_cliente_id_idx" ON "contatos"("cliente_id");
CREATE UNIQUE INDEX "contatos_cliente_id_papel_key" ON "contatos"("cliente_id", "papel");

-- atendimentos (referencia clientes e agendamentos; referenciada por pagamentos)
CREATE TABLE "new_atendimentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_sequencial" INTEGER NOT NULL,
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
INSERT INTO "new_atendimentos" ("id", "numero_sequencial", "cliente_id", "agendamento_id", "profissional", "data", "horario_inicio", "horario_fim", "duracao_min", "desconto", "status", "observacoes_pt", "observacoes_en", "retorno_sugerido_dias", "proximo_agendamento_id", "criado_em", "atualizado_em")
SELECT "id", CAST(SUBSTR("id", 5) AS INTEGER), "cliente_id", "agendamento_id", "profissional", "data", "horario_inicio", "horario_fim", "duracao_min", "desconto", "status", "observacoes_pt", "observacoes_en", "retorno_sugerido_dias", "proximo_agendamento_id", "criado_em", "atualizado_em" FROM "atendimentos";
DROP TABLE "atendimentos";
ALTER TABLE "new_atendimentos" RENAME TO "atendimentos";
CREATE UNIQUE INDEX "atendimentos_numero_sequencial_key" ON "atendimentos"("numero_sequencial");
CREATE INDEX "atendimentos_cliente_id_data_idx" ON "atendimentos"("cliente_id", "data");
CREATE INDEX "atendimentos_data_idx" ON "atendimentos"("data");
CREATE INDEX "atendimentos_status_idx" ON "atendimentos"("status");

-- pagamentos (referencia atendimentos e a si mesma via estorna_pagamento_id)
CREATE TABLE "new_pagamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_sequencial" INTEGER NOT NULL,
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
INSERT INTO "new_pagamentos" ("id", "numero_sequencial", "atendimento_id", "natureza", "tipo", "data_pagamento", "valor", "forma_pagamento", "observacoes_pt", "observacoes_en", "estorna_pagamento_id", "criado_em")
SELECT "id", CAST(SUBSTR("id", 5) AS INTEGER), "atendimento_id", "natureza", "tipo", "data_pagamento", "valor", "forma_pagamento", "observacoes_pt", "observacoes_en", "estorna_pagamento_id", "criado_em" FROM "pagamentos";
DROP TABLE "pagamentos";
ALTER TABLE "new_pagamentos" RENAME TO "pagamentos";
CREATE UNIQUE INDEX "pagamentos_numero_sequencial_key" ON "pagamentos"("numero_sequencial");
CREATE INDEX "pagamentos_atendimento_id_natureza_idx" ON "pagamentos"("atendimento_id", "natureza");
CREATE INDEX "pagamentos_data_pagamento_idx" ON "pagamentos"("data_pagamento");
CREATE INDEX "pagamentos_forma_pagamento_idx" ON "pagamentos"("forma_pagamento");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
