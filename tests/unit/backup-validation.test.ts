import { describe, expect, it } from "vitest";
import { BACKUP_COLLECTIONS, BACKUP_COLLECTIONS_V1, validarBackupCompleto } from "@/lib/backup-validation";

function backupV1Valido() {
  return {
    formato: "brazillian-nail-backup",
    versao: 1,
    exportadoEm: "2026-08-04T12:00:00.000Z",
    dados: {
      clientes: [{ id: "cli-1" }],
      contatos: [{ id: "con-1", clienteId: "cli-1" }],
      servicos: [{ id: "ser-1" }],
      agendamentos: [{ id: "age-1", clienteId: "cli-1", servicoId: "ser-1" }],
      atendimentos: [{ id: "ate-1", clienteId: "cli-1", agendamentoId: "age-1" }],
      atendimentoServicos: [{ id: 1, atendimentoId: "ate-1", servicoId: "ser-1" }],
      pagamentos: [{ id: "pag-1", atendimentoId: "ate-1" }],
      lembretes: [{ id: "lem-1", agendamentoId: "age-1" }],
      mensagensLog: [{ id: "msg-1", clienteId: "cli-1" }],
      configuracoes: [{ id: 1 }],
    },
  };
}

function backupValido() {
  return {
    ...backupV1Valido(),
    versao: 2,
    dados: {
      ...backupV1Valido().dados,
      despesas: [{ id: "desp-1" }],
      lancamentosDespesa: [{ id: "ldesp-1", despesaId: "desp-1", ajustaLancamentoId: null }],
    },
  };
}

describe("validação preventiva de backup", () => {
  it("aceita um backup completo e informa as contagens", () => {
    const resultado = validarBackupCompleto(backupValido());
    expect(resultado).toEqual({
      valido: true,
      totais: Object.fromEntries(BACKUP_COLLECTIONS.map((nome) => [nome, 1])),
    });
  });

  it.each([null, [], "texto", 42])("recusa conteúdo que não seja objeto (%j)", (valor) => {
    expect(validarBackupCompleto(valor).valido).toBe(false);
  });

  it("recusa formato e versão incompatíveis", () => {
    const backup = backupValido();
    backup.formato = "outro-formato";
    backup.versao = 3;
    const resultado = validarBackupCompleto(backup);
    expect(resultado).toMatchObject({ valido: false });
    if (!resultado.valido) expect(resultado.erros).toHaveLength(2);
  });

  it("aceita um backup versao 1 (anterior ao módulo Despesas), sem exigir despesas/lancamentosDespesa", () => {
    const resultado = validarBackupCompleto(backupV1Valido());
    expect(resultado).toEqual({
      valido: true,
      totais: Object.fromEntries(BACKUP_COLLECTIONS_V1.map((nome) => [nome, 1])),
    });
  });

  it("recusa um backup versao 2 sem as coleções de despesas", () => {
    const backup = backupValido();
    Reflect.deleteProperty(backup.dados, "despesas");
    expect(validarBackupCompleto(backup)).toMatchObject({ valido: false });
  });

  it("recusa lançamento de despesa ligado a uma despesa inexistente", () => {
    const backup = backupValido();
    backup.dados.lancamentosDespesa[0].despesaId = "desp-inexistente";
    const resultado = validarBackupCompleto(backup);
    expect(resultado).toMatchObject({ valido: false });
    if (!resultado.valido) expect(resultado.erros.join(" ")).toContain("lancamentosDespesa.despesaId");
  });

  it("recusa uma data de exportação inválida", () => {
    const backup = backupValido();
    backup.exportadoEm = "ontem";
    expect(validarBackupCompleto(backup)).toMatchObject({ valido: false });
  });

  it("recusa coleção obrigatória ausente", () => {
    const backup = backupValido();
    Reflect.deleteProperty(backup.dados, "pagamentos");
    expect(validarBackupCompleto(backup)).toMatchObject({ valido: false });
  });

  it("recusa identificadores repetidos", () => {
    const backup = backupValido();
    backup.dados.clientes.push({ id: "cli-1" });
    const resultado = validarBackupCompleto(backup);
    expect(resultado).toMatchObject({ valido: false });
    if (!resultado.valido) expect(resultado.erros.join(" ")).toContain("repetidos");
  });

  it("recusa contato ligado a uma cliente inexistente", () => {
    const backup = backupValido();
    backup.dados.contatos[0].clienteId = "cli-inexistente";
    const resultado = validarBackupCompleto(backup);
    expect(resultado).toMatchObject({ valido: false });
    if (!resultado.valido) expect(resultado.erros.join(" ")).toContain("contatos.clienteId");
  });

  it("aceita coleções vazias quando a estrutura está íntegra", () => {
    const backup = backupValido();
    for (const colecao of BACKUP_COLLECTIONS) backup.dados[colecao] = [] as never;
    expect(validarBackupCompleto(backup)).toMatchObject({ valido: true });
  });
});
