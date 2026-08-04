-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_preferencia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "avisos_importantes_pt" TEXT NOT NULL DEFAULT '[]',
    "avisos_importantes_en" TEXT NOT NULL DEFAULT '[]',
    "reengajamento_status" TEXT NOT NULL DEFAULT 'nenhum',
    "reengajamento_atualizado_em" TIMESTAMP(3),
    "reengajamento_adiado_ate" TEXT,
    "reengajamento_observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "nome_contato" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "relacao" TEXT NOT NULL DEFAULT 'propria',
    "idioma" TEXT NOT NULL DEFAULT 'pt',
    "canal_preferido" TEXT NOT NULL DEFAULT 'whatsapp',
    "receber_lembretes" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "nome_pt" TEXT NOT NULL,
    "nome_en" TEXT,
    "categoria" TEXT NOT NULL,
    "descricao_pt" TEXT NOT NULL DEFAULT '',
    "descricao_en" TEXT NOT NULL DEFAULT '',
    "preco_padrao" DOUBLE PRECISION NOT NULL,
    "preco_variavel" BOOLEAN NOT NULL DEFAULT false,
    "preco_minimo" DOUBLE PRECISION,
    "preco_maximo" DOUBLE PRECISION,
    "duracao_padrao_min" INTEGER NOT NULL,
    "duracao_minima_min" INTEGER,
    "duracao_maxima_min" INTEGER,
    "retorno_sugerido_dias" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "servico_id" TEXT,
    "data" TEXT NOT NULL,
    "inicio_min" INTEGER NOT NULL,
    "fim_min" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aguardando',
    "valor_estimado" DOUBLE PRECISION,
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atendimentos" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "agendamento_id" TEXT,
    "profissional" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "horario_inicio" TEXT NOT NULL,
    "horario_fim" TEXT,
    "duracao_min" INTEGER,
    "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'emAndamento',
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "retorno_sugerido_dias" INTEGER,
    "proximo_agendamento_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atendimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atendimento_servicos" (
    "id" SERIAL NOT NULL,
    "atendimento_id" TEXT NOT NULL,
    "servico_id" TEXT,
    "nome_pt" TEXT NOT NULL,
    "nome_en" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "atendimento_servicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lembretes" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "agendamento_id" TEXT NOT NULL,
    "status_lembrete" TEXT NOT NULL DEFAULT 'pendente',
    "consentimento_registrado" BOOLEAN NOT NULL DEFAULT false,
    "mensagem_personalizada" TEXT,
    "mensagem_personalizada_secundario" TEXT,
    "enviado_em" TIMESTAMP(3),

    CONSTRAINT "lembretes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "atendimento_id" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data_pagamento" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "forma_pagamento" TEXT,
    "observacoes_pt" TEXT NOT NULL DEFAULT '',
    "observacoes_en" TEXT NOT NULL DEFAULT '',
    "estorna_pagamento_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" INTEGER NOT NULL DEFAULT 1,
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
    "idioma_padrao_mensagens" TEXT NOT NULL DEFAULT 'pt',
    "permitir_alterar_idioma_por_cliente" BOOLEAN NOT NULL DEFAULT true,
    "agenda_horario_abertura" TEXT NOT NULL DEFAULT '9:00 AM',
    "agenda_horario_fechamento" TEXT NOT NULL DEFAULT '7:00 PM',
    "agenda_duracao_padrao_min" INTEGER NOT NULL DEFAULT 60,
    "agenda_dias_funcionamento" TEXT NOT NULL DEFAULT '["seg","ter","qua","qui","sex","sab"]',
    "agenda_bloqueio_conflito" BOOLEAN NOT NULL DEFAULT true,
    "agenda_permitir_encaixe" BOOLEAN NOT NULL DEFAULT true,
    "lembretes_ativar_dia_anterior" BOOLEAN NOT NULL DEFAULT true,
    "lembretes_horario_padrao_aviso" TEXT NOT NULL DEFAULT '6:00 PM',
    "lembretes_canal_preferido" TEXT NOT NULL DEFAULT 'whatsapp',
    "lembretes_exigir_confirmacao_manual" BOOLEAN NOT NULL DEFAULT true,
    "lembretes_texto_padrao_pt" TEXT NOT NULL,
    "lembretes_texto_padrao_en" TEXT NOT NULL,
    "financeiro_formas_pagamento_ativas" TEXT NOT NULL,
    "financeiro_mostrar_gorjeta_separada" BOOLEAN NOT NULL DEFAULT true,
    "financeiro_permitir_pagamento_parcial" BOOLEAN NOT NULL DEFAULT true,
    "financeiro_mostrar_valores_pendentes" BOOLEAN NOT NULL DEFAULT true,
    "seguranca_email_principal" TEXT NOT NULL,
    "seguranca_sessao_expiracao_min" INTEGER NOT NULL DEFAULT 30,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_log" (
    "id" TEXT NOT NULL,
    "numero_sequencial" INTEGER NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "contato_id" TEXT NOT NULL,
    "lembrete_id" TEXT,
    "canal" TEXT NOT NULL,
    "idioma" TEXT NOT NULL,
    "texto_preparado" TEXT NOT NULL,
    "status_mensagem" TEXT NOT NULL DEFAULT 'preparada',
    "preparado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmado_em" TIMESTAMP(3),

    CONSTRAINT "mensagens_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_numero_sequencial_key" ON "clientes"("numero_sequencial");

-- CreateIndex
CREATE INDEX "clientes_status_idx" ON "clientes"("status");

-- CreateIndex
CREATE INDEX "clientes_nome_idx" ON "clientes"("nome");

-- CreateIndex
CREATE INDEX "clientes_reengajamento_status_idx" ON "clientes"("reengajamento_status");

-- CreateIndex
CREATE UNIQUE INDEX "contatos_numero_sequencial_key" ON "contatos"("numero_sequencial");

-- CreateIndex
CREATE INDEX "contatos_cliente_id_idx" ON "contatos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "contatos_cliente_id_papel_key" ON "contatos"("cliente_id", "papel");

-- CreateIndex
CREATE UNIQUE INDEX "servicos_numero_sequencial_key" ON "servicos"("numero_sequencial");

-- CreateIndex
CREATE INDEX "servicos_status_idx" ON "servicos"("status");

-- CreateIndex
CREATE INDEX "servicos_categoria_idx" ON "servicos"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "agendamentos_numero_sequencial_key" ON "agendamentos"("numero_sequencial");

-- CreateIndex
CREATE INDEX "agendamentos_data_inicio_min_idx" ON "agendamentos"("data", "inicio_min");

-- CreateIndex
CREATE INDEX "agendamentos_cliente_id_idx" ON "agendamentos"("cliente_id");

-- CreateIndex
CREATE INDEX "agendamentos_status_idx" ON "agendamentos"("status");

-- CreateIndex
CREATE UNIQUE INDEX "atendimentos_numero_sequencial_key" ON "atendimentos"("numero_sequencial");

-- CreateIndex
CREATE INDEX "atendimentos_cliente_id_data_idx" ON "atendimentos"("cliente_id", "data");

-- CreateIndex
CREATE INDEX "atendimentos_data_idx" ON "atendimentos"("data");

-- CreateIndex
CREATE INDEX "atendimentos_status_idx" ON "atendimentos"("status");

-- CreateIndex
CREATE INDEX "atendimento_servicos_atendimento_id_idx" ON "atendimento_servicos"("atendimento_id");

-- CreateIndex
CREATE UNIQUE INDEX "lembretes_numero_sequencial_key" ON "lembretes"("numero_sequencial");

-- CreateIndex
CREATE UNIQUE INDEX "lembretes_agendamento_id_key" ON "lembretes"("agendamento_id");

-- CreateIndex
CREATE INDEX "lembretes_status_lembrete_idx" ON "lembretes"("status_lembrete");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_numero_sequencial_key" ON "pagamentos"("numero_sequencial");

-- CreateIndex
CREATE INDEX "pagamentos_atendimento_id_natureza_idx" ON "pagamentos"("atendimento_id", "natureza");

-- CreateIndex
CREATE INDEX "pagamentos_data_pagamento_idx" ON "pagamentos"("data_pagamento");

-- CreateIndex
CREATE INDEX "pagamentos_forma_pagamento_idx" ON "pagamentos"("forma_pagamento");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_log_numero_sequencial_key" ON "mensagens_log"("numero_sequencial");

-- CreateIndex
CREATE INDEX "mensagens_log_cliente_id_idx" ON "mensagens_log"("cliente_id");

-- CreateIndex
CREATE INDEX "mensagens_log_status_mensagem_idx" ON "mensagens_log"("status_mensagem");

-- CreateIndex
CREATE INDEX "mensagens_log_preparado_em_idx" ON "mensagens_log"("preparado_em");

-- AddForeignKey
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_proximo_agendamento_id_fkey" FOREIGN KEY ("proximo_agendamento_id") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendimento_servicos" ADD CONSTRAINT "atendimento_servicos_atendimento_id_fkey" FOREIGN KEY ("atendimento_id") REFERENCES "atendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atendimento_servicos" ADD CONSTRAINT "atendimento_servicos_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_atendimento_id_fkey" FOREIGN KEY ("atendimento_id") REFERENCES "atendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_estorna_pagamento_id_fkey" FOREIGN KEY ("estorna_pagamento_id") REFERENCES "pagamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_log" ADD CONSTRAINT "mensagens_log_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_log" ADD CONSTRAINT "mensagens_log_contato_id_fkey" FOREIGN KEY ("contato_id") REFERENCES "contatos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_log" ADD CONSTRAINT "mensagens_log_lembrete_id_fkey" FOREIGN KEY ("lembrete_id") REFERENCES "lembretes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve the domain constraints enforced by the former SQLite migrations.
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_status_check" CHECK ("status" IN ('ativa', 'inativa'));
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_reengajamento_status_check" CHECK ("reengajamento_status" IN ('nenhum', 'contatado', 'adiado', 'ignorado'));

ALTER TABLE "contatos" ADD CONSTRAINT "contatos_papel_check" CHECK ("papel" IN ('principal', 'secundario'));
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_relacao_check" CHECK ("relacao" IN ('propria', 'mae', 'pai', 'conjuge', 'responsavel', 'outro'));
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_idioma_check" CHECK ("idioma" IN ('pt', 'en', 'bilingue'));
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_canal_preferido_check" CHECK ("canal_preferido" IN ('whatsapp', 'sms', 'ambos'));

ALTER TABLE "servicos" ADD CONSTRAINT "servicos_status_check" CHECK ("status" IN ('ativo', 'inativo'));
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_preco_padrao_check" CHECK ("preco_padrao" >= 0);
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_preco_minimo_check" CHECK ("preco_minimo" IS NULL OR "preco_minimo" >= 0);
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_preco_maximo_check" CHECK ("preco_maximo" IS NULL OR "preco_maximo" >= 0);
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_duracao_padrao_check" CHECK ("duracao_padrao_min" > 0);
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_duracao_minima_check" CHECK ("duracao_minima_min" IS NULL OR "duracao_minima_min" > 0);
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_duracao_maxima_check" CHECK ("duracao_maxima_min" IS NULL OR "duracao_maxima_min" > 0);

ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_status_check" CHECK ("status" IN ('aguardando', 'confirmado', 'emAtendimento', 'concluido', 'cancelado', 'naoCompareceu'));
ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_status_check" CHECK ("status" IN ('emAndamento', 'finalizadoPago', 'finalizadoPendente', 'finalizadoParcial', 'finalizadoCortesia', 'cancelado', 'estornado'));

ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_status_check" CHECK ("status_lembrete" IN ('pendente', 'preparado', 'enviado', 'tratadoPessoalmente', 'ignorado', 'indisponivel'));

ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_natureza_check" CHECK ("natureza" IN ('servico', 'gorjeta'));
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_tipo_check" CHECK ("tipo" IN ('entrada', 'estorno'));
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_valor_check" CHECK ("valor" > 0);
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_forma_check" CHECK ("forma_pagamento" IS NULL OR "forma_pagamento" IN ('dinheiro', 'cartaoCredito', 'cartaoDebito', 'zelle', 'venmo', 'cashApp', 'cheque', 'outra'));

ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_singleton_check" CHECK ("id" = 1);
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_idioma_check" CHECK ("idioma_padrao_mensagens" IN ('pt', 'en'));
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_canal_check" CHECK ("lembretes_canal_preferido" IN ('whatsapp', 'sms'));

ALTER TABLE "mensagens_log" ADD CONSTRAINT "mensagens_log_canal_check" CHECK ("canal" IN ('whatsapp', 'sms'));
ALTER TABLE "mensagens_log" ADD CONSTRAINT "mensagens_log_idioma_check" CHECK ("idioma" IN ('pt', 'en', 'bilingue'));
ALTER TABLE "mensagens_log" ADD CONSTRAINT "mensagens_log_status_check" CHECK ("status_mensagem" IN ('preparada', 'enviada', 'cancelada'));
