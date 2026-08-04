import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import pg from "pg";

const { Client } = pg;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.resolve(
  process.env.SQLITE_SOURCE_PATH ?? path.join(projectRoot, "prisma", "brazillian-nail.db"),
);
const targetUrl =
  process.env.DATABASE_POSTGRES_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL;

if (!targetUrl?.startsWith("postgres")) {
  throw new Error(
    "Defina DATABASE_POSTGRES_URL, POSTGRES_URL ou DATABASE_URL com a conexão PostgreSQL do Neon.",
  );
}

const tableOrder = [
  "clientes",
  "servicos",
  "contatos",
  "agendamentos",
  "atendimentos",
  "atendimento_servicos",
  "lembretes",
  "pagamentos",
  "configuracoes",
  "mensagens_log",
];

const booleanColumns = new Set([
  "contatos.receber_lembretes",
  "servicos.preco_variavel",
  "lembretes.consentimento_registrado",
  "configuracoes.permitir_alterar_idioma_por_cliente",
  "configuracoes.agenda_bloqueio_conflito",
  "configuracoes.agenda_permitir_encaixe",
  "configuracoes.lembretes_ativar_dia_anterior",
  "configuracoes.lembretes_exigir_confirmacao_manual",
  "configuracoes.financeiro_mostrar_gorjeta_separada",
  "configuracoes.financeiro_permitir_pagamento_parcial",
  "configuracoes.financeiro_mostrar_valores_pendentes",
]);

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function columnsFor(source, table) {
  return source
    .prepare(`PRAGMA table_info(${quoteIdentifier(table)})`)
    .all()
    .map((column) => column.name);
}

function normalizeValue(table, column, value) {
  if (value !== null && booleanColumns.has(`${table}.${column}`)) {
    return Boolean(value);
  }
  return value;
}

const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
const target = new Client({ connectionString: targetUrl });

try {
  await target.connect();
  await target.query("BEGIN");

  for (const table of tableOrder) {
    const result = await target.query(
      `SELECT COUNT(*)::integer AS count FROM ${quoteIdentifier(table)}`,
    );
    if (result.rows[0].count !== 0) {
      throw new Error(
        `Migração cancelada: a tabela ${table} do Neon não está vazia. Nenhum dado foi alterado.`,
      );
    }
  }

  const deferredPaymentLinks = [];

  for (const table of tableOrder) {
    const columns = columnsFor(source, table);
    const rows = source.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all();

    for (const row of rows) {
      if (table === "pagamentos" && row.estorna_pagamento_id !== null) {
        deferredPaymentLinks.push({ id: row.id, estornaPagamentoId: row.estorna_pagamento_id });
        row.estorna_pagamento_id = null;
      }

      const values = columns.map((column) => normalizeValue(table, column, row[column]));
      const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
      const columnSql = columns.map(quoteIdentifier).join(", ");

      await target.query(
        `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${placeholders})`,
        values,
      );
    }

    console.log(`[migração] ${table}: ${rows.length} registro(s)`);
  }

  for (const link of deferredPaymentLinks) {
    await target.query(
      'UPDATE "pagamentos" SET "estorna_pagamento_id" = $1 WHERE "id" = $2',
      [link.estornaPagamentoId, link.id],
    );
  }

  await target.query(`
    SELECT setval(
      pg_get_serial_sequence('atendimento_servicos', 'id'),
      COALESCE((SELECT MAX(id) FROM atendimento_servicos), 1),
      EXISTS(SELECT 1 FROM atendimento_servicos)
    )
  `);

  await target.query("COMMIT");
  console.log("[migração] Dados copiados para o Neon com sucesso.");
} catch (error) {
  await target.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  source.close();
  await target.end().catch(() => {});
}
