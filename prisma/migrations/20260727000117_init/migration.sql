-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_sequencial" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_preferencia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa' CHECK ("status" IN ('ativa', 'inativa')),
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "avisos_importantes_pt" TEXT NOT NULL DEFAULT '[]',
    "avisos_importantes_en" TEXT NOT NULL DEFAULT '[]',
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "contatos" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateTable
CREATE TABLE "atendimentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cliente_id" TEXT NOT NULL,
    "agendamento_id" TEXT,
    "profissional" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "horario_inicio" TEXT NOT NULL,
    "horario_fim" TEXT,
    "duracao_min" INTEGER,
    "desconto" REAL NOT NULL DEFAULT 0,
    "gorjeta" REAL NOT NULL DEFAULT 0,
    "valor_recebido" REAL NOT NULL DEFAULT 0,
    "forma_pagamento" TEXT CHECK ("forma_pagamento" IS NULL OR "forma_pagamento" IN ('dinheiro', 'cartaoCredito', 'cartaoDebito', 'zelle', 'venmo', 'cashApp', 'cheque', 'outra')),
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

-- CreateTable
CREATE TABLE "atendimento_servicos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "atendimento_id" TEXT NOT NULL,
    "servico_id" TEXT,
    "nome_pt" TEXT NOT NULL,
    "nome_en" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    CONSTRAINT "atendimento_servicos_atendimento_id_fkey" FOREIGN KEY ("atendimento_id") REFERENCES "atendimentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "atendimento_servicos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lembretes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agendamento_id" TEXT NOT NULL,
    "status_lembrete" TEXT NOT NULL DEFAULT 'pendente' CHECK ("status_lembrete" IN ('pendente', 'preparado', 'enviado', 'tratadoPessoalmente', 'ignorado', 'indisponivel')),
    "consentimento_registrado" BOOLEAN NOT NULL DEFAULT false,
    "mensagem_personalizada" TEXT,
    "mensagem_personalizada_secundario" TEXT,
    "enviado_em" DATETIME,
    CONSTRAINT "lembretes_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "atendimento_id" TEXT NOT NULL,
    "data_pagamento" TEXT,
    "valor_servicos" REAL NOT NULL,
    "desconto" REAL NOT NULL DEFAULT 0,
    "gorjeta" REAL NOT NULL DEFAULT 0,
    "valor_recebido" REAL NOT NULL DEFAULT 0,
    "forma_pagamento" TEXT CHECK ("forma_pagamento" IS NULL OR "forma_pagamento" IN ('dinheiro', 'cartaoCredito', 'cartaoDebito', 'zelle', 'venmo', 'cashApp', 'cheque', 'outra')),
    "status" TEXT NOT NULL DEFAULT 'pendente' CHECK ("status" IN ('recebido', 'pendente', 'parcial', 'cortesia')),
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "pagamentos_atendimento_id_fkey" FOREIGN KEY ("atendimento_id") REFERENCES "atendimentos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
    "negocio_nome" TEXT NOT NULL DEFAULT 'Brazillian Nail',
    "negocio_nome_curto" TEXT NOT NULL DEFAULT 'Brazillian Nail',
    "negocio_telefone" TEXT NOT NULL,
    "negocio_email" TEXT NOT NULL,
    "negocio_endereco" TEXT NOT NULL,
    "negocio_cidade" TEXT NOT NULL,
    "negocio_estado" TEXT NOT NULL,
    "negocio_zip" TEXT NOT NULL,
    "fuso_horario" TEXT NOT NULL DEFAULT 'America/New_York',
    "moeda" TEXT NOT NULL DEFAULT 'USD ($)',
    "formato_data" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
    "formato_hora" TEXT NOT NULL DEFAULT '12h (AM/PM)',
    "idioma_padrao_mensagens" TEXT NOT NULL DEFAULT 'pt' CHECK ("idioma_padrao_mensagens" IN ('pt', 'en')),
    "permitir_alterar_idioma_por_cliente" BOOLEAN NOT NULL DEFAULT true,
    "agenda_horario_abertura" TEXT NOT NULL DEFAULT '9:00 AM',
    "agenda_horario_fechamento" TEXT NOT NULL DEFAULT '7:00 PM',
    "agenda_duracao_padrao_min" INTEGER NOT NULL DEFAULT 60,
    "agenda_dias_funcionamento" TEXT NOT NULL DEFAULT '["seg","ter","qua","qui","sex","sab"]',
    "agenda_bloqueio_conflito" BOOLEAN NOT NULL DEFAULT true,
    "agenda_permitir_encaixe" BOOLEAN NOT NULL DEFAULT true,
    "lembretes_ativar_dia_anterior" BOOLEAN NOT NULL DEFAULT true,
    "lembretes_horario_padrao_aviso" TEXT NOT NULL DEFAULT '6:00 PM',
    "lembretes_canal_preferido" TEXT NOT NULL DEFAULT 'whatsapp' CHECK ("lembretes_canal_preferido" IN ('whatsapp', 'sms')),
    "lembretes_exigir_confirmacao_manual" BOOLEAN NOT NULL DEFAULT true,
    "lembretes_texto_padrao_pt" TEXT NOT NULL,
    "lembretes_texto_padrao_en" TEXT NOT NULL,
    "financeiro_formas_pagamento_ativas" TEXT NOT NULL,
    "financeiro_mostrar_gorjeta_separada" BOOLEAN NOT NULL DEFAULT true,
    "financeiro_permitir_pagamento_parcial" BOOLEAN NOT NULL DEFAULT true,
    "financeiro_mostrar_valores_pendentes" BOOLEAN NOT NULL DEFAULT true,
    "seguranca_email_principal" TEXT NOT NULL,
    "seguranca_sessao_expiracao_min" INTEGER NOT NULL DEFAULT 30,
    "atualizado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "mensagens_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateIndex
