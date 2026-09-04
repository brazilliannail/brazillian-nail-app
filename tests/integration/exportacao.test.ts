import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { validarBackupCompleto } from "@/lib/backup-validation";
import { obterBackupCompleto, obterCsv } from "@/lib/exportacao";
import { createClienteAction } from "@/lib/clientes-actions";

describe("exportação de dados", () => {
  it("gera backup completo sem credenciais nem tabelas internas de autenticação", async () => {
    const backup = await obterBackupCompleto();
    const chaves = Object.keys(backup.dados);

    expect(backup.formato).toBe("brazillian-nail-backup");
    expect(backup.versao).toBe(2);
    expect(chaves).toContain("configuracoes");
    expect(chaves).toContain("clientes");
    expect(chaves).toContain("despesas");
    expect(chaves).toContain("lancamentosDespesa");
    expect(chaves.some((chave) => /auth|senha|secret|token/i.test(chave))).toBe(false);
  });

  it("gera um backup que passa pela validação preventiva de restauração", async () => {
    const backup = await obterBackupCompleto();
    const copiaComoArquivo = JSON.parse(JSON.stringify(backup));
    expect(validarBackupCompleto(copiaComoArquivo)).toMatchObject({ valido: true });
  });

  it("gera todos os CSVs com cabeçalho mesmo quando não há dados operacionais", async () => {
    for (const dataset of ["clientes", "servicos", "agenda", "atendimentos", "financeiro", "despesas"] as const) {
      const csv = await obterCsv(dataset);
      expect(csv.split("\r\n")[0].length).toBeGreaterThan(10);
      expect(csv).not.toMatch(/password|secret|token/i);
    }
  });

  it("inclui o aniversário da cliente no CSV e no backup JSON completo", async () => {
    const criada = await createClienteAction({
      nome: `Cliente Aniversário ${Date.now()}`,
      nomePreferencia: null,
      contatoPrincipal: null,
      contatoSecundario: null,
      status: "ativa",
      ultimoAtendimento: "",
      proximoAgendamento: null,
      observacoesPt: "",
      observacoesEn: "",
      avisosImportantesPt: [],
      avisosImportantesEn: [],
      valorPendente: 0,
      historico: [],
      aniversarioDia: 7,
      aniversarioMes: 11,
      aniversarioAno: 1985,
    });

    const csv = await obterCsv("clientes");
    const [cabecalho] = csv.split("\r\n");
    expect(cabecalho).toContain("aniversarioDia");
    expect(cabecalho).toContain("aniversarioMes");
    expect(cabecalho).toContain("aniversarioAno");
    expect(csv).toContain('"7"');
    expect(csv).toContain('"11"');
    expect(csv).toContain('"1985"');

    const backup = await obterBackupCompleto();
    const linhaBackup = backup.dados.clientes.find((c) => c.id === criada.id);
    expect(linhaBackup?.aniversarioDia).toBe(7);
    expect(linhaBackup?.aniversarioMes).toBe(11);
    expect(linhaBackup?.aniversarioAno).toBe(1985);
  });
});
