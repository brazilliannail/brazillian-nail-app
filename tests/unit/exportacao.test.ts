import { describe, expect, it } from "vitest";
import { csvSeguro, isExportDataset, montarCsv } from "@/lib/exportacao";

describe("exportação CSV", () => {
  it("escapa aspas, vírgulas e quebras de linha", () => {
    expect(montarCsv(["nome", "nota"], [{ nome: 'Ana, "Ju"', nota: "linha 1\nlinha 2" }]))
      .toBe('"nome","nota"\r\n"Ana, ""Ju""","linha 1\nlinha 2"');
  });

  it("protege células contra fórmulas de planilha", () => {
    expect(csvSeguro("=IMPORTXML(\"url\")")).toBe('"\'=IMPORTXML(""url"")"');
    expect(csvSeguro("+123")).toBe('"\'+123"');
  });

  it("mantém números e valores vazios exportáveis", () => {
    expect(csvSeguro(42.5)).toBe('"42.5"');
    expect(csvSeguro(null)).toBe("");
  });

  it("aceita somente os conjuntos de dados públicos previstos", () => {
    expect(isExportDataset("clientes")).toBe(true);
    expect(isExportDataset("financeiro")).toBe(true);
    expect(isExportDataset("neon_auth")).toBe(false);
    expect(isExportDataset("configuracoes")).toBe(false);
    expect(isExportDataset(null)).toBe(false);
  });
});