CREATE UNIQUE INDEX "clientes_numero_sequencial_key" ON "clientes"("numero_sequencial");

-- CreateIndex
CREATE INDEX "clientes_status_idx" ON "clientes"("status");

-- CreateIndex
CREATE INDEX "clientes_nome_idx" ON "clientes"("nome");

-- CreateIndex
CREATE INDEX "contatos_cliente_id_idx" ON "contatos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "contatos_cliente_id_papel_key" ON "contatos"("cliente_id", "papel");

-- CreateIndex
CREATE INDEX "servicos_status_idx" ON "servicos"("status");

-- CreateIndex
CREATE INDEX "servicos_categoria_idx" ON "servicos"("categoria");

-- CreateIndex
CREATE INDEX "agendamentos_data_inicio_min_idx" ON "agendamentos"("data", "inicio_min");

-- CreateIndex
CREATE INDEX "agendamentos_cliente_id_idx" ON "agendamentos"("cliente_id");

-- CreateIndex
CREATE INDEX "agendamentos_status_idx" ON "agendamentos"("status");

-- CreateIndex
CREATE INDEX "atendimentos_cliente_id_data_idx" ON "atendimentos"("cliente_id", "data");

-- CreateIndex
CREATE INDEX "atendimentos_data_idx" ON "atendimentos"("data");

-- CreateIndex
CREATE INDEX "atendimentos_status_idx" ON "atendimentos"("status");

-- CreateIndex
CREATE INDEX "atendimento_servicos_atendimento_id_idx" ON "atendimento_servicos"("atendimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "lembretes_agendamento_id_key" ON "lembretes"("agendamento_id");

-- CreateIndex
CREATE INDEX "lembretes_status_lembrete_idx" ON "lembretes"("status_lembrete");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_atendimento_id_key" ON "pagamentos"("atendimento_id");

-- CreateIndex
CREATE INDEX "pagamentos_data_pagamento_idx" ON "pagamentos"("data_pagamento");

-- CreateIndex
CREATE INDEX "pagamentos_status_idx" ON "pagamentos"("status");

-- CreateIndex
CREATE INDEX "pagamentos_forma_pagamento_idx" ON "pagamentos"("forma_pagamento");

-- CreateIndex
CREATE INDEX "mensagens_log_cliente_id_idx" ON "mensagens_log"("cliente_id");

-- CreateIndex
CREATE INDEX "mensagens_log_status_mensagem_idx" ON "mensagens_log"("status_mensagem");

-- CreateIndex
CREATE INDEX "mensagens_log_preparado_em_idx" ON "mensagens_log"("preparado_em");
