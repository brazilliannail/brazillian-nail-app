import { describe, it, expect, vi } from "vitest";

// Server Actions chamam `revalidatePath` (next/cache), que depende de um request scope do Next.js
// em execução — inexistente aqui, fora do servidor (mesmo mock usado nas demais suítes).
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import {
  createServicoAction,
  updateServicoAction,
  toggleStatusServicoAction,
} from "@/lib/servicos-actions";
import { getServicos } from "@/lib/servicos-repo";

let contador = 0;
function proximoSufixo() {
  contador += 1;
  return `${Date.now()}-${contador}`;
}

describe("serviços (servicos-actions + servicos-repo)", () => {
  it("cria serviço válido e ele aparece em getServicos()", async () => {
    const sufixo = proximoSufixo();

    const criado = await createServicoAction({
      nome: `Manicure Teste ${sufixo}`,
      nomeEn: `Test Manicure ${sufixo}`,
      categoria: "Manicure",
      descricaoPt: "",
      descricaoEn: "",
      precoPadrao: 45,
      precoVariavel: false,
      precoMinimo: null,
      precoMaximo: null,
      duracaoPadrao: 45,
      duracaoMinima: null,
      duracaoMaxima: null,
      retornoSugeridoDias: 14,
      status: "ativo",
      observacoesPt: "",
      observacoesEn: "",
    });

    expect(criado.status).toBe("ativo");
    expect(criado.precoPadrao).toBe(45);

    const servicos = await getServicos();
    expect(servicos.some((s) => s.id === criado.id)).toBe(true);
  });

  it("rejeita nome vazio", async () => {
    await expect(
      createServicoAction({
        nome: "   ",
        nomeEn: null,
        categoria: "Manicure",
        descricaoPt: "",
        descricaoEn: "",
        precoPadrao: 45,
        precoVariavel: false,
        precoMinimo: null,
        precoMaximo: null,
        duracaoPadrao: 45,
        duracaoMinima: null,
        duracaoMaxima: null,
        retornoSugeridoDias: null,
        status: "ativo",
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("Nome do serviço é obrigatório.");
  });

  it("rejeita categoria vazia", async () => {
    await expect(
      createServicoAction({
        nome: `Serviço Teste ${proximoSufixo()}`,
        nomeEn: null,
        categoria: "  ",
        descricaoPt: "",
        descricaoEn: "",
        precoPadrao: 45,
        precoVariavel: false,
        precoMinimo: null,
        precoMaximo: null,
        duracaoPadrao: 45,
        duracaoMinima: null,
        duracaoMaxima: null,
        retornoSugeridoDias: null,
        status: "ativo",
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("Categoria é obrigatória.");
  });

  it("rejeita preço padrão negativo", async () => {
    await expect(
      createServicoAction({
        nome: `Serviço Teste ${proximoSufixo()}`,
        nomeEn: null,
        categoria: "Manicure",
        descricaoPt: "",
        descricaoEn: "",
        precoPadrao: -10,
        precoVariavel: false,
        precoMinimo: null,
        precoMaximo: null,
        duracaoPadrao: 45,
        duracaoMinima: null,
        duracaoMaxima: null,
        retornoSugeridoDias: null,
        status: "ativo",
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("Preço padrão não pode ser negativo.");
  });

  it("preço variável exige faixa mínima/máxima, e mínimo não pode ser maior que máximo", async () => {
    await expect(
      createServicoAction({
        nome: `Serviço Teste ${proximoSufixo()}`,
        nomeEn: null,
        categoria: "Manicure",
        descricaoPt: "",
        descricaoEn: "",
        precoPadrao: 45,
        precoVariavel: true,
        precoMinimo: null,
        precoMaximo: null,
        duracaoPadrao: 45,
        duracaoMinima: null,
        duracaoMaxima: null,
        retornoSugeridoDias: null,
        status: "ativo",
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("Informe a faixa de preço mínima e máxima.");

    await expect(
      createServicoAction({
        nome: `Serviço Teste ${proximoSufixo()}`,
        nomeEn: null,
        categoria: "Manicure",
        descricaoPt: "",
        descricaoEn: "",
        precoPadrao: 45,
        precoVariavel: true,
        precoMinimo: 100,
        precoMaximo: 50,
        duracaoPadrao: 45,
        duracaoMinima: null,
        duracaoMaxima: null,
        retornoSugeridoDias: null,
        status: "ativo",
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("O preço mínimo não pode ser maior que o máximo.");
  });

  it("rejeita duração padrão zero/negativa e duração mínima maior que a máxima", async () => {
    await expect(
      createServicoAction({
        nome: `Serviço Teste ${proximoSufixo()}`,
        nomeEn: null,
        categoria: "Manicure",
        descricaoPt: "",
        descricaoEn: "",
        precoPadrao: 45,
        precoVariavel: false,
        precoMinimo: null,
        precoMaximo: null,
        duracaoPadrao: 0,
        duracaoMinima: null,
        duracaoMaxima: null,
        retornoSugeridoDias: null,
        status: "ativo",
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("Duração padrão deve ser maior que zero.");

    await expect(
      createServicoAction({
        nome: `Serviço Teste ${proximoSufixo()}`,
        nomeEn: null,
        categoria: "Manicure",
        descricaoPt: "",
        descricaoEn: "",
        precoPadrao: 45,
        precoVariavel: false,
        precoMinimo: null,
        precoMaximo: null,
        duracaoPadrao: 45,
        duracaoMinima: 60,
        duracaoMaxima: 30,
        retornoSugeridoDias: null,
        status: "ativo",
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("A duração mínima não pode ser maior que a máxima.");
  });

  it("atualiza um serviço existente (updateServicoAction)", async () => {
    const criado = await createServicoAction({
      nome: `Serviço Teste ${proximoSufixo()}`,
      nomeEn: null,
      categoria: "Manicure",
      descricaoPt: "",
      descricaoEn: "",
      precoPadrao: 45,
      precoVariavel: false,
      precoMinimo: null,
      precoMaximo: null,
      duracaoPadrao: 45,
      duracaoMinima: null,
      duracaoMaxima: null,
      retornoSugeridoDias: null,
      status: "ativo",
      observacoesPt: "",
      observacoesEn: "",
    });

    const atualizado = await updateServicoAction({
      ...criado,
      precoPadrao: 60,
      observacoesPt: "Passou a incluir hidratação.",
    });

    expect(atualizado.precoPadrao).toBe(60);
    expect(atualizado.observacoesPt).toBe("Passou a incluir hidratação.");
  });

  it("updateServicoAction rejeita serviço inexistente", async () => {
    await expect(
      updateServicoAction({
        id: "SRV-999999",
        nome: "Serviço Fantasma",
        nomeEn: null,
        categoria: "Manicure",
        descricaoPt: "",
        descricaoEn: "",
        precoPadrao: 45,
        precoVariavel: false,
        precoMinimo: null,
        precoMaximo: null,
        duracaoPadrao: 45,
        duracaoMinima: null,
        duracaoMaxima: null,
        retornoSugeridoDias: null,
        status: "ativo",
        observacoesPt: "",
        observacoesEn: "",
      }),
    ).rejects.toThrow("Serviço não encontrado.");
  });

  it("alterna status ativo/inativo (toggleStatusServicoAction)", async () => {
    const criado = await createServicoAction({
      nome: `Serviço Teste ${proximoSufixo()}`,
      nomeEn: null,
      categoria: "Manicure",
      descricaoPt: "",
      descricaoEn: "",
      precoPadrao: 45,
      precoVariavel: false,
      precoMinimo: null,
      precoMaximo: null,
      duracaoPadrao: 45,
      duracaoMinima: null,
      duracaoMaxima: null,
      retornoSugeridoDias: null,
      status: "ativo",
      observacoesPt: "",
      observacoesEn: "",
    });
    expect(criado.status).toBe("ativo");

    const inativado = await toggleStatusServicoAction(criado.id);
    expect(inativado.status).toBe("inativo");

    const reativado = await toggleStatusServicoAction(criado.id);
    expect(reativado.status).toBe("ativo");
  });
});
