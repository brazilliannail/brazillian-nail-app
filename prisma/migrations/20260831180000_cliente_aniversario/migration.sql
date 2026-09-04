-- Aniversário da cliente (dia/mês/ano opcionais). Aditiva: só adiciona colunas nullable a uma
-- tabela existente, nenhum dado é alterado ou retroativamente preenchido.

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN "aniversario_dia" INTEGER;
ALTER TABLE "clientes" ADD COLUMN "aniversario_mes" INTEGER;
ALTER TABLE "clientes" ADD COLUMN "aniversario_ano" INTEGER;

-- CreateIndex
CREATE INDEX "clientes_aniversario_mes_aniversario_dia_idx" ON "clientes"("aniversario_mes", "aniversario_dia");

-- CheckConstraint
-- Dia e mês sempre juntos (não é possível informar um sem o outro); ano é sempre independente e
-- nunca usado para revelar/calcular idade (não há coluna derivada de idade em lugar nenhum).
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_aniversario_dia_mes_check" CHECK (
  ("aniversario_dia" IS NULL AND "aniversario_mes" IS NULL)
  OR ("aniversario_dia" IS NOT NULL AND "aniversario_mes" IS NOT NULL)
);
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_aniversario_mes_check" CHECK ("aniversario_mes" IS NULL OR ("aniversario_mes" >= 1 AND "aniversario_mes" <= 12));
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_aniversario_dia_check" CHECK ("aniversario_dia" IS NULL OR ("aniversario_dia" >= 1 AND "aniversario_dia" <= 31));
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_aniversario_ano_check" CHECK ("aniversario_ano" IS NULL OR ("aniversario_ano" >= 1900 AND "aniversario_ano" <= 2100));
