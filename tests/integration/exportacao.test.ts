import { describe, expect, it } from "vitest";
import { validarBackupCompleto } from "@/lib/backup-validation";
import { obterBackupCompleto, obterCsv } from "@/lib/exportacao";

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
});
